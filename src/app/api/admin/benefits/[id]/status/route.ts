// CR-004: Admin — endre status på fordel.

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

const statusSchema = z.object({
  status: z.enum(['draft', 'active', 'scheduled', 'paused', 'expired', 'archived', 'deleted']),
})

type Params = { params: { id: string } }

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!await authCheck(request)) return NextResponse.json({ message: 'Ikke autentisert' }, { status: 401 })

  const body: unknown = await request.json().catch(() => null)
  const parsed = statusSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ message: parsed.error.errors[0]?.message }, { status: 400 })

  const existing = await prisma.benefit.findFirst({ where: { id: params.id, deletedAt: null } })
  if (!existing) return NextResponse.json({ message: 'Ikke funnet' }, { status: 404 })

  await prisma.benefit.update({
    where: { id: params.id },
    data: { status: parsed.data.status },
  })

  return NextResponse.json({ ok: true })
}
