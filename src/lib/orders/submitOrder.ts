// CR-024: Submit an order from the web flow.
// - Idempotent on submissionId: the same id again returns the same order (no duplicate),
//   also when the flow has changed since the first submit.
// - Lines are validated server side against the session's flow.
// - Order, order lines and one Lead per ordered benefit are written in ONE transaction.
// - Integrations are simulated (nothing is called), the response is immediate.
// Personal data: nothing in here may be logged.

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/client'
import { getWebFlow } from '@/lib/queries/flowQueries'
import type { TargetingSession } from '@/lib/targeting'
import { buildLeadFormData, LEAD_CONSENT_TEXT } from './buildLeadData'
import { buildConsentSnapshot } from './consentTexts'
import type { OrderInput } from './orderSchema'
import { validateOrderLines, type InvalidLine, type ResolvedLine } from './validateLines'

export class InvalidOrderLinesError extends Error {
  constructor(public readonly invalid: InvalidLine[]) {
    super('Ugyldige ordrelinjer')
    this.name = 'InvalidOrderLinesError'
  }
}

export type SubmitOrderContext = {
  sessionId: string | null
  // CR-028: the logged-in person (null for anonymous/older callers).
  personId?: string | null
  targeting: TargetingSession | null
}

export type SubmitOrderResult = {
  orderId: string
  created: boolean
  lines: ResolvedLine[]
}

async function findExisting(submissionId: string) {
  return prisma.order.findUnique({
    where: { submissionId },
    select: { id: true },
  })
}

export async function submitOrder(
  input: OrderInput,
  ctx: SubmitOrderContext
): Promise<SubmitOrderResult> {
  const existing = await findExisting(input.submissionId)
  if (existing) return { orderId: existing.id, created: false, lines: [] }

  const pages = await getWebFlow(ctx.targeting, new Date(), ctx.personId ?? null)
  const validation = validateOrderLines(input.lines, pages)
  if (!validation.ok) throw new InvalidOrderLinesError(validation.invalid)
  const lines = validation.lines

  try {
    const orderId = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          submissionId: input.submissionId,
          sessionId: ctx.sessionId,
          personId: ctx.personId ?? null,
          name: input.name,
          email: input.email,
          phone: input.phone ?? null,
          postcode: input.postcode ?? null,
          consentShare: input.consentShare,
          consentEmail: input.consentEmail,
          consentMail: input.consentMail,
          consentSms: input.consentSms,
          consentTexts: buildConsentSnapshot(),
        },
        select: { id: true },
      })

      await tx.orderLine.createMany({
        data: lines.map((l) => ({
          orderId: order.id,
          productId: l.productId,
          benefitId: l.benefitId,
          pageId: l.pageId,
          productName: l.productName,
          benefitTitle: l.benefitTitle,
        })),
      })

      // One Lead per ordered benefit, so orders show up in the existing lead admin and export.
      const benefits = await tx.benefit.findMany({
        where: { id: { in: lines.map((l) => l.benefitId) } },
        select: { id: true, advertiserId: true },
      })
      const advertiserByBenefit = new Map(benefits.map((b) => [b.id, b.advertiserId]))
      const now = new Date()
      for (const line of lines) {
        const advertiserId = advertiserByBenefit.get(line.benefitId)
        if (!advertiserId) throw new Error('Fordel mangler ved opprettelse av lead')
        await tx.lead.create({
          data: {
            benefitId: line.benefitId,
            advertiserId,
            sessionId: ctx.sessionId,
            formData: buildLeadFormData(input, line, order.id),
            consentText: LEAD_CONSENT_TEXT,
            consentAcceptedAt: now,
            status: 'new',
          },
        })
      }

      return order.id
    })
    return { orderId, created: true, lines }
  } catch (err) {
    // Two requests with the same submissionId raced: the unique index rejected one.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const raced = await findExisting(input.submissionId)
      if (raced) return { orderId: raced.id, created: false, lines: [] }
    }
    throw err
  }
}
