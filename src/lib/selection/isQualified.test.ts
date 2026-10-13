// CR-029: the selection function, per dimension and in combination.
import { describe, it, expect } from 'vitest'
import { isQualified, explainSelection, daysBetweenUtc } from './isQualified'
import type { SelectionPerson, SelectionRule } from './types'

const NOW = new Date('2026-10-13T08:00:00Z')

function rule(overrides: Partial<SelectionRule> = {}): SelectionRule {
  return {
    appliesNationally: false,
    includeUnknownLocation: true,
    postcodes: [],
    postcodeRanges: [],
    movingStatuses: [],
    ...overrides,
  }
}

function person(overrides: Partial<SelectionPerson> = {}): SelectionPerson {
  return { postcode: '0150', movingStatus: 'recently_moved', ...overrides }
}

const date = (s: string) => new Date(`${s}T00:00:00Z`)

describe('daysBetweenUtc', () => {
  it('teller hele kalenderdager i UTC og ignorerer klokkeslett', () => {
    expect(daysBetweenUtc(date('2026-10-03'), new Date('2026-10-13T23:59:59Z'))).toBe(10)
    expect(daysBetweenUtc(date('2026-10-13'), new Date('2026-10-13T00:00:01Z'))).toBe(0)
  })
  it('går over månedsskifte, skuddår og årsskifte', () => {
    expect(daysBetweenUtc(date('2028-02-28'), date('2028-03-01'))).toBe(2)
    expect(daysBetweenUtc(date('2026-02-28'), date('2026-03-01'))).toBe(1)
    expect(daysBetweenUtc(date('2025-12-31'), date('2026-01-01'))).toBe(1)
  })
  it('gir negativ verdi for en dato frem i tid', () => {
    expect(daysBetweenUtc(date('2026-10-20'), NOW)).toBe(-7)
  })
})

describe('uten regel og uten nye felt (som før)', () => {
  it('null og undefined regel er synlig for alle', () => {
    expect(isQualified(null, person(), NOW)).toBe(true)
    expect(isQualified(undefined, person({ postcode: null }), NOW)).toBe(true)
  })
  it('en regel uten kriterier er synlig for alle', () => {
    expect(isQualified(rule(), person(), NOW)).toBe(true)
  })
  it('postnummer og flyttestatus fungerer som før', () => {
    const r = rule({ postcodes: ['0150'], movingStatuses: ['recently_moved'] })
    expect(isQualified(r, person(), NOW)).toBe(true)
    expect(isQualified(r, person({ postcode: '9008' }), NOW)).toBe(false)
    expect(isQualified(r, person({ movingStatus: 'moved_past' }), NOW)).toBe(false)
  })
  it('postnummerintervall', () => {
    const r = rule({ postcodeRanges: [{ from: '0001', to: '1299' }] })
    expect(isQualified(r, person({ postcode: '1299' }), NOW)).toBe(true)
    expect(isQualified(r, person({ postcode: '1300' }), NOW)).toBe(false)
  })
  it('personer uten postnummer følger includeUnknownLocation', () => {
    const r = rule({ postcodes: ['0150'], includeUnknownLocation: false })
    expect(isQualified(r, person({ postcode: null }), NOW)).toBe(false)
    expect(isQualified({ ...r, includeUnknownLocation: true }, person({ postcode: null }), NOW)).toBe(true)
  })
})

