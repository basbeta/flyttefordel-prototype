// CR-029: the shared targeting input.
import { describe, it, expect } from 'vitest'
import { targetingSchema, toTargetingData } from './targetingSchema'

const B1 = '3f2b1c3e-8c58-4a0d-9d3e-111111111111'

describe('targetingSchema', () => {
  it('en tom regel får gamle standardverdier og ingen nye felt (ikke-bryter)', () => {
    const r = targetingSchema.parse({})
    expect(r).toMatchObject({ appliesNationally: false, includeUnknownLocation: true, postcodes: [], movingStatuses: [] })
    expect(r.daysSinceMoveMin).toBeUndefined()
    expect(r.housingTypes).toBeUndefined()
    expect(r.hideIfChosen).toBeUndefined()
  })

  it('godtar alle nye felt', () => {
    const r = targetingSchema.safeParse({
      daysSinceMoveMin: -10,
      daysSinceMoveMax: 90,
      housingTypes: ['annet'],
      requiresChosenBenefitIds: [B1],
      hideIfChosen: true,
    })
    expect(r.success).toBe(true)
  })

  it('godtar fra lik til, bare én grense, og null', () => {
    expect(targetingSchema.safeParse({ daysSinceMoveMin: 5, daysSinceMoveMax: 5 }).success).toBe(true)
    expect(targetingSchema.safeParse({ daysSinceMoveMin: 5 }).success).toBe(true)
    expect(targetingSchema.safeParse({ daysSinceMoveMin: null, daysSinceMoveMax: null }).success).toBe(true)
  })

  it.each([
    [{ daysSinceMoveMin: 10, daysSinceMoveMax: 9 }],
    [{ daysSinceMoveMin: 0.5 }],
    [{ daysSinceMoveMax: 3651 }],
    [{ daysSinceMoveMin: -3651 }],
    [{ housingTypes: ['slott'] }],
    [{ housingTypes: 'leilighet' }],
    [{ requiresChosenBenefitIds: ['x'] }],
    [{ requiresChosenBenefitIds: Array(51).fill(B1) }],
    [{ hideIfChosen: 1 }],
  ])('avviser %j', (input) => {
    expect(targetingSchema.safeParse(input).success).toBe(false)
  })
})

describe('toTargetingData', () => {
  it('sender de nye feltene videre uendret, og utelatte felt blir undefined (Prisma lar dem stå)', () => {
    const full = toTargetingData(
      targetingSchema.parse({ daysSinceMoveMin: 0, housingTypes: ['leilighet'], hideIfChosen: true })
    )
    expect(full).toMatchObject({ daysSinceMoveMin: 0, housingTypes: ['leilighet'], hideIfChosen: true })
    const old = toTargetingData(targetingSchema.parse({ postcodes: ['0150'] }))
    expect(old.postcodes).toEqual(['0150'])
    expect(old.daysSinceMoveMin).toBeUndefined()
    expect(old.requiresChosenBenefitIds).toBeUndefined()
    expect(old.hideIfChosen).toBeUndefined()
  })
})
