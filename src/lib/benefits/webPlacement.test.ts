// CR-025: why a benefit does or does not show in the web flow.
import { describe, it, expect } from 'vitest'
import { getWebPlacementProblems, type WebPlacementInput } from './webPlacement'

const NOW = new Date('2026-10-12T12:00:00Z')

function input(overrides: Partial<WebPlacementInput> = {}): WebPlacementInput {
  return {
    benefit: { status: 'active', deletedAt: null, startsAt: null, endsAt: null },
    placement: { pageId: 'p1' },
    page: { isActive: true, deletedAt: null },
    activeProductCount: 2,
    hasTargeting: false,
    ...overrides,
  }
}

const codes = (i: WebPlacementInput) => getWebPlacementProblems(i, NOW).map((p) => p.code)

describe('getWebPlacementProblems', () => {
  it('ingen plassering er et valg, ikke et problem (selv om fordelen ikke er live)', () => {
    expect(codes(input({ placement: null }))).toEqual([])
    expect(
      codes(input({ placement: null, benefit: { status: 'draft', deletedAt: null, startsAt: null, endsAt: null } }))
    ).toEqual([])
  })

  it('live fordel på aktiv side med produkter gir ingen problemer', () => {
    expect(codes(input())).toEqual([])
  })

  it('fordel som ikke er live blokkerer (status, slettet, periode)', () => {
    for (const benefit of [
      { status: 'draft' as const, deletedAt: null, startsAt: null, endsAt: null },
      { status: 'active' as const, deletedAt: new Date('2026-01-01'), startsAt: null, endsAt: null },
      { status: 'active' as const, deletedAt: null, startsAt: new Date('2026-11-01'), endsAt: null },
      { status: 'active' as const, deletedAt: null, startsAt: null, endsAt: new Date('2026-10-01') },
    ]) {
      const problems = getWebPlacementProblems(input({ benefit }), NOW)
      expect(problems.map((p) => p.code)).toEqual(['benefit_not_live'])
      expect(problems[0].severity).toBe('blocking')
    }
  })

  it('side som mangler eller er slettet blokkerer', () => {
    expect(codes(input({ page: null }))).toEqual(['page_missing'])
    expect(codes(input({ page: { isActive: true, deletedAt: new Date('2026-01-01') } }))).toEqual([
      'page_missing',
    ])
  })

  it('inaktiv side blokkerer', () => {
    const problems = getWebPlacementProblems(input({ page: { isActive: false, deletedAt: null } }), NOW)
    expect(problems.map((p) => p.code)).toEqual(['page_inactive'])
    expect(problems[0].severity).toBe('blocking')
  })

  it('ingen aktive produkter er en info, ikke blokkering', () => {
    const problems = getWebPlacementProblems(input({ activeProductCount: 0 }), NOW)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toMatchObject({ code: 'no_products', severity: 'info' })
  })

  it('targeting er en info', () => {
    const problems = getWebPlacementProblems(input({ hasTargeting: true }), NOW)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toMatchObject({ code: 'targeting', severity: 'info' })
  })

  it('samler flere problemer i fast rekkefølge', () => {
    expect(
      codes(
        input({
          benefit: { status: 'paused', deletedAt: null, startsAt: null, endsAt: null },
          page: { isActive: false, deletedAt: null },
          activeProductCount: 0,
          hasTargeting: true,
        })
      )
    ).toEqual(['benefit_not_live', 'page_inactive', 'no_products', 'targeting'])
  })

  it('alle meldinger er på norsk og ikke tomme', () => {
    const all = getWebPlacementProblems(
      input({
        benefit: { status: 'draft', deletedAt: null, startsAt: null, endsAt: null },
        page: null,
        activeProductCount: 0,
        hasTargeting: true,
      }),
      NOW
    )
    for (const p of all) expect(p.message.length).toBeGreaterThan(10)
  })
})
