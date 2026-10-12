// CR-023: selection logic for the web flow.
import { describe, it, expect } from 'vitest'
import {
  buildSummary,
  parseSelection,
  sanitizeSelection,
  serializeSelection,
  toggleProduct,
} from './flowSelection'
import type { WebFlowCard, WebFlowPage } from '@/types/app'

function card(benefitId: string, productIds: string[]): WebFlowCard {
  return {
    benefitId,
    slug: `fordel-${benefitId}`,
    title: `Fordel ${benefitId}`,
    text: 'Tekst',
    imageUrl: null,
    imageAlt: null,
    badgeText: null,
    termsText: null,
    advertiser: { name: `Kunde ${benefitId}`, logoUrl: null },
    products: productIds.map((id) => ({
      id,
      name: `Produkt ${id}`,
      text: null,
      priceText: id === 'p1' ? '99 kr' : null,
    })),
  }
}

function page(id: string, cards: WebFlowCard[]): WebFlowPage {
  return { id, name: `Side ${id}`, text: null, imageUrl: null, imageAlt: null, cards }
}

const pages = [
  page('s1', [card('b1', ['p1', 'p2']), card('b2', [])]),
  page('s2', [card('b3', ['p3'])]),
]

describe('parseSelection', () => {
  it('tåler tom, ugyldig og feil form', () => {
    expect(parseSelection(null)).toEqual({})
    expect(parseSelection(undefined)).toEqual({})
    expect(parseSelection('')).toEqual({})
    expect(parseSelection('{ikke json')).toEqual({})
    expect(parseSelection('[1,2]')).toEqual({})
    expect(parseSelection('"tekst"')).toEqual({})
    expect(parseSelection('null')).toEqual({})
  })

  it('beholder bare strengverdier som ikke er tomme', () => {
    expect(parseSelection('{"b1":"p1","b2":5,"b3":"","b4":null}')).toEqual({ b1: 'p1' })
  })

  it('rundtur med serializeSelection', () => {
    const sel = { b1: 'p1', b3: 'p3' }
    expect(parseSelection(serializeSelection(sel))).toEqual(sel)
  })
})

describe('toggleProduct', () => {
  it('velger et produkt', () => {
    expect(toggleProduct({}, 'b1', 'p1')).toEqual({ b1: 'p1' })
  })

  it('trykk på valgt produkt igjen angrer', () => {
    expect(toggleProduct({ b1: 'p1' }, 'b1', 'p1')).toEqual({})
  })

  it('trykk på annet produkt på samme fordel bytter', () => {
    expect(toggleProduct({ b1: 'p1' }, 'b1', 'p2')).toEqual({ b1: 'p2' })
  })

  it('rører ikke valg på andre fordeler', () => {
    expect(toggleProduct({ b1: 'p1', b3: 'p3' }, 'b1', 'p1')).toEqual({ b3: 'p3' })
  })

  it('muterer ikke inputen', () => {
    const sel = { b1: 'p1' }
    toggleProduct(sel, 'b1', 'p2')
    toggleProduct(sel, 'b1', 'p1')
    expect(sel).toEqual({ b1: 'p1' })
  })
})

describe('sanitizeSelection', () => {
  it('beholder gyldige valg', () => {
    expect(sanitizeSelection({ b1: 'p2', b3: 'p3' }, pages)).toEqual({ b1: 'p2', b3: 'p3' })
  })

  it('dropper valg mot forsvunnet fordel', () => {
    expect(sanitizeSelection({ borte: 'p1' }, pages)).toEqual({})
  })

  it('dropper valg mot forsvunnet produkt på en fordel som finnes', () => {
    expect(sanitizeSelection({ b1: 'p9' }, pages)).toEqual({})
  })

  it('dropper valg mot produkt som tilhører en annen fordel', () => {
    expect(sanitizeSelection({ b1: 'p3' }, pages)).toEqual({})
  })

  it('dropper valg på fordel uten produkter', () => {
    expect(sanitizeSelection({ b2: 'p1' }, pages)).toEqual({})
  })

  it('tomt løp rydder alt', () => {
    expect(sanitizeSelection({ b1: 'p1' }, [])).toEqual({})
  })
})

describe('buildSummary', () => {
  it('lister valg i løpets rekkefølge, ikke i valgrekkefølge', () => {
    const items = buildSummary({ b3: 'p3', b1: 'p1' }, pages)
    expect(items.map((i) => i.benefitId)).toEqual(['b1', 'b3'])
    expect(items[0]).toEqual({
      pageId: 's1',
      pageName: 'Side s1',
      benefitId: 'b1',
      title: 'Fordel b1',
      advertiserName: 'Kunde b1',
      productId: 'p1',
      productName: 'Produkt p1',
      priceText: '99 kr',
    })
    expect(items[1].priceText).toBeNull()
  })

  it('tomt valg gir tom oppsummering', () => {
    expect(buildSummary({}, pages)).toEqual([])
  })

  it('ignorerer ugyldige valg', () => {
    expect(buildSummary({ b1: 'p9', borte: 'p1', b2: 'p1' }, pages)).toEqual([])
  })
})
