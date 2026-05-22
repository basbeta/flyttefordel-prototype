// CR-002: Unique code assignment endpoint.
//
// MIGRATION NOTE: This uses a Prisma interactive transaction which is atomic
// within a single DB connection. For high-traffic production use, replace with
// a SELECT ... FOR UPDATE SKIP LOCKED approach in raw SQL. See entities.md:
// "Tildeling skjer i databasetransaksjon — se /lib/codes/assignUniqueCode.ts"

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

export async function POST(_request: Request, { params }: { params: { slug: string } }) {
  try {
    const decodedSlug = decodeURIComponent(params.slug)

    const benefit = await prisma.benefit.findFirst({
      where: { slug: decodedSlug, status: 'active', deletedAt: null },
      include: {
        redemption: {
          include: {
            codePool: { select: { id: true, availableCodes: true } },
          },
        },
      },
    })

    if (!benefit) {
      return NextResponse.json(
        { error: 'BENEFIT_NOT_FOUND', message: 'Fordel ikke funnet' },
        { status: 404 }
      )
    }

    const codePoolId = benefit.redemption?.codePool?.id
    if (!codePoolId) {
      return NextResponse.json(
        { error: 'CODE_POOL_EMPTY', message: 'Ingen kodepool tilknyttet denne fordelen' },
        { status: 409 }
      )
    }

    // Atomic: find and claim a code in a single transaction.
    const code = await prisma.$transaction(async (tx) => {
      const available = await tx.code.findFirst({
        where: { codePoolId, status: 'available' },
        orderBy: { createdAt: 'asc' },
      })
      if (!available) return null

      const [claimed] = await Promise.all([
        tx.code.update({
          where: { id: available.id },
          data: { status: 'assigned', assignedAt: new Date() },
        }),
        tx.codePool.update({
          where: { id: codePoolId },
          data: { availableCodes: { decrement: 1 } },
        }),
      ])
      return claimed
    })

    if (!code) {
      return NextResponse.json(
        { error: 'CODE_POOL_EMPTY', message: 'Kodelager er tomt' },
        { status: 409 }
      )
    }

    return NextResponse.json({ code: code.codeValue })
  } catch {
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Intern feil' },
      { status: 500 }
    )
  }
}
