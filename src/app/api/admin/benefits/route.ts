// CR-004: Admin — opprett fordel.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/client'
import { verifyAdminJWT, ADMIN_TOKEN_COOKIE } from '@/lib/admin/auth'
import { getBenefitConfigProblems } from '@/lib/benefits/displayStatus'
import { targetingSchema, toTargetingData } from '@/lib/admin/targetingSchema'

async function authCheck(request: NextRequest) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value
  if (!token) return null
  return verifyAdminJWT(token)
}

const benefitSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  shortDescription: z.string().min(1),
  longDescription: z.string().min(1),
  advertiserId: z.string().uuid(),
  categoryId: z.string().uuid(),
  redemptionType: z.enum(['generic_code', 'unique_code', 'qr_code', 'external_link', 'lead_form', 'info_only', 'mixed']),
  status: z.enum(['draft', 'active', 'scheduled', 'paused', 'expired', 'archived', 'deleted']).default('draft'),
  priority: z.number().int().default(0),
  isFeatured: z.boolean().default(false),
  isTimeLimited: z.boolean().default(false),
  badgeText: z.string().nullable().optional(),
  termsText: z.string().nullable().optional(),
  usageInstruction: z.string().nullable().optional(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  // CR-012: Bilde (opplastet til S3-kompatibel storage, eller ekstern URL)
  imageUrl: z.string().nullable().optional(),
  imageAlt: z.string().nullable().optional(),
  redemption: z.object({
    genericCode: z.string().nullable().optional(),
    externalUrl: z.string().nullable().optional(),
    qrValue: z.string().nullable().optional(),
    ctaLabel: z.string().nullable().optional(),
    opensInNewTab: z.boolean().default(true),
  }).optional(),
  targeting: targetingSchema.optional(),
  // CR-010: Økonomifelter
  campaignFee: z.number().nonnegative().nullable().optional(),
  pricePerView: z.number().nonnegative().nullable().optional(),
  pricePerLead: z.number().nonnegative().nullable().optional(),
  pricePerRedemption: z.number().nonnegative().nullable().optional(),
})

export async function POST(request: NextRequest) {
  if (!await authCheck(request)) return NextResponse.json({ message: 'Ikke autentisert' }, { status: 401 })

  const body: unknown = await request.json().catch(() => null)
  const parsed = benefitSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ message: parsed.error.errors[0]?.message }, { status: 400 })

  // CR-017: En fordel skal aldri kunne opprettes som Aktiv/Planlagt med
  // manglende påkrevd redemption-innhold — den ville vist seg ødelagt for
  // ekte brukere (benefitQueries.ts viser alle status=active uansett).
  if (parsed.data.status === 'active' || parsed.data.status === 'scheduled') {
    const problems = getBenefitConfigProblems({
      status: parsed.data.status,
      redemptionType: parsed.data.redemptionType,
      startsAt: parsed.data.startsAt ?? null,
      endsAt: parsed.data.endsAt ?? null,
      redemption: parsed.data.redemption
        ? {
            genericCode: parsed.data.redemption.genericCode ?? null,
            externalUrl: parsed.data.redemption.externalUrl ?? null,
            qrValue: parsed.data.redemption.qrValue ?? null,
            // Kodepool/leadskjema kan aldri kobles til ved opprettelse via denne ruten.
            codePoolId: null,
            leadFormId: null,
            codePool: null,
          }
        : null,
    })
    if (problems.length > 0) {
      const statusLabel = parsed.data.status === 'active' ? 'Aktiv' : 'Planlagt'
      return NextResponse.json(
        { message: `Kan ikke opprette som ${statusLabel}: ${problems.join('; ')}` },
        { status: 400 },
      )
    }
  }

  try {
    const { redemption, targeting, startsAt, endsAt, ...benefitData } = parsed.data

    const benefit = await prisma.benefit.create({
      data: {
        ...benefitData,
        visibility: 'public',
        autoExpire: true,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
        ...(redemption ? {
          redemption: {
            create: {
              type: benefitData.redemptionType,
              genericCode: redemption.genericCode,
              externalUrl: redemption.externalUrl,
              qrValue: redemption.qrValue,
              ctaLabel: redemption.ctaLabel,
              opensInNewTab: redemption.opensInNewTab,
            },
          },
        } : {}),
        ...(targeting ? {
          targeting: {
            create: {
              ...toTargetingData(targeting),
            },
          },
        } : {}),
      },
    })

    return NextResponse.json({ id: benefit.id }, { status: 201 })
  } catch (err) {
    console.error('[admin/benefits POST] Uventet feil:', err)
    return NextResponse.json({ message: 'Noe gikk galt' }, { status: 500 })
  }
}
