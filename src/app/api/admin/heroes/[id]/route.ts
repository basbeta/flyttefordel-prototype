// CR-004: Admin — oppdater/slett hero.

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

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  imageAlt: z.string().nullable().optional(),
  ctaLabel: z.string().nullable().optional(),
  ctaType: z.enum(['benefit', 'category', 'external_url', 'internal_page', 'none']).optional(),
  ctaTarget: z.string().nullable().optional(),
  status: z.enum(['draft', 'scheduled', 'active', 'paused', 'expired', 'archived']).optional(),
  priority: z.number().int().optional(),
  isFallback: z.boolean().optional(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
})

type Params = { params: { id: string } }

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!await authCheck(request)) return NextResponse.json({ message: 'Ikke autentisert' }, { status: 401 })

  const body: unknown = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ message: parsed.error.errors[0]?.message }, { status: 400 })

  const existing = await prisma.hero.findFirst({ where: { id: params.id, deletedAt: null } })
  if (!existing) return NextResponse.json({ message: 'Ikke funnet' }, { status: 404 })

  const { startsAt, endsAt, ...heroData } = parsed.data
  await prisma.hero.update({
    where: { id: params.id },
    data: {
      ...heroData,
      ...(startsAt !== undefined ? { startsAt: startsAt ? new Date(startsAt) : null } : {}),
      ...(endsAt !== undefined ? { endsAt: endsAt ? new Date(endsAt) : null } : {}),
    },
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest, { params }: Params) {
  if (!await authCheck(request)) return NextResponse.json({ message: 'Ikke autentisert' }, { status: 401 })

  const existing = await prisma.hero.findFirst({ where: { id: params.id, deletedAt: null } })
  if (!existing) return NextResponse.json({ message: 'Ikke funnet' }, { status: 404 })

  await prisma.hero.update({
    where: { id: params.id },
    data: { deletedAt: new Date(), status: 'archived' },
  })
  return NextResponse.json({ ok: true })
}
