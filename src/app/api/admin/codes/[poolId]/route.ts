// CR-004: Admin — legg til koder i pool.

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

const addCodesSchema = z.object({
  codes: z.array(z.string().min(1)).min(1).max(1000),
})

type Params = { params: { poolId: string } }

export async function POST(request: NextRequest, { params }: Params) {
  if (!await authCheck(request)) return NextResponse.json({ message: 'Ikke autentisert' }, { status: 401 })

  const body: unknown = await request.json().catch(() => null)
  const parsed = addCodesSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ message: parsed.error.errors[0]?.message }, { status: 400 })

  const pool = await prisma.codePool.findFirst({ where: { id: params.poolId } })
  if (!pool) return NextResponse.json({ message: 'Pool ikke funnet' }, { status: 404 })

  const uniqueCodes = Array.from(new Set(parsed.data.codes))

  await prisma.$transaction([
    prisma.code.createMany({
      data: uniqueCodes.map((codeValue) => ({
        codePoolId: params.poolId,
        benefitId: pool.benefitId,
        codeValue,
        status: 'available',
      })),
      skipDuplicates: true,
    }),
    prisma.codePool.update({
      where: { id: params.poolId },
      data: {
        totalCodes: { increment: uniqueCodes.length },
        availableCodes: { increment: uniqueCodes.length },
      },
    }),
  ])

  return NextResponse.json({ added: uniqueCodes.length }, { status: 201 })
}
