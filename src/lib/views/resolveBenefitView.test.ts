// CR-021: inheritance with overrides.
import { describe, it, expect } from 'vitest'
import { resolveBenefitView, type BenefitCoreContent, type BenefitViewRow } from './resolveBenefitView'

const core: BenefitCoreContent = {
  title: 'Kjernetittel',
  shortDescription: 'Kjernetekst',
  imageUrl: 'https://example.test/core.jpg',
  imageAlt: 'Kjernealt',
  badgeText: 'Ny',
}

const inherited = {
  title: 'Kjernetittel',
  text: 'Kjernetekst',
  imageUrl: 'https://example.test/core.jpg',
  imageAlt: 'Kjernealt',
  badgeText: 'Ny',
}

function row(overrides: Partial<BenefitViewRow> = {}): BenefitViewRow {
  return { format: 'app_card', variant: 'standard', ...overrides }
}

describe('resolveBenefitView', () => {
  it('uten rader arves alt fra fordelen', () => {
    expect(resolveBenefitView(core, [], 'app_card')).toEqual(inherited)
  })

  it('rad uten overstyringer gir ren arv', () => {
    expect(resolveBenefitView(core, [row()], 'app_card')).toEqual(inherited)
  })

  it('overstyrer tittel og lar resten arves', () => {
    const r = resolveBenefitView(core, [row({ title: 'Ny tittel' })], 'app_card')
    expect(r).toEqual({ ...inherited, title: 'Ny tittel' })
  })

  it('overstyrer tekst (mappes mot shortDescription)', () => {
    const r = resolveBenefitView(core, [row({ text: 'Ny tekst' })], 'app_card')
    expect(r.text).toBe('Ny tekst')
    expect(r.title).toBe('Kjernetittel')
  })

  it('overstyrer merketekst', () => {
    const r = resolveBenefitView(core, [row({ badgeText: 'Populær' })], 'app_card')
    expect(r.badgeText).toBe('Populær')
  })

  it('nytt bilde bruker visningens alt-tekst, aldri fordelens', () => {
    const r = resolveBenefitView(
      core,
      [row({ imageUrl: 'https://example.test/b.jpg', imageAlt: 'Bilde B' })],
      'app_card'
    )
    expect(r.imageUrl).toBe('https://example.test/b.jpg')
    expect(r.imageAlt).toBe('Bilde B')
  })

  it('nytt bilde uten alt-tekst gir null alt, ikke fordelens alt', () => {
    const r = resolveBenefitView(core, [row({ imageUrl: 'https://example.test/b.jpg' })], 'app_card')
    expect(r.imageUrl).toBe('https://example.test/b.jpg')
    expect(r.imageAlt).toBeNull()
  })

  it('bare alt-tekst overstyrt beholder fordelens bilde', () => {
    const r = resolveBenefitView(core, [row({ imageAlt: 'Annen alt' })], 'app_card')
    expect(r.imageUrl).toBe('https://example.test/core.jpg')
    expect(r.imageAlt).toBe('Annen alt')
  })

  it('tom streng, bare mellomrom og null regnes som ingen overstyring', () => {
    const r = resolveBenefitView(
      core,
      [row({ title: '', text: '   ', badgeText: null, imageUrl: ' ', imageAlt: '' })],
      'app_card'
    )
    expect(r).toEqual(inherited)
  })

  it('trimmer overstyrt innhold', () => {
    const r = resolveBenefitView(core, [row({ title: '  Ny tittel  ' })], 'app_card')
    expect(r.title).toBe('Ny tittel')
  })

  it('bruker forespurt variant når den finnes', () => {
    const views = [row({ title: 'Standard' }), row({ variant: 'B', title: 'Variant B' })]
    expect(resolveBenefitView(core, views, 'app_card', 'B').title).toBe('Variant B')
  })

  it('faller tilbake til standard når forespurt variant mangler', () => {
    const views = [row({ title: 'Standard' })]
    expect(resolveBenefitView(core, views, 'app_card', 'B').title).toBe('Standard')
  })

  it('faller tilbake til ren arv når verken variant eller standard finnes', () => {
    const views = [row({ variant: 'C', title: 'Variant C' })]
    expect(resolveBenefitView(core, views, 'app_card', 'B')).toEqual(inherited)
  })

  it('variant overstyrer ikke felt den ikke setter (arver fra fordelen, ikke fra standard)', () => {
    const views = [
      row({ title: 'Standard', badgeText: 'Standardmerke' }),
      row({ variant: 'B', title: 'Variant B' }),
    ]
    const r = resolveBenefitView(core, views, 'app_card', 'B')
    expect(r.title).toBe('Variant B')
    expect(r.badgeText).toBe('Ny')
  })

  it('ignorerer rader for andre formater', () => {
    const views = [{ format: 'app_hero', variant: 'standard', title: 'Hero' }]
    expect(resolveBenefitView(core, views, 'app_card')).toEqual(inherited)
  })

  it('muterer ikke inputen', () => {
    const views = [row({ title: 'Ny tittel' })]
    const snapshot = JSON.stringify({ core, views })
    resolveBenefitView(core, views, 'app_card')
    expect(JSON.stringify({ core, views })).toBe(snapshot)
  })
})
