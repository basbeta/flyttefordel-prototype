// CR-004: Admin — opprett annonsør.

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

const advertiserSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  orgNumber: z.string().nullable().optional(),
  websiteUrl: z.string().url().nullable().optional(),
  contactName: z.string().nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  internalNotes: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
})

export async function POST(request: NextRequest) {
  if (!await authCheck(request)) return NextResponse.json({ message: 'Ikke autentisert' }, { status: 401 })

  const body: unknown = await request.json().catch(() => null)
  const parsed = advertiserSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ message: parsed.error.errors[0]?.message }, { status: 400 })

  try {
    const existing = await prisma.advertiser.findFirst({ where: { slug: parsed.data.slug } })
    if (existing) return NextResponse.json({ message: 'Slug er allerede i bruk' }, { status: 409 })

    const advertiser = await prisma.advertiser.create({ data: parsed.data })
    return NextResponse.json({ id: advertiser.id }, { status: 201 })
  } catch (err) {
    console.error('[admin/advertisers POST] Uventet feil:', err)
    return NextResponse.json({ message: 'Noe gikk galt' }, { status: 500 })
  }
}
