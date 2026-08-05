// CR-007: Admin — oppdater og deaktiver kategori.

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
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug kan kun inneholde a-z, 0-9 og bindestrek').optional(),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
})

type Params = { params: { id: string } }

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!await authCheck(request)) return NextResponse.json({ message: 'Ikke autentisert' }, { status: 401 })

  const body: unknown = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ message: parsed.error.errors[0]?.message }, { status: 400 })

  try {
    const existing = await prisma.category.findFirst({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ message: 'Ikke funnet' }, { status: 404 })

    if (parsed.data.slug && parsed.data.slug !== existing.slug) {
      const slugConflict = await prisma.category.findFirst({ where: { slug: parsed.data.slug } })
      if (slugConflict) return NextResponse.json({ message: 'Slug er allerede i bruk' }, { status: 409 })
    }

    await prisma.category.update({ where: { id: params.id }, data: parsed.data })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/categories/[id] PATCH] Uventet feil:', err)
    return NextResponse.json({ message: 'Noe gikk galt' }, { status: 500 })
  }
}

// Deaktivering — isActive = false. Ingen hard delete siden Category mangler deletedAt.
export async function DELETE(request: NextRequest, { params }: Params) {
  if (!await authCheck(request)) return NextResponse.json({ message: 'Ikke autentisert' }, { status: 401 })

  try {
    const existing = await prisma.category.findFirst({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ message: 'Ikke funnet' }, { status: 404 })

    await prisma.category.update({ where: { id: params.id }, data: { isActive: false } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/categories/[id] DELETE] Uventet feil:', err)
    return NextResponse.json({ message: 'Noe gikk galt' }, { status: 500 })
  }
}
