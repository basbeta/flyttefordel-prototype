// CR-004: Admin — legg til koder i pool.
// CR-009: Forenklet med skipDuplicates: true (DB unique constraint på plass).

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

  try {
    const pool = await prisma.codePool.findFirst({ where: { id: params.poolId } })
    if (!pool) return NextResponse.json({ message: 'Pool ikke funnet' }, { status: 404 })

    const deduped = Array.from(new Set(parsed.data.codes))

    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.code.createMany({
        data: deduped.map((codeValue) => ({
          codePoolId: params.poolId,
          benefitId: pool.benefitId,
          codeValue,
          status: 'available',
        })),
        skipDuplicates: true,
      })

      if (created.count > 0) {
        await tx.codePool.update({
          where: { id: params.poolId },
          data: {
            totalCodes: { increment: created.count },
            availableCodes: { increment: created.count },
          },
        })
      }

      return created.count
    })

    const added = result
    const skipped = deduped.length - added

    if (added === 0) {
      return NextResponse.json({ added: 0, skipped }, { status: 200 })
    }
    return NextResponse.json({ added, skipped }, { status: 201 })
  } catch (err) {
    console.error('[admin/codes/[poolId] POST] Uventet feil:', err)
    return NextResponse.json({ message: 'Noe gikk galt' }, { status: 500 })
  }
}
