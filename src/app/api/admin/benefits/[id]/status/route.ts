// CR-004: Admin — endre status på fordel.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/client'
import { verifyAdminJWT, ADMIN_TOKEN_COOKIE } from '@/lib/admin/auth'
import { getBenefitConfigProblems } from '@/lib/benefits/displayStatus'

async function authCheck(request: NextRequest) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value
  if (!token) return null
  return verifyAdminJWT(token)
}

const statusSchema = z.object({
  status: z.enum(['draft', 'active', 'scheduled', 'paused', 'expired', 'archived', 'deleted']),
})

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!await authCheck(request)) return NextResponse.json({ message: 'Ikke autentisert' }, { status: 401 })

  const body: unknown = await request.json().catch(() => null)
  const parsed = statusSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ message: parsed.error.errors[0]?.message }, { status: 400 })

  try {
    const { id } = await params
    const existing = await prisma.benefit.findFirst({
      where: { id, deletedAt: null },
      include: { redemption: { include: { codePool: { select: { availableCodes: true } } } } },
    })
    if (!existing) return NextResponse.json({ message: 'Ikke funnet' }, { status: 404 })

    // CR-017: Sperre mot å sette Aktiv/Planlagt på en fordel med manglende
    // påkrevd redemption-innhold — se getBenefitConfigProblems.
    if (parsed.data.status === 'active' || parsed.data.status === 'scheduled') {
      const problems = getBenefitConfigProblems({
        status: parsed.data.status,
        redemptionType: existing.redemptionType,
        startsAt: existing.startsAt,
        endsAt: existing.endsAt,
        redemption: existing.redemption
          ? {
              genericCode: existing.redemption.genericCode,
              externalUrl: existing.redemption.externalUrl,
              qrValue: existing.redemption.qrValue,
              codePoolId: existing.redemption.codePoolId,
              leadFormId: existing.redemption.leadFormId,
              codePool: existing.redemption.codePool
                ? { availableCodes: existing.redemption.codePool.availableCodes }
                : null,
            }
          : null,
      })
      if (problems.length > 0) {
        const statusLabel = parsed.data.status === 'active' ? 'Aktiv' : 'Planlagt'
        return NextResponse.json(
          { message: `Kan ikke sette status ${statusLabel}: ${problems.join('; ')}` },
          { status: 400 },
        )
      }
    }

    await prisma.benefit.update({
      where: { id },
      data: { status: parsed.data.status },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/benefits/[id]/status PATCH] Uventet feil:', err)
    return NextResponse.json({ message: 'Noe gikk galt' }, { status: 500 })
  }
}
