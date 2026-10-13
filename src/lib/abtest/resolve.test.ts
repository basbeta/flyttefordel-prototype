// CR-030: which tests count, and the fail-open lookup.
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  prisma: { abTest: { findMany: vi.fn() } },
}))

import { prisma } from '@/lib/db/client'
import { assignmentsFromTests, isRunning, resolveActiveAssignments, type RunningTestRow } from './resolve'

const db = prisma as unknown as { abTest: { findMany: ReturnType<typeof vi.fn> } }

const BENEFIT = '11111111-1111-4111-8111-111111111111'
const SCOPE_KEY = `content:${BENEFIT}:app_card`
const NOW = new Date('2026-10-13T12:00:00Z')

function test(over: Partial<RunningTestRow> = {}): RunningTestRow {
  return {
    id: 'test-1',
    kind: 'content',
    scope: { benefitId: BENEFIT, format: 'app_card' },
    scopeKey: SCOPE_KEY,
    status: 'running',
    startsAt: null,
    endsAt: null,
    variants: [
      { key: 'standard', weight: 1 },
      { key: 'b', weight: 1 },
    ],
    ...over,
  }
}

let errorSpy: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  vi.clearAllMocks()
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => errorSpy.mockRestore())

describe('isRunning', () => {
  it('bare running innenfor perioden gjelder', () => {
    expect(isRunning(test(), NOW)).toBe(true)
    expect(isRunning(test({ status: 'draft' }), NOW)).toBe(false)
    expect(isRunning(test({ status: 'ended' }), NOW)).toBe(false)
    expect(isRunning(test({ startsAt: new Date('2026-10-14T00:00:00Z') }), NOW)).toBe(false)
    expect(isRunning(test({ endsAt: new Date('2026-10-12T00:00:00Z') }), NOW)).toBe(false)
  })
})

describe('assignmentsFromTests', () => {
  it('gir testId, variant og viewId, og samme svar for samme person', () => {
    const a = assignmentsFromTests('person-1', [test()], NOW).get(SCOPE_KEY)
    const b = assignmentsFromTests('person-1', [test()], NOW).get(SCOPE_KEY)
    expect(a).toBeDefined()
    expect(a).toEqual(b)
    expect(a!.testId).toBe('test-1')
    expect(a!.viewId).toBe(`app_card:${a!.variant}`)
  })

  it('uten person-ID gir ingen test', () => {
    expect(assignmentsFromTests(null, [test()], NOW).size).toBe(0)
  })

  it('hopper over test som ikke kjører og test med ugyldige varianter', () => {
    expect(assignmentsFromTests('p', [test({ status: 'draft' })], NOW).size).toBe(0)
    expect(assignmentsFromTests('p', [test({ variants: 'søppel' })], NOW).size).toBe(0)
    expect(assignmentsFromTests('p', [test({ kind: 'ukjent' })], NOW).size).toBe(0)
  })

  it('første kjørende test på samme scope vinner', () => {
    const r = assignmentsFromTests('p', [test({ id: 'a' }), test({ id: 'b' })], NOW)
    expect(r.get(SCOPE_KEY)!.testId).toBe('a')
  })
})

describe('resolveActiveAssignments', () => {
  it('spør ikke databasen uten person eller scopes', async () => {
    expect((await resolveActiveAssignments(null, [SCOPE_KEY])).size).toBe(0)
    expect((await resolveActiveAssignments('p', [])).size).toBe(0)
    expect(db.abTest.findMany).not.toHaveBeenCalled()
  })

  it('henter bare running tester for de ønskede scopene', async () => {
    db.abTest.findMany.mockResolvedValueOnce([test()])
    const r = await resolveActiveAssignments('p', [SCOPE_KEY], NOW)
    expect(r.has(SCOPE_KEY)).toBe(true)
    expect(db.abTest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'running', scopeKey: { in: [SCOPE_KEY] } } })
    )
  })

  it('feiler åpent: databasefeil gir ingen test, og logger bare feilnavnet', async () => {
    db.abTest.findMany.mockRejectedValueOnce(new Error('connection to person-123 failed'))
    const r = await resolveActiveAssignments('person-123', [SCOPE_KEY], NOW)
    expect(r.size).toBe(0)
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain('person-123')
  })
})
