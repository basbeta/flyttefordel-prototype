// CR-029: the seeded test persons and the selection demo rules give exactly the table promised in
// the seed and used by the e2e suite. If a persona or a rule changes, this fails first.
import { describe, it, expect } from 'vitest'
import { PERSONAS, movedAtFor } from '@/lib/identity/personas'
import { DEMO_SELECTION_RULES, EXPECTED_DEMO_SELECTION } from './demo'
import { isQualified } from './isQualified'
import type { SelectionRule } from './types'

// The persons seed run date; the persons are relative to it, so "now" is the same day.
const NOW = new Date('2026-10-13T08:00:00Z')

function asRule(key: string): SelectionRule {
  const r = DEMO_SELECTION_RULES[key]
  return {
    appliesNationally: false,
    includeUnknownLocation: true,
    postcodes: [],
    postcodeRanges: [],
    movingStatuses: [],
    // The benefit id is the key in this test, so hideIfChosen and cross-sell can be exercised.
    benefitId: key,
    daysSinceMoveMin: r.daysSinceMoveMin ?? null,
    daysSinceMoveMax: r.daysSinceMoveMax ?? null,
    housingTypes: r.housingTypes ?? null,
    requiresChosenBenefitIds: r.requiresChosenBenefitIds ?? null,
    hideIfChosen: r.hideIfChosen ?? false,
  }
}

function visibleFor(seedKey: string, chosen: string[] = []): string[] {
  const p = PERSONAS.find((x) => x.seedKey === seedKey)!
  const person = {
    postcode: p.postcode,
    movingStatus: p.movingStatus,
    movedAt: movedAtFor(p, NOW),
    housingType: p.housingType,
    chosenBenefitIds: chosen,
  }
  return Object.keys(DEMO_SELECTION_RULES)
    .filter((key) => isQualified(asRule(key), person, NOW))
    .sort()
}

describe('demo-utvalg per seedet testperson', () => {
  it('har en forventning for hver av de 5 personene, og ingen ekstra', () => {
    expect(Object.keys(EXPECTED_DEMO_SELECTION).sort()).toEqual(PERSONAS.map((p) => p.seedKey).sort())
  })

  it.each(Object.entries(EXPECTED_DEMO_SELECTION))('%s ser %j før noen bestilling', (seedKey, expected) => {
    expect(visibleFor(seedKey)).toEqual([...expected].sort())
  })

  it('etter at grunnpakken er valgt: den skjules og kryssalget vises', () => {
    const before = visibleFor('test-nylig-flyttet')
    expect(before).toContain('grunn')
    expect(before).not.toContain('kryssalg')
    const after = visibleFor('test-nylig-flyttet', ['grunn'])
    expect(after).not.toContain('grunn')
    expect(after).toContain('kryssalg')
  })

  it('alle fem personer får forskjellig utvalg (ingen er identiske med en annen)', () => {
    const sets = Object.keys(EXPECTED_DEMO_SELECTION).map((k) => visibleFor(k).join(','))
    // Ukjent, Ikke-Flytter, Flyttet-Tidligere og Nylig-Flyttet er alle ulike, Nord-Norge deler
    // bare boligtype/dager med to andre men ikke hele settet.
    expect(new Set(sets).size).toBe(5)
  })
})
