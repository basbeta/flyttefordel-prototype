// CR-024: input validation for the order.
import { describe, it, expect } from 'vitest'
import { MAX_ORDER_LINES, OrderInputSchema } from './orderSchema'

const SUB = '3b241101-e2bb-4255-8caf-4136c566a962'
const B1 = '6ecd8c99-4036-403d-bf84-cf8400f67836'
const P1 = '16fd2706-8baf-433b-82eb-8c7fada847da'

function valid(overrides: Record<string, unknown> = {}) {
  return {
    submissionId: SUB,
    name: 'Test Testesen',
    email: 'test@example.test',
    consentShare: true,
    lines: [{ benefitId: B1, productId: P1 }],
    ...overrides,
  }
}

function fieldErrors(input: unknown) {
  const r = OrderInputSchema.safeParse(input)
  return r.success ? null : r.error.flatten().fieldErrors
}

describe('OrderInputSchema', () => {
  it('godtar minimal gyldig input og setter markedsføringssamtykker til false', () => {
    const r = OrderInputSchema.safeParse(valid())
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.consentEmail).toBe(false)
      expect(r.data.consentMail).toBe(false)
      expect(r.data.consentSms).toBe(false)
      expect(r.data.phone).toBeUndefined()
      expect(r.data.postcode).toBeUndefined()
    }
  })

  it('trimmer og normaliserer e-post til små bokstaver', () => {
    const r = OrderInputSchema.safeParse(valid({ email: '  Test@Example.TEST ', name: '  Ola  ' }))
    expect(r.success && r.data.email).toBe('test@example.test')
    expect(r.success && r.data.name).toBe('Ola')
  })

  it('tom streng i telefon og postnummer regnes som ikke oppgitt', () => {
    const r = OrderInputSchema.safeParse(valid({ phone: '  ', postcode: '' }))
    expect(r.success).toBe(true)
    expect(r.success && r.data.phone).toBeUndefined()
    expect(r.success && r.data.postcode).toBeUndefined()
  })

  it('godtar gyldig telefon og postnummer', () => {
    const r = OrderInputSchema.safeParse(valid({ phone: '+47 123 45 678', postcode: '0150' }))
    expect(r.success).toBe(true)
  })

  it('avviser manglende og tomt navn', () => {
    expect(fieldErrors(valid({ name: undefined }))?.name).toBeTruthy()
    expect(fieldErrors(valid({ name: '   ' }))?.name).toBeTruthy()
  })

  it('avviser for langt navn, e-post og telefon (grenseverdi)', () => {
    expect(OrderInputSchema.safeParse(valid({ name: 'a'.repeat(120) })).success).toBe(true)
    expect(fieldErrors(valid({ name: 'a'.repeat(121) }))?.name).toBeTruthy()
    expect(fieldErrors(valid({ email: `${'a'.repeat(196)}@e.no` }))?.email).toBeTruthy()
    expect(fieldErrors(valid({ phone: '1'.repeat(31) }))?.phone).toBeTruthy()
  })

  it('avviser ugyldig e-post', () => {
    expect(fieldErrors(valid({ email: 'ikke-en-epost' }))?.email).toBeTruthy()
    expect(fieldErrors(valid({ email: '' }))?.email).toBeTruthy()
  })

  it('avviser ugyldig telefon og postnummer', () => {
    expect(fieldErrors(valid({ phone: 'abc' }))?.phone).toBeTruthy()
    expect(fieldErrors(valid({ postcode: '123' }))?.postcode).toBeTruthy()
    expect(fieldErrors(valid({ postcode: '12345' }))?.postcode).toBeTruthy()
    expect(fieldErrors(valid({ postcode: 'abcd' }))?.postcode).toBeTruthy()
  })

  it('krever delingssamtykke (true)', () => {
    expect(fieldErrors(valid({ consentShare: false }))?.consentShare).toBeTruthy()
    expect(fieldErrors(valid({ consentShare: undefined }))?.consentShare).toBeTruthy()
    expect(fieldErrors(valid({ consentShare: 'on' }))?.consentShare).toBeTruthy()
  })

  it('markedsføringssamtykker er valgfrie og lagres som valgt', () => {
    const r = OrderInputSchema.safeParse(valid({ consentEmail: true, consentSms: true }))
    expect(r.success && r.data.consentEmail).toBe(true)
    expect(r.success && r.data.consentMail).toBe(false)
    expect(r.success && r.data.consentSms).toBe(true)
  })

  it('avviser ugyldig submissionId', () => {
    expect(fieldErrors(valid({ submissionId: 'ikke-uuid' }))?.submissionId).toBeTruthy()
  })

  it('krever minst én linje og maks antall', () => {
    expect(fieldErrors(valid({ lines: [] }))?.lines).toBeTruthy()
    const many = Array.from({ length: MAX_ORDER_LINES + 1 }, () => ({ benefitId: B1, productId: P1 }))
    expect(fieldErrors(valid({ lines: many }))?.lines).toBeTruthy()
    const max = Array.from({ length: MAX_ORDER_LINES }, () => ({ benefitId: B1, productId: P1 }))
    expect(OrderInputSchema.safeParse(valid({ lines: max })).success).toBe(true)
  })

  it('avviser linjer med ugyldige id-er og ukjente felt', () => {
    expect(OrderInputSchema.safeParse(valid({ lines: [{ benefitId: 'x', productId: P1 }] })).success).toBe(false)
    expect(OrderInputSchema.safeParse(valid({ lines: [{ benefitId: B1, productId: P1, pris: 0 }] })).success).toBe(false)
  })

  it('avviser ukjente toppnivåfelt (strict)', () => {
    expect(OrderInputSchema.safeParse(valid({ rolle: 'admin' })).success).toBe(false)
  })

  it('feilmeldinger gjentar ikke innsendte verdier', () => {
    const r = OrderInputSchema.safeParse(valid({ email: 'hemmelig-feil-adresse', phone: 'hemmelig' }))
    expect(JSON.stringify(r.success ? {} : r.error.flatten())).not.toContain('hemmelig')
  })
})
