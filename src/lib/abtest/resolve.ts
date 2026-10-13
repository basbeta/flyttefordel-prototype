// CR-030: Look up which variant a person gets for a set of scopes. The one entry the queries and
// routes use. Fail-open: any problem means "no test" and the caller shows `standard`.

import { prisma } from '@/lib/db/client'
import { assignVariant } from './assign'
import { variantsSchema, viewIdFor } from './kinds'

export type Assignment = {
  testId: string
  variant: string
  // Written to events, e.g. `app_card:b`.
  viewId: string
}

export type RunningTestRow = {
  id: string
  kind: string
  scope: unknown
  scopeKey: string
  status: string
  startsAt: Date | null
  endsAt: Date | null
  variants: unknown
}

export function isRunning(test: RunningTestRow, now: Date): boolean {
  if (test.status !== 'running') return false
  if (test.startsAt && test.startsAt > now) return false
  if (test.endsAt && test.endsAt < now) return false
  return true
}

// Pure part, no I/O: one assignment per scope key (first running test wins, there should only be one).
export function assignmentsFromTests(
  personId: string | null,
  tests: readonly RunningTestRow[],
  now: Date
): Map<string, Assignment> {
  const result = new Map<string, Assignment>()
  if (!personId) return result
  for (const test of tests) {
    if (result.has(test.scopeKey) || !isRunning(test, now)) continue
    const variants = variantsSchema.safeParse(test.variants)
    if (!variants.success) continue
    const variant = assignVariant(personId, test.id, variants.data)
    if (!variant) continue
    const viewId = viewIdFor(test.kind, test.scope, variant)
    if (!viewId) continue
    result.set(test.scopeKey, { testId: test.id, variant, viewId })
  }
  return result
}

export async function resolveActiveAssignments(
  personId: string | null,
  scopeKeys: readonly string[],
  now: Date = new Date()
): Promise<Map<string, Assignment>> {
  if (!personId || scopeKeys.length === 0) return new Map()
  try {
    const tests = await prisma.abTest.findMany({
      where: { status: 'running', scopeKey: { in: [...scopeKeys] } },
      orderBy: { createdAt: 'asc' },
    })
    return assignmentsFromTests(personId, tests, now)
  } catch (err) {
    // Only the error name: never ids or person data in the log.
    console.error('[abtest] oppslag feilet:', err instanceof Error ? err.name : 'ukjent')
    return new Map()
  }
}
