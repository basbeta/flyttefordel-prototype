// CR-028: the 5 seeded test persons and their relative moved dates.
import { describe, it, expect } from 'vitest'
import { PERSONAS, movedAtFor, personaFields } from './personas'
import { HOUSING_TYPES } from './types'

const RUN = new Date('2026-10-13T08:00:00Z')

describe('PERSONAS', () => {
  it('er nøyaktig 5, med unike nøkler og navn', () => {
    expect(PERSONAS).toHaveLength(5)
    expect(new Set(PERSONAS.map((p) => p.seedKey)).size).toBe(5)
    expect(new Set(PERSONAS.map((p) => p.name)).size).toBe(5)
  })

  it('dekker alle fire flyttestatuser og både med og uten postnummer', () => {
    const statuses = new Set(PERSONAS.map((p) => p.movingStatus))
    expect(statuses).toEqual(new Set(['recently_moved', 'moved_past', 'not_moving', 'unknown']))
    expect(PERSONAS.some((p) => p.postcode === null)).toBe(true)
    expect(PERSONAS.some((p) => p.postcode !== null)).toBe(true)
  })

  it('bruker gyldige postnumre og boligtyper, og åpenbart fiktive navn', () => {
    for (const p of PERSONAS) {
      if (p.postcode !== null) expect(p.postcode).toMatch(/^\d{4}$/)
      if (p.housingType !== null) expect(HOUSING_TYPES).toContain(p.housingType)
      expect(p.name.startsWith('Test ')).toBe(true)
    }
  })

  it('nylig flyttet har flyttedato innenfor 60 dager, flyttet tidligere utenfor', () => {
    for (const p of PERSONAS) {
      if (p.movingStatus === 'recently_moved') expect(p.movedDaysAgo).toBeLessThanOrEqual(60)
      if (p.movingStatus === 'moved_past') expect(p.movedDaysAgo).toBeGreaterThan(60)
    }
  })
})

describe('movedAtFor', () => {
  it('regner flyttedato relativt til kjøringsdatoen, som kalenderdato i UTC', () => {
    const p = PERSONAS.find((x) => x.seedKey === 'test-nylig-flyttet')!
    expect(movedAtFor(p, RUN)?.toISOString()).toBe('2026-10-03T00:00:00.000Z')
  })

  it('gir en nyere dato når seeden kjøres senere (datoene oppdateres)', () => {
    const p = PERSONAS.find((x) => x.seedKey === 'test-nylig-flyttet')!
    const later = new Date('2026-12-01T08:00:00Z')
    expect(movedAtFor(p, later)!.getTime()).toBeGreaterThan(movedAtFor(p, RUN)!.getTime())
  })

  it('gir null når personen ikke har flyttedato', () => {
    const p = PERSONAS.find((x) => x.seedKey === 'test-ukjent')!
    expect(movedAtFor(p, RUN)).toBeNull()
  })
})

describe('personaFields', () => {
  it('inneholder aldri e-post eller seedKey, og markerer personen som test', () => {
    for (const p of PERSONAS) {
      const fields = personaFields(p, RUN)
      expect(fields).not.toHaveProperty('email')
      expect(fields).not.toHaveProperty('seedKey')
      expect(fields.isTest).toBe(true)
    }
  })
})
