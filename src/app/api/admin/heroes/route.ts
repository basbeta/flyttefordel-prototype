// CR-004: Admin — opprett hero.

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

const heroSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  imageAlt: z.string().nullable().optional(),
  ctaLabel: z.string().nullable().optional(),
  ctaType: z.enum(['benefit', 'category', 'external_url', 'internal_page', 'none']),
  ctaTarget: z.string().nullable().optional(),
  status: z.enum(['draft', 'scheduled', 'active', 'paused', 'expired', 'archived']).default('draft'),
  priority: z.number().int().default(0),
  isFallback: z.boolean().default(false),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
})

export async function POST(request: NextRequest) {
  if (!await authCheck(request)) return NextResponse.json({ message: 'Ikke autentisert' }, { status: 401 })

  const body: unknown = await request.json().catch(() => null)
  const parsed = heroSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ message: parsed.error.errors[0]?.message }, { status: 400 })

  const { startsAt, endsAt, ...heroData } = parsed.data
  const hero = await prisma.hero.create({
    data: {
      ...heroData,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
    },
  })
  return NextResponse.json({ id: hero.id }, { status: 201 })
}
