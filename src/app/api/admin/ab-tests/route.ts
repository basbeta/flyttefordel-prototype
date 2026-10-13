// CR-030: Admin, list and create A/B tests. Generic over test kinds: scope and variants are
// validated by the kind register, so new kinds need no change here.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/client'
import { authCheck } from '@/lib/admin/apiAuth'
import { parseTestDefinition } from '@/lib/abtest'
import { createAbTestSchema, periodProblem } from '@/lib/abtest/schemas'

export async function GET(request: NextRequest) {
  if (!(await authCheck(request))) return NextResponse.json({ message: 'Ikke autentisert' }, { status: 401 })

  const benefitId = request.nextUrl.searchParams.get('benefitId')
  try {
    // The benefit filter works on scope_key, which content tests build from the benefit id.
    const tests = await prisma.abTest.findMany({
      where: benefitId ? { scopeKey: { contains: benefitId } } : undefined,
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ tests })
  } catch (err) {
    console.error('[admin/ab-tests GET] Uventet feil:', err)
    return NextResponse.json({ message: 'Noe gikk galt' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!(await authCheck(request))) return NextResponse.json({ message: 'Ikke autentisert' }, { status: 401 })

  const body: unknown = await request.json().catch(() => null)
  const envelope = createAbTestSchema.safeParse(body)
  if (!envelope.success) {
    return NextResponse.json({ message: envelope.error.errors[0]?.message ?? 'Ugyldig input' }, { status: 400 })
  }
  const parsed = parseTestDefinition(envelope.data)
  if (!parsed.ok) return NextResponse.json({ message: parsed.message }, { status: 400 })

  const startsAt = envelope.data.startsAt ? new Date(envelope.data.startsAt) : null
  const endsAt = envelope.data.endsAt ? new Date(envelope.data.endsAt) : null
  const period = periodProblem(startsAt, endsAt)
  if (period) return NextResponse.json({ message: period }, { status: 400 })

  try {
    const test = await prisma.abTest.create({
      data: {
        name: envelope.data.name,
        kind: parsed.value.kind,
        scope: parsed.value.scope as object,
        scopeKey: parsed.value.scopeKey,
        variants: parsed.value.variants,
        primaryGoal: envelope.data.primaryGoal ?? null,
        startsAt,
        endsAt,
        status: 'draft',
      },
    })
    return NextResponse.json({ test }, { status: 201 })
  } catch (err) {
    console.error('[admin/ab-tests POST] Uventet feil:', err)
    return NextResponse.json({ message: 'Noe gikk galt' }, { status: 500 })
  }
}
