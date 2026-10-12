// CR-024: lead data and consent snapshot.
import { describe, it, expect } from 'vitest'
import { buildLeadFormData, LEAD_CONSENT_TEXT } from './buildLeadData'
import { buildConsentSnapshot, CONSENT_PLACEHOLDER_NOTICE, CONSENT_TEXTS } from './consentTexts'

const line = {
  benefitId: 'b1',
  productId: 'p1',
  pageId: 's1',
  productName: 'Digital',
  benefitTitle: 'Fordel',
}

describe('buildLeadFormData', () => {
  it('bygger formData med kontaktfelt, produkt og orderId', () => {
    expect(
      buildLeadFormData(
        { name: 'Test', email: 'test@example.test', phone: '12345678', postcode: '0150' },
        line,
        'o1'
      )
    ).toEqual({
      source: 'web_flow',
      orderId: 'o1',
      name: 'Test',
      email: 'test@example.test',
      phone: '12345678',
      postcode: '0150',
      productId: 'p1',
      productName: 'Digital',
    })
  })

  it('manglende telefon og postnummer blir null', () => {
    const data = buildLeadFormData({ name: 'T', email: 'a@b.test' }, line, 'o1')
    expect(data.phone).toBeNull()
    expect(data.postcode).toBeNull()
  })
})

describe('samtykketekster', () => {
  it('lead bruker serverens delingstekst', () => {
    expect(LEAD_CONSENT_TEXT).toBe(CONSENT_TEXTS.share)
  })

  it('alle tekster er merket som midlertidige', () => {
    for (const text of Object.values(CONSENT_TEXTS)) {
      expect(text).toContain(CONSENT_PLACEHOLDER_NOTICE)
    }
  })

  it('snapshot er en kopi av alle fire tekstene', () => {
    const snapshot = buildConsentSnapshot()
    expect(snapshot).toEqual(CONSENT_TEXTS)
    expect(snapshot).not.toBe(CONSENT_TEXTS)
    expect(Object.keys(snapshot).sort()).toEqual(['email', 'mail', 'share', 'sms'])
  })
})
