// CR-024: order lines are validated against the session's flow.
import { describe, it, expect } from 'vitest'
import { validateOrderLines } from './validateLines'
import type { WebFlowCard, WebFlowPage } from '@/types/app'

function card(benefitId: string, products: { id: string; name: string }[]): WebFlowCard {
  return {
    benefitId,
    slug: `fordel-${benefitId}`,
    title: `Fordel ${benefitId}`,
    text: 'Tekst',
    imageUrl: null,
    imageAlt: null,
    badgeText: null,
    termsText: null,
    advertiser: { name: 'Demo Kunde', logoUrl: null },
    products: products.map((p) => ({ ...p, text: null, priceText: null })),
  }
}

const pages: WebFlowPage[] = [
  {
    id: 's1',
    name: 'Side 1',
    text: null,
    imageUrl: null,
    imageAlt: null,
    cards: [
      card('b1', [
        { id: 'p1', name: 'Digital' },
        { id: 'p2', name: 'Komplett' },
      ]),
      card('b2', []),
    ],
  },
  {
    id: 's2',
    name: 'Side 2',
    text: null,
    imageUrl: null,
    imageAlt: null,
    cards: [card('b3', [{ id: 'p3', name: 'Strøm' }])],
  },
]

describe('validateOrderLines', () => {
  it('gyldige linjer løses med side, navn og tittel som øyeblikksbilde', () => {
    const r = validateOrderLines(
      [
        { benefitId: 'b1', productId: 'p2' },
        { benefitId: 'b3', productId: 'p3' },
      ],
      pages
    )
    expect(r).toEqual({
      ok: true,
      lines: [
        { benefitId: 'b1', productId: 'p2', pageId: 's1', productName: 'Komplett', benefitTitle: 'Fordel b1' },
        { benefitId: 'b3', productId: 'p3', pageId: 's2', productName: 'Strøm', benefitTitle: 'Fordel b3' },
      ],
    })
  })

  it('avviser fordel som ikke er i løpet (ukjent, ikke live, targeting)', () => {
    const r = validateOrderLines([{ benefitId: 'finnes-ikke', productId: 'p1' }], pages)
    expect(r).toEqual({
      ok: false,
      invalid: [{ benefitId: 'finnes-ikke', productId: 'p1', reason: 'benefit_not_in_flow' }],
    })
  })

  it('avviser produkt som ikke finnes eller er inaktivt (ikke i løpet)', () => {
    const r = validateOrderLines([{ benefitId: 'b1', productId: 'p9' }], pages)
    expect(r.ok === false && r.invalid[0].reason).toBe('product_not_on_benefit')
  })

  it('avviser produkt som tilhører en annen fordel', () => {
    const r = validateOrderLines([{ benefitId: 'b1', productId: 'p3' }], pages)
    expect(r.ok === false && r.invalid[0].reason).toBe('product_not_on_benefit')
  })

  it('avviser fordel uten produkter', () => {
    const r = validateOrderLines([{ benefitId: 'b2', productId: 'p1' }], pages)
    expect(r.ok === false && r.invalid[0].reason).toBe('product_not_on_benefit')
  })

  it('avviser to produkter på samme fordel', () => {
    const r = validateOrderLines(
      [
        { benefitId: 'b1', productId: 'p1' },
        { benefitId: 'b1', productId: 'p2' },
      ],
      pages
    )
    expect(r.ok === false && r.invalid).toEqual([
      { benefitId: 'b1', productId: 'p2', reason: 'duplicate_benefit' },
    ])
  })

  it('samler alle ugyldige linjer, og én ugyldig avviser hele ordren', () => {
    const r = validateOrderLines(
      [
        { benefitId: 'b1', productId: 'p1' },
        { benefitId: 'x', productId: 'p1' },
        { benefitId: 'b3', productId: 'p9' },
      ],
      pages
    )
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.invalid.map((i) => i.reason)).toEqual([
      'benefit_not_in_flow',
      'product_not_on_benefit',
    ])
  })

  it('tomt løp avviser alt', () => {
    const r = validateOrderLines([{ benefitId: 'b1', productId: 'p1' }], [])
    expect(r.ok).toBe(false)
  })
})
