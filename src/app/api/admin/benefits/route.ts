// CR-004: Admin — opprett fordel.

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
  redemption: z.object({
    genericCode: z.string().nullable().optional(),
    externalUrl: z.string().nullable().optional(),
    qrValue: z.string().nullable().optional(),
    ctaLabel: z.string().nullable().optional(),
    opensInNewTab: z.boolean().default(true),
  }).optional(),
  targeting: targetingSchema.optional(),
})

export async function POST(request: NextRequest) {
  if (!await authCheck(request)) return NextResponse.json({ message: 'Ikke autentisert' }, { status: 401 })

  const body: unknown = await request.json().catch(() => null)
  const parsed = benefitSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ message: parsed.error.errors[0]?.message }, { status: 400 })

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
            appliesNationally: targeting.appliesNationally,
            includeUnknownLocation: targeting.includeUnknownLocation,
            postcodes: targeting.postcodes,
            postcodeRanges: targeting.postcodeRanges,
            movingStatuses: targeting.movingStatuses,
          },
        },
      } : {}),
    },
  })

  return NextResponse.json({ id: benefit.id }, { status: 201 })
}
