// CR-004: Admin — oppdater/slett annonsør.

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
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  orgNumber: z.string().nullable().optional(),
  websiteUrl: z.string().url().nullable().optional(),
  contactName: z.string().nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  internalNotes: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
})

type Params = { params: { id: string } }

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!await authCheck(request)) return NextResponse.json({ message: 'Ikke autentisert' }, { status: 401 })

  const body: unknown = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ message: parsed.error.errors[0]?.message }, { status: 400 })

  try {
    const existing = await prisma.advertiser.findFirst({ where: { id: params.id, deletedAt: null } })
    if (!existing) return NextResponse.json({ message: 'Ikke funnet' }, { status: 404 })

    if (parsed.data.slug && parsed.data.slug !== existing.slug) {
      const slugConflict = await prisma.advertiser.findFirst({ where: { slug: parsed.data.slug } })
      if (slugConflict) return NextResponse.json({ message: 'Slug er allerede i bruk' }, { status: 409 })
    }

    await prisma.advertiser.update({ where: { id: params.id }, data: parsed.data })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/advertisers/[id] PATCH] Uventet feil:', err)
    return NextResponse.json({ message: 'Noe gikk galt' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  if (!await authCheck(request)) return NextResponse.json({ message: 'Ikke autentisert' }, { status: 401 })

  try {
    const existing = await prisma.advertiser.findFirst({ where: { id: params.id, deletedAt: null } })
    if (!existing) return NextResponse.json({ message: 'Ikke funnet' }, { status: 404 })

    await prisma.advertiser.update({
      where: { id: params.id },
      data: { deletedAt: new Date(), isActive: false },
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/advertisers/[id] DELETE] Uventet feil:', err)
    return NextResponse.json({ message: 'Noe gikk galt' }, { status: 500 })
  }
}
