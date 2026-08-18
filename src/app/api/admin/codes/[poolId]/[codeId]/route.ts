// CR-009: Admin — deaktiver enkelt-kode.
// PATCH setter status=disabled. Justerer availableCodes kun om koden var available.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/client'
import { verifyAdminJWT, ADMIN_TOKEN_COOKIE } from '@/lib/admin/auth'

async function authCheck(request: NextRequest) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value
  if (!token) return null
  return verifyAdminJWT(token)
}

type Params = { params: Promise<{ poolId: string; codeId: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!await authCheck(request)) return NextResponse.json({ message: 'Ikke autentisert' }, { status: 401 })

  const { poolId, codeId } = await params

  try {
    const code = await prisma.code.findFirst({
      where: { id: codeId, codePoolId: poolId },
      select: { id: true, status: true },
    })
    if (!code) return NextResponse.json({ message: 'Kode ikke funnet' }, { status: 404 })

    if (code.status === 'disabled') {
      return NextResponse.json({ message: 'Kode er allerede deaktivert' }, { status: 200 })
    }

    const wasAvailable = code.status === 'available'

    await prisma.$transaction([
      prisma.code.update({
        where: { id: code.id },
        data: { status: 'disabled' },
      }),
      ...(wasAvailable
        ? [prisma.codePool.update({
            where: { id: poolId },
            data: { availableCodes: { decrement: 1 } },
          })]
        : []),
    ])

    return NextResponse.json({ disabled: true, availableAdjusted: wasAvailable })
  } catch (err) {
    console.error('[admin/codes/[poolId]/[codeId] PATCH] Uventet feil:', err)
    return NextResponse.json({ message: 'Noe gikk galt' }, { status: 500 })
  }
}
