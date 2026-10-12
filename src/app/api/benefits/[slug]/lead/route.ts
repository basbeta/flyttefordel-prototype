// CR-002: Lead form submission endpoint.
// Stores form data as JSON — personal data, never logged in plaintext (NFR-003).

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { z } from 'zod'
import { trackEvent } from '@/lib/tracking/trackEvent'
import { getSessionIdFromRequest } from '@/lib/session'

const LeadBodySchema = z
  .object({
    consent: z.literal('on', { errorMap: () => ({ message: 'Samtykke er påkrevd' }) }),
  })
  .passthrough()

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const body = await request.json()
    const parsed = LeadBodySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'Samtykke er påkrevd', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const benefit = await prisma.benefit.findFirst({
      where: { slug: decodeURIComponent(slug), status: 'active', deletedAt: null },
      select: { id: true, advertiserId: true, consentText: true },
    })

    if (!benefit) {
      return NextResponse.json(
        { error: 'BENEFIT_NOT_FOUND', message: 'Fordel ikke funnet' },
        { status: 404 }
      )
    }

    const { consent: _consent, ...formFields } = parsed.data
    const consentText = benefit.consentText ?? 'Brukeren samtykket til behandling av opplysninger.'

    await prisma.lead.create({
      data: {
        benefitId: benefit.id,
        advertiserId: benefit.advertiserId,
        formData: formFields as object,
        consentText,
        consentAcceptedAt: new Date(),
        status: 'new',
      },
    })

    const sessionId = await getSessionIdFromRequest(request)
    await trackEvent('lead_submitted', benefit.id, undefined, { sessionId })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Intern feil ved innsending' },
      { status: 500 }
    )
  }
}
