// CR-024: client side of the order submission.
import { vi, describe, it, expect, afterEach } from 'vitest'
import {
  buildOrderPayload,
  generateSubmissionId,
  postOrder,
  validateOrderPayload,
  type OrderFormValues,
} from './submitClient'
import type { SummaryItem } from './flowSelection'

const B1 = '6ecd8c99-4036-403d-bf84-cf8400f67836'
const P1 = '16fd2706-8baf-433b-82eb-8c7fada847da'
const SUB = '3b241101-e2bb-4255-8caf-4136c566a962'

const items: SummaryItem[] = [
  {
    pageId: 's1',
    pageName: 'Side',
    benefitId: B1,
    title: 'Fordel',
    advertiserName: 'Kunde',
    productId: P1,
    productName: 'Digital',
    priceText: null,
  },
]

const values: OrderFormValues = {
  name: 'Test Testesen',
  email: 'test@example.test',
  phone: '',
  postcode: '',
  consentShare: true,
  consentEmail: false,
  consentMail: false,
  consentSms: false,
}

function response(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers })
}

afterEach(() => vi.unstubAllGlobals())

describe('generateSubmissionId', () => {
  it('gir en gyldig uuid', () => {
    expect(generateSubmissionId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    )
  })

  it('faller tilbake når crypto.randomUUID ikke finnes (ikke sikker kontekst)', () => {
    vi.stubGlobal('crypto', {})
    const id = generateSubmissionId()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('gir ulike id-er', () => {
    expect(generateSubmissionId()).not.toBe(generateSubmissionId())
  })
})

describe('buildOrderPayload og validateOrderPayload', () => {
  it('bygger linjer fra oppsummeringen i rekkefølge', () => {
    const p = buildOrderPayload(values, items, SUB)
    expect(p.lines).toEqual([{ benefitId: B1, productId: P1 }])
    expect(p.submissionId).toBe(SUB)
  })

  it('gyldig skjema gir ingen feil (tomme valgfrie felt er ok)', () => {
    expect(validateOrderPayload(buildOrderPayload(values, items, SUB))).toBeNull()
  })

  it('gir feltfeil for navn, e-post og manglende samtykke', () => {
    const bad = buildOrderPayload({ ...values, name: '', email: 'x', consentShare: false }, items, SUB)
    const errors = validateOrderPayload(bad)
    expect(errors?.name).toBeTruthy()
    expect(errors?.email).toBeTruthy()
    expect(errors?.consentShare).toBeTruthy()
  })

  it('uten valgte fordeler gir feil på lines', () => {
    const errors = validateOrderPayload(buildOrderPayload(values, [], SUB))
    expect(errors?.lines).toBeTruthy()
  })
})

describe('postOrder', () => {
  it('201 gir ok og replay false, og sender JSON til riktig endepunkt', async () => {
    const fetchFn = vi.fn().mockResolvedValue(response(201, { orderId: 'o1' }))
    const r = await postOrder({ a: 1 }, fetchFn)
    expect(r).toEqual({ kind: 'ok', orderId: 'o1', replay: false })
    expect(fetchFn).toHaveBeenCalledWith('/api/flow/order', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ a: 1 }),
    })
  })

  it('200 gir ok og replay true', async () => {
    const r = await postOrder({}, vi.fn().mockResolvedValue(response(200, { orderId: 'o1' })))
    expect(r).toEqual({ kind: 'ok', orderId: 'o1', replay: true })
  })

  it('400 VALIDATION_ERROR gir feltfeil', async () => {
    const r = await postOrder(
      {},
      vi.fn().mockResolvedValue(response(400, { error: 'VALIDATION_ERROR', fields: { email: ['Ugyldig'] } }))
    )
    expect(r).toEqual({ kind: 'validation', fields: { email: ['Ugyldig'] } })
  })

  it('400 INVALID_LINES gir listen', async () => {
    const lines = [{ benefitId: 'b', productId: 'p', reason: 'benefit_not_in_flow' }]
    const r = await postOrder(
      {},
      vi.fn().mockResolvedValue(response(400, { error: 'INVALID_LINES', lines }))
    )
    expect(r).toEqual({ kind: 'invalid_lines', lines })
  })

  it('429 gir rate_limited med Retry-After', async () => {
    const r = await postOrder(
      {},
      vi.fn().mockResolvedValue(response(429, { error: 'RATE_LIMITED' }, { 'Retry-After': '120' }))
    )
    expect(r).toEqual({ kind: 'rate_limited', retryAfterSeconds: 120 })
  })

  it('429 uten gyldig Retry-After gir null', async () => {
    const r = await postOrder({}, vi.fn().mockResolvedValue(response(429, {})))
    expect(r).toEqual({ kind: 'rate_limited', retryAfterSeconds: null })
  })

  it('500 og uventet svar gir error', async () => {
    expect(await postOrder({}, vi.fn().mockResolvedValue(response(500, { error: 'INTERNAL_ERROR' })))).toEqual({
      kind: 'error',
    })
    expect(await postOrder({}, vi.fn().mockResolvedValue(response(201, { uten: 'orderId' })))).toEqual({
      kind: 'error',
    })
  })

  it('ugyldig JSON i svaret gir error', async () => {
    const r = await postOrder({}, vi.fn().mockResolvedValue(new Response('ikke json', { status: 502 })))
    expect(r).toEqual({ kind: 'error' })
  })

  it('nettverksfeil gir network', async () => {
    const r = await postOrder({}, vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    expect(r).toEqual({ kind: 'network' })
  })
})