describe('dager siden flytting', () => {
  const r = rule({ daysSinceMoveMin: 0, daysSinceMoveMax: 60 })

  it('grensene er inkludert', () => {
    expect(isQualified(r, person({ movedAt: date('2026-10-13') }), NOW)).toBe(true) // dag 0
    expect(isQualified(r, person({ movedAt: date('2026-08-14') }), NOW)).toBe(true) // dag 60
    expect(isQualified(r, person({ movedAt: date('2026-08-13') }), NOW)).toBe(false) // dag 61
  })
  it('dagen før flyttedatoen er utenfor når min er 0', () => {
    expect(isQualified(r, person({ movedAt: date('2026-10-14') }), NOW)).toBe(false) // dag -1
  })
  it('bare min eller bare max', () => {
    expect(isQualified(rule({ daysSinceMoveMin: 30 }), person({ movedAt: date('2026-01-01') }), NOW)).toBe(true)
    expect(isQualified(rule({ daysSinceMoveMin: 30 }), person({ movedAt: date('2026-10-01') }), NOW)).toBe(false)
    expect(isQualified(rule({ daysSinceMoveMax: 30 }), person({ movedAt: date('2026-10-01') }), NOW)).toBe(true)
    expect(isQualified(rule({ daysSinceMoveMax: 30 }), person({ movedAt: date('2026-01-01') }), NOW)).toBe(false)
  })
  it('negative verdier betyr før flytting («skal flytte»)', () => {
    const planning = rule({ daysSinceMoveMin: -30, daysSinceMoveMax: -1 })
    expect(isQualified(planning, person({ movedAt: date('2026-10-23') }), NOW)).toBe(true) // dag -10
    expect(isQualified(planning, person({ movedAt: date('2026-12-31') }), NOW)).toBe(false) // dag -79
    expect(isQualified(planning, person({ movedAt: date('2026-10-13') }), NOW)).toBe(false) // dag 0
  })
  it('streng: manglende flyttedato kvalifiserer ikke', () => {
    expect(isQualified(r, person(), NOW)).toBe(false)
    expect(isQualified(r, person({ movedAt: null }), NOW)).toBe(false)
  })
  it('en regel uten dagsgrenser bryr seg ikke om flyttedato', () => {
    expect(isQualified(rule(), person({ movedAt: null }), NOW)).toBe(true)
  })
  it('0 er en ekte grense (ikke «ingen grense»)', () => {
    const r0 = rule({ daysSinceMoveMax: 0 })
    expect(isQualified(r0, person({ movedAt: date('2026-10-12') }), NOW)).toBe(false)
    expect(isQualified(r0, person({ movedAt: date('2026-10-13') }), NOW)).toBe(true)
  })
})

describe('boligtype', () => {
  const r = rule({ housingTypes: ['leilighet', 'rekkehus'] })
  it('slår til for tillatt boligtype', () => {
    expect(isQualified(r, person({ housingType: 'leilighet' }), NOW)).toBe(true)
    expect(isQualified(r, person({ housingType: 'rekkehus' }), NOW)).toBe(true)
  })
  it('slår ikke til for annen eller manglende boligtype (streng)', () => {
    expect(isQualified(r, person({ housingType: 'enebolig' }), NOW)).toBe(false)
    expect(isQualified(r, person({ housingType: null }), NOW)).toBe(false)
    expect(isQualified(r, person(), NOW)).toBe(false)
  })
  it('tom liste eller ugyldig verdi betyr ingen begrensning', () => {
    expect(isQualified(rule({ housingTypes: [] }), person({ housingType: null }), NOW)).toBe(true)
    expect(isQualified(rule({ housingTypes: null }), person({ housingType: null }), NOW)).toBe(true)
    expect(isQualified(rule({ housingTypes: 'leilighet' }), person({ housingType: null }), NOW)).toBe(true)
  })
})

describe('kryssalg (requiresChosenBenefitIds)', () => {
  const r = rule({ requiresChosenBenefitIds: ['b1', 'b2'] })
  it('vises bare etter at minst én av fordelene er valgt', () => {
    expect(isQualified(r, person({ chosenBenefitIds: ['b2'] }), NOW)).toBe(true)
    expect(isQualified(r, person({ chosenBenefitIds: new Set(['b1']) }), NOW)).toBe(true)
    expect(isQualified(r, person({ chosenBenefitIds: ['b9'] }), NOW)).toBe(false)
    expect(isQualified(r, person({ chosenBenefitIds: [] }), NOW)).toBe(false)
    expect(isQualified(r, person(), NOW)).toBe(false)
  })
})

