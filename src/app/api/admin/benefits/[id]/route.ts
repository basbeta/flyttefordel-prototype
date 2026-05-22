// CR-004: Admin — update/delete fordel.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/client'
import { verifyAdminJWT, ADMIN_TOKEN_COOKIE } from '@/lib/admin/auth'

async function authCheck(request: NextRequest) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value
  if (!token) return null
  return verifyAdminJWT(token)
}

const targetingSchema = z.object({
  appliesNationally: z.boolean().default(false),
  includeUnknownLocation: z.boolean().default(true),
  postcodes: z.array(z.string()).default([]),
  postcodeRanges: z.array(z.object({ from: z.string(), to: z.string() })).default([]),
  movingStatuses: z.array(z.string()).default([]),
})

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  shortDescription: z.string().min(1).optional(),
  longDescription: z.string().min(1).optional(),
  advertiserId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  redemptionType: z.enum(['generic_code', 'unique_code', 'qr_code', 'external_link', 'lead_form', 'info_only', 'mixed']).optional(),
  status: z.enum(['draft', 'active', 'scheduled', 'paused', 'expired', 'archived', 'deleted']).optional(),
  priority: z.number().int().optional(),
  isFeatured: z.boolean().optional(),
  isTimeLimited: z.boolean().optional(),
  badgeText: z.string().nullable().optional(),
  termsText: z.string().nullable().optional(),
  usageInstruction: z.string().nullable().optional(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  redemption: z.object({
    genericCode: z.string().nullable().optional(),
    externalUrl: z.string().nullable().optional(),
    qrValue: z.string().nullable().optional(),
    ctaLabel: z.string().nullable().optional(),
    opensInNewTab: z.boolean().optional(),
  }).optional(),
  targeting: targetingSchema.optional(),
  // CR-010: Økonomifelter
  campaignFee: z.number().nonnegative().nullable().optional(),
  pricePerView: z.number().nonnegative().nullable().optional(),
  pricePerLead: z.number().nonnegative().nullable().optional(),
  pricePerRedemption: z.number().nonnegative().nullable().optional(),
})

type Params = { params: { id: string } }

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!await authCheck(request)) return NextResponse.json({ message: 'Ikke autentisert' }, { status: 401 })

  const body: unknown = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ message: parsed.error.errors[0]?.message }, { status: 400 })

  const existing = await prisma.benefit.findFirst({ where: { id: params.id, deletedAt: null } })
  if (!existing) return NextResponse.json({ message: 'Ikke funnet' }, { status: 404 })

  const { redemption, targeting, startsAt, endsAt, ...benefitData } = parsed.data

  await prisma.benefit.update({
    where: { id: params.id },
    data: {
      ...benefitData,
      ...(startsAt !== undefined ? { startsAt: startsAt ? new Date(startsAt) : null } : {}),
      ...(endsAt !== undefined ? { endsAt: endsAt ? new Date(endsAt) : null } : {}),
      ...(redemption ? {
        redemption: {
          upsert: {
            create: {
              type: benefitData.redemptionType ?? existing.redemptionType,
              genericCode: redemption.genericCode,
              externalUrl: redemption.externalUrl,
              qrValue: redemption.qrValue,
              ctaLabel: redemption.ctaLabel,
              opensInNewTab: redemption.opensInNewTab ?? true,
            },
            update: {
              ...(benefitData.redemptionType ? { type: benefitData.redemptionType } : {}),
              genericCode: redemption.genericCode,
              externalUrl: redemption.externalUrl,
              qrValue: redemption.qrValue,
              ctaLabel: redemption.ctaLabel,
              ...(redemption.opensInNewTab !== undefined ? { opensInNewTab: redemption.opensInNewTab } : {}),
            },
          },
        },
      } : {}),
      ...(targeting ? {
        targeting: {
          upsert: {
            create: {
              appliesNationally: targeting.appliesNationally,
              includeUnknownLocation: targeting.includeUnknownLocation,
              postcodes: targeting.postcodes,
              postcodeRanges: targeting.postcodeRanges,
              movingStatuses: targeting.movingStatuses,
            },
            update: {
              appliesNationally: targeting.appliesNationally,
              includeUnknownLocation: targeting.includeUnknownLocation,
              postcodes: targeting.postcodes,
              postcodeRanges: targeting.postcodeRanges,
              movingStatuses: targeting.movingStatuses,
            },
          },
        },
      } : {}),
    },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest, { params }: Params) {
  if (!await authCheck(request)) return NextResponse.json({ message: 'Ikke autentisert' }, { status: 401 })

  const existing = await prisma.benefit.findFirst({ where: { id: params.id, deletedAt: null } })
  if (!existing) return NextResponse.json({ message: 'Ikke funnet' }, { status: 404 })

  await prisma.benefit.update({
    where: { id: params.id },
    data: { deletedAt: new Date(), status: 'deleted' },
  })

  return NextResponse.json({ ok: true })
}
