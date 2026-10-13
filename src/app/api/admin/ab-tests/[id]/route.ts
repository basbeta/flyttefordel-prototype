// CR-030: Admin, change an A/B test or move it through draft -> running -> ended.
// Variants and weights are locked while the test runs (changing them would move people between
// variants and spoil the data). Only one running test per scope.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/client'
import { authCheck } from '@/lib/admin/apiAuth'
import { checkTestStart, parseTestDefinition } from '@/lib/abtest'
import { isAllowedTransition, patchAbTestSchema, periodProblem } from '@/lib/abtest/schemas'

type Params = { params: Promise<{ id: string }> }

export async function PUT(request: NextRequest, { params }: Params) {
  if (!(await authCheck(request))) return NextResponse.json({ message: 'Ikke autentisert' }, { status: 401 })

  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ message: 'Test ikke funnet' }, { status: 404 })
  }

  const body: unknown = await request.json().catch(() => null)
  const patch = patchAbTestSchema.safeParse(body)
  if (!patch.success) {
    return NextResponse.json({ message: patch.error.errors[0]?.message ?? 'Ugyldig input' }, { status: 400 })
  }

  try {
    const current = await prisma.abTest.findUnique({ where: { id } })
    if (!current) return NextResponse.json({ message: 'Test ikke funnet' }, { status: 404 })

    const data = patch.data
    const nextStatus = data.status ?? current.status
    if (!isAllowedTransition(current.status, nextStatus)) {
      return NextResponse.json({ message: 'Ugyldig statusendring' }, { status: 409 })
    }
    // Ending an ended test again is a harmless repeat; anything else on an ended test is refused.
    const onlyRepeatsEnd = Object.keys(data).every((k) => k === 'status') && data.status === 'ended'
    if (current.status === 'ended' && Object.keys(data).length > 0 && !onlyRepeatsEnd) {
      return NextResponse.json({ message: 'En avsluttet test kan ikke endres' }, { status: 409 })
    }

    // Variants: locked while running, validated by the kind of the test.
    let variants = current.variants
    if (data.variants !== undefined) {
      if (current.status === 'running') {
        return NextResponse.json({ message: 'Varianter og vekter er låst mens testen kjører' }, { status: 409 })
      }
      const parsed = parseTestDefinition({ kind: current.kind, scope: current.scope, variants: data.variants })
      if (!parsed.ok) return NextResponse.json({ message: parsed.message }, { status: 400 })
      variants = parsed.value.variants
    }

    const startsAt = data.startsAt === undefined ? current.startsAt : data.startsAt ? new Date(data.startsAt) : null
    const endsAt = data.endsAt === undefined ? current.endsAt : data.endsAt ? new Date(data.endsAt) : null
    const period = periodProblem(startsAt, endsAt)
    if (period) return NextResponse.json({ message: period }, { status: 400 })

    // Starting: one running test per scope, and the kind's own check (e.g. every variant has content).
    if (nextStatus === 'running' && current.status !== 'running') {
      const other = await prisma.abTest.findFirst({
        where: { scopeKey: current.scopeKey, status: 'running', id: { not: id } },
        select: { id: true },
      })
      if (other) {
        return NextResponse.json({ message: 'Det kjører allerede en test på dette' }, { status: 409 })
      }
      const parsedVariants = parseTestDefinition({ kind: current.kind, scope: current.scope, variants })
      if (!parsedVariants.ok) return NextResponse.json({ message: parsedVariants.message }, { status: 400 })
      const problem = await checkTestStart(current.kind, current.scope, parsedVariants.value.variants)
      if (problem) return NextResponse.json({ message: problem }, { status: 400 })
    }

    const test = await prisma.abTest.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.primaryGoal !== undefined ? { primaryGoal: data.primaryGoal } : {}),
        ...(data.variants !== undefined ? { variants: variants as object } : {}),
        status: nextStatus,
        startsAt,
        endsAt,
      },
    })
    return NextResponse.json({ test })
  } catch (err) {
    console.error('[admin/ab-tests/[id] PUT] Uventet feil:', err)
    return NextResponse.json({ message: 'Noe gikk galt' }, { status: 500 })
  }
}
