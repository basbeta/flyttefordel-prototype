// CR-007: Admin — list og opprett kategorier.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/client'
import { verifyAdminJWT, ADMIN_TOKEN_COOKIE } from '@/lib/admin/auth'
import { getAdminCategoriesFull } from '@/lib/queries/adminQueries'

async function authCheck(request: NextRequest) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value
  if (!token) return null
  return verifyAdminJWT(token)
}

const categorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug kan kun inneholde a-z, 0-9 og bindestrek'),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
})

export async function GET(request: NextRequest) {
  if (!await authCheck(request)) return NextResponse.json({ message: 'Ikke autentisert' }, { status: 401 })
  const categories = await getAdminCategoriesFull()
  return NextResponse.json(categories)
}

export async function POST(request: NextRequest) {
  if (!await authCheck(request)) return NextResponse.json({ message: 'Ikke autentisert' }, { status: 401 })

  const body: unknown = await request.json().catch(() => null)
  const parsed = categorySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ message: parsed.error.errors[0]?.message }, { status: 400 })

  const existing = await prisma.category.findFirst({ where: { slug: parsed.data.slug } })
  if (existing) return NextResponse.json({ message: 'Slug er allerede i bruk' }, { status: 409 })

  const category = await prisma.category.create({ data: parsed.data })
  return NextResponse.json({ id: category.id }, { status: 201 })
}
