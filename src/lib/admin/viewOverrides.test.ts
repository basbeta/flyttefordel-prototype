// CR-027: helpers for editing view overrides.
import { describe, it, expect } from 'vitest'
import {
  EMPTY_OVERRIDES,
  fieldsFromRow,
  hasOverrides,
  toOverrideBody,
  VIEW_OVERRIDE_LIMITS,
} from './viewOverrides'

describe('toOverrideBody', () => {
  it('tomme felt og bare mellomrom blir null (arv)', () => {
    expect(toOverrideBody(EMPTY_OVERRIDES)).toEqual({
      title: null,
      text: null,
      imageUrl: null,
      imageAlt: null,
      badgeText: null,
    })
    expect(toOverrideBody({ ...EMPTY_OVERRIDES, title: '   ', badgeText: '\t' }).title).toBeNull()
  })

  it('trimmer fylte felt', () => {
    expect(toOverrideBody({ ...EMPTY_OVERRIDES, title: '  Ny tittel  ' }).title).toBe('Ny tittel')
  })
})

describe('fieldsFromRow', () => {
  it('null og manglende rad gir tomme felt', () => {
    expect(fieldsFromRow(null)).toEqual(EMPTY_OVERRIDES)
    expect(fieldsFromRow(undefined)).toEqual(EMPTY_OVERRIDES)
  })

  it('null-verdier blir tomme strenger, satte verdier beholdes', () => {
    expect(fieldsFromRow({ title: 'T', text: null, imageUrl: 'https://x.test/a.jpg' })).toEqual({
      ...EMPTY_OVERRIDES,
      title: 'T',
      imageUrl: 'https://x.test/a.jpg',
    })
  })

  it('rundtur med toOverrideBody', () => {
    const body = { title: 'T', text: 'X', imageUrl: 'https://x.test/a.jpg', imageAlt: 'A', badgeText: 'Ny' }
    expect(toOverrideBody(fieldsFromRow(body))).toEqual(body)
  })
})

describe('hasOverrides', () => {
  it('false når alt er tomt eller bare mellomrom', () => {
    expect(hasOverrides(EMPTY_OVERRIDES)).toBe(false)
    expect(hasOverrides({ ...EMPTY_OVERRIDES, title: '  ' })).toBe(false)
  })

  it('true når minst ett felt er satt', () => {
    expect(hasOverrides({ ...EMPTY_OVERRIDES, badgeText: 'Ny' })).toBe(true)
  })
})

describe('VIEW_OVERRIDE_LIMITS', () => {
  it('har grensene fra CR-027', () => {
    expect(VIEW_OVERRIDE_LIMITS).toEqual({ title: 120, text: 500, badgeText: 40, imageAlt: 200, imageUrl: 500 })
  })
})
