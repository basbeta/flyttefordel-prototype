// CR-024: what the confirmation page remembers.
import { describe, it, expect } from 'vitest'
import { buildLastOrder, parseLastOrder, serializeLastOrder } from './lastOrder'
import type { SummaryItem } from './flowSelection'

const item: SummaryItem = {
  pageId: 's1',
  pageName: 'Side',
  benefitId: 'b1',
  title: 'Fordel',
  advertiserName: 'Kunde',
  productId: 'p1',
  productName: 'Digital',
  priceText: '99 kr',
}

describe('buildLastOrder', () => {
  it('beholder bare det som vises på bekreftelsen, ingen id-er utenom orderId', () => {
    const order = buildLastOrder('o1', [item])
    expect(order).toEqual({
      orderId: 'o1',
      items: [{ title: 'Fordel', advertiserName: 'Kunde', productName: 'Digital', priceText: '99 kr' }],
    })
    expect(JSON.stringify(order)).not.toContain('b1')
    expect(JSON.stringify(order)).not.toContain('p1')
  })
})

describe('parseLastOrder', () => {
  it('rundtur med serializeLastOrder', () => {
    const order = buildLastOrder('o1', [item, { ...item, priceText: null }])
    expect(parseLastOrder(serializeLastOrder(order))).toEqual(order)
  })

  it('tåler tom, ugyldig og feil form', () => {
    expect(parseLastOrder(null)).toBeNull()
    expect(parseLastOrder('')).toBeNull()
    expect(parseLastOrder('{ikke json')).toBeNull()
    expect(parseLastOrder('"tekst"')).toBeNull()
    expect(parseLastOrder('null')).toBeNull()
    expect(parseLastOrder('{"orderId":"","items":[]}')).toBeNull()
    expect(parseLastOrder('{"orderId":"o1"}')).toBeNull()
    expect(parseLastOrder('{"orderId":"o1","items":[{"title":1}]}')).toBeNull()
  })

  it('tom varelinjeliste er gyldig', () => {
    expect(parseLastOrder('{"orderId":"o1","items":[]}')).toEqual({ orderId: 'o1', items: [] })
  })
})