describe('skjul etter valg (hideIfChosen)', () => {
  const r = rule({ benefitId: 'b1', hideIfChosen: true })
  it('skjuler fordelen for personer som har valgt den', () => {
    expect(isQualified(r, person({ chosenBenefitIds: ['b1'] }), NOW)).toBe(false)
  })
  it('viser den for personer som ikke har valgt den (eller andre)', () => {
    expect(isQualified(r, person({ chosenBenefitIds: ['b2'] }), NOW)).toBe(true)
    expect(isQualified(r, person(), NOW)).toBe(true)
  })
  it('gjør ingenting uten hideIfChosen, eller for en hero-regel uten benefitId', () => {
    expect(isQualified(rule({ benefitId: 'b1', hideIfChosen: false }), person({ chosenBenefitIds: ['b1'] }), NOW)).toBe(true)
    expect(isQualified(rule({ benefitId: null, hideIfChosen: true }), person({ chosenBenefitIds: ['b1'] }), NOW)).toBe(true)
  })
})

describe('kombinasjoner', () => {
  it('alle kriterier må bestå (gammel del OG nye)', () => {
    const r = rule({ postcodes: ['0150'], daysSinceMoveMax: 60, housingTypes: ['leilighet'] })
    const ok = person({ movedAt: date('2026-10-01'), housingType: 'leilighet' })
    expect(isQualified(r, ok, NOW)).toBe(true)
    expect(isQualified(r, { ...ok, postcode: '9008' }, NOW)).toBe(false)
    expect(isQualified(r, { ...ok, housingType: 'enebolig' }, NOW)).toBe(false)
    expect(isQualified(r, { ...ok, movedAt: date('2026-01-01') }, NOW)).toBe(false)
  })
  it('appliesNationally hopper bare over lokasjon og status, ikke de nye kriteriene', () => {
    const r = rule({ appliesNationally: true, postcodes: ['0150'], housingTypes: ['leilighet'] })
    expect(isQualified(r, person({ postcode: '9008', housingType: 'leilighet' }), NOW)).toBe(true)
    expect(isQualified(r, person({ postcode: '9008', housingType: 'enebolig' }), NOW)).toBe(false)
  })
  it('person uten postnummer, men med includeUnknownLocation, må fortsatt bestå de nye kriteriene', () => {
    const r = rule({ postcodes: ['0150'], includeUnknownLocation: true, housingTypes: ['leilighet'] })
    expect(isQualified(r, person({ postcode: null, housingType: 'leilighet' }), NOW)).toBe(true)
    expect(isQualified(r, person({ postcode: null, housingType: 'enebolig' }), NOW)).toBe(false)
  })
})

describe('explainSelection', () => {
  it('qualified uten feil', () => {
    expect(explainSelection(rule(), person(), NOW)).toEqual({ qualified: true, failed: [] })
    expect(explainSelection(null, person(), NOW)).toEqual({ qualified: true, failed: [] })
  })
  it('oppgir hvert kriterium som slo ut', () => {
    const r = rule({
      postcodes: ['0150'],
      movingStatuses: ['recently_moved'],
      daysSinceMoveMax: 30,
      housingTypes: ['leilighet'],
      requiresChosenBenefitIds: ['b1'],
      benefitId: 'b9',
      hideIfChosen: true,
    })
    const p = person({
      postcode: '9008',
      movingStatus: 'moved_past',
      movedAt: date('2026-01-01'),
      housingType: 'enebolig',
      chosenBenefitIds: ['b9'],
    })
    const result = explainSelection(r, p, NOW)
    expect(result.qualified).toBe(false)
    expect(result.failed.sort()).toEqual(
      ['daysSinceMove', 'hideIfChosen', 'housingType', 'movingStatus', 'postcode', 'requiresChosen'].sort()
    )
  })
  it('skiller ukjent lokasjon fra feil postnummer', () => {
    const r = rule({ postcodes: ['0150'], includeUnknownLocation: false })
    expect(explainSelection(r, person({ postcode: null }), NOW).failed).toEqual(['unknownLocation'])
    expect(explainSelection(r, person({ postcode: '9008' }), NOW).failed).toEqual(['postcode'])
  })
  it('isQualified og explainSelection er alltid enige', () => {
    const r = rule({ housingTypes: ['leilighet'] })
    for (const housingType of ['leilighet', 'enebolig', null]) {
      const p = person({ housingType })
      expect(isQualified(r, p, NOW)).toBe(explainSelection(r, p, NOW).qualified)
    }
  })
})
