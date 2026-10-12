// CR-021: format registry.
import { describe, it, expect } from 'vitest'
import { VIEW_FORMATS, isViewFormat, getMissingRequiredFields, DEFAULT_VARIANT } from './formats'

describe('format registry', () => {
  it('har web_card (CR-022) med samme felt som app_card', () => {
    expect(isViewFormat('web_card')).toBe(true)
    expect(VIEW_FORMATS.web_card.overridable).toEqual(VIEW_FORMATS.app_card.overridable)
  })

  it('har app_card, og standard er default-variant', () => {
    expect(isViewFormat('app_card')).toBe(true)
    expect(DEFAULT_VARIANT).toBe('standard')
  })

  it('avviser ukjente formater og ikke-strenger', () => {
    expect(isViewFormat('app_hero')).toBe(false)
    expect(isViewFormat('')).toBe(false)
    expect(isViewFormat('toString')).toBe(false)
    expect(isViewFormat(undefined)).toBe(false)
  })

  it('krevde felt er alltid også overstyrbare', () => {
    for (const spec of Object.values(VIEW_FORMATS)) {
      for (const field of spec.required) {
        expect(spec.overridable).toContain(field)
      }
    }
  })
})

describe('getMissingRequiredFields', () => {
  const ok = { title: 'T', text: 'X', imageUrl: null, imageAlt: null, badgeText: null }

  it('returnerer tom liste når alt påkrevd er fylt', () => {
    expect(getMissingRequiredFields('app_card', ok)).toEqual([])
  })

  it('finner tomme og bare-mellomrom-felter', () => {
    expect(getMissingRequiredFields('app_card', { ...ok, title: '', text: '  ' })).toEqual([
      'title',
      'text',
    ])
  })
})
