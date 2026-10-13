// CR-028: validation of login and new test person.
import { describe, it, expect } from 'vitest'
import { loginSchema, newPersonSchema } from './schemas'

const ID = '3f2b1c3e-8c58-4a0d-9d3e-111111111111'

describe('loginSchema', () => {
  it('godtar gyldig person og e-post, og trimmer e-posten', () => {
    const r = loginSchema.safeParse({ personId: ID, email: '  qa@bas.no ' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.email).toBe('qa@bas.no')
  })

  it.each([
    [{ personId: ID, email: 'ikke-en-epost' }],
    [{ personId: ID, email: '' }],
    [{ personId: ID }],
    [{ email: 'qa@bas.no' }],
    [{ personId: 'ikke-uuid', email: 'qa@bas.no' }],
    [{ personId: ID, email: 'qa@bas.no', extra: 1 }],
    [{ personId: ID, email: `${'a'.repeat(200)}@bas.no` }],
  ])('avviser %j', (input) => {
    expect(loginSchema.safeParse(input).success).toBe(false)
  })
})

describe('newPersonSchema', () => {
  it('godtar minimum (navn og flyttestatus) og gjør tomt om til null', () => {
    const r = newPersonSchema.safeParse({
      name: ' Test Ny ',
      movingStatus: 'unknown',
      postcode: '',
      movedAt: '',
      housingType: '',
    })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data).toEqual({
        name: 'Test Ny',
        postcode: null,
        movingStatus: 'unknown',
        movedAt: null,
        fromAddress: null,
        toAddress: null,
        housingType: null,
      })
    }
  })

  it('godtar skuddårsdagen 2028-02-29 og siste dag i måneden', () => {
    for (const movedAt of ['2028-02-29', '2026-04-30', '2026-12-31']) {
      expect(newPersonSchema.safeParse({ name: 'T', movingStatus: 'unknown', movedAt }).success, movedAt).toBe(true)
    }
  })

  it('godtar alle felt', () => {
    const r = newPersonSchema.safeParse({
      name: 'Test Full',
      postcode: '0150',
      movingStatus: 'recently_moved',
      movedAt: '2026-10-01',
      fromAddress: 'Testveien 1',
      toAddress: 'Testgata 2',
      housingType: 'leilighet',
    })
    expect(r.success).toBe(true)
  })

  it.each([
    [{ movingStatus: 'unknown' }],
    [{ name: '   ', movingStatus: 'unknown' }],
    [{ name: 'a'.repeat(81), movingStatus: 'unknown' }],
    [{ name: 'T', movingStatus: 'nesten' }],
    [{ name: 'T', movingStatus: 'unknown', postcode: '12' }],
    [{ name: 'T', movingStatus: 'unknown', postcode: 'abcd' }],
    [{ name: 'T', movingStatus: 'unknown', movedAt: '2026-13-45' }],
    [{ name: 'T', movingStatus: 'unknown', movedAt: '2026-02-31' }],
    [{ name: 'T', movingStatus: 'unknown', movedAt: '2026-02-29' }],
    [{ name: 'T', movingStatus: 'unknown', movedAt: '2026-04-31' }],
    [{ name: 'T', movingStatus: 'unknown', movedAt: '01.10.2026' }],
    [{ name: 'T', movingStatus: 'unknown', housingType: 'slott' }],
    [{ name: 'T', movingStatus: 'unknown', fromAddress: 'a'.repeat(121) }],
    [{ name: 'T', movingStatus: 'unknown', isTest: false }],
  ])('avviser %j', (input) => {
    expect(newPersonSchema.safeParse(input).success).toBe(false)
  })
})
