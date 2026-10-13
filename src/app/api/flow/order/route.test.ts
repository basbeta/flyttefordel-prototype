// CR-024: POST /api/flow/order (rate limit, validation, idempotency, tracking, no PII in logs).
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/rateLimit', () => ({
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(() => '203.0.113.5'),
}))
vi.mock('@/lib/session', () => ({
  getOrCreateSession: vi.fn(),
}))
vi.mock('@/lib/tracking/trackEvent', () => ({
  trackEvent: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/orders', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/orders')>()
  return { ...actual, submitOrder: vi.fn() }
})

import { checkRateLimit } from '@/lib/rateLimit'
import { getOrCreateSession } from '@/lib/session'
import { trackEvent } from '@/lib/tracking/trackEvent'
import { InvalidOrderLinesError, submitOrder } from '@/lib/orders'
import { POST } from './route'
import { NextRequest } from 'next/server'

const mockRate = checkRateLimit as unknown as ReturnType<typeof vi.fn>
const mockSession = getOrCreateSession as unknown as ReturnType<typeof vi.fn>
const mockSubmit = submitOrder as unknown as ReturnType<typeof vi.fn>

const SUB = '3b241101-e2bb-4255-8caf-4136c566a962'
const B1 = '6ecd8c99-4036-403d-bf84-cf8400f67836'
const P1 = '16fd2706-8baf-433b-82eb-8c7fada847da'
const EMAIL = 'hemmelig.person@example.test'

function body(overrides: Record<string, unknown> = {}) {
  return {
    submissionId: SUB,
    name: 'Test Testesen',
    email: EMAIL,
    consentShare: true,
    lines: [{ benefitId: B1, productId: P1 }],
    ...overrides,
  }
}

function req(payload: unknown, raw = false) {
  return new NextRequest('http://localhost/api/flow/order', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ? (payload as string) : JSON.stringify(payload),
  })
}

let errorSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  vi.clearAllMocks()
  mockRate.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 })
  mockSession.mockResolvedValue({ sessionId: 'sess-1', postcode: '0150', movingStatus: 'unknown' })
  mockSubmit.mockResolvedValue({
    orderId: 'order-1',
    created: true,
    lines: [{ benefitId: B1, productId: P1, pageId: 's1', productName: 'Digital', benefitTitle: 'F' }],
  })
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => errorSpy.mockRestore())

describe('POST /api/flow/order', () => {
  it('429 med Retry-After når rate-grensen er overskredet, før noe annet', async () => {
    mockRate.mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 120 })
    const res = await POST(req(body()))
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('120')
    expect(mockSubmit).not.toHaveBeenCalled()
  })

  it('bruker nøkkel flow-order:{ip}, 10 per time', async () => {
    await POST(req(body()))
    expect(mockRate).toHaveBeenCalledWith('flow-order:203.0.113.5', 10, 3600)
  })

  it('400 ved ugyldig JSON', async () => {
    const res = await POST(req('{ikke json', true))
    expect(res.status).toBe(400)
    expect(mockSubmit).not.toHaveBeenCalled()
  })

  it('400 med feltfeil ved ugyldig input, uten å gjenta innsendte verdier', async () => {
    const res = await POST(req(body({ name: '', email: 'hemmelig-ugyldig' })))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('VALIDATION_ERROR')
    expect(json.fields.name).toBeTruthy()
    expect(json.fields.email).toBeTruthy()
    expect(JSON.stringify(json)).not.toContain('hemmelig')
    expect(mockSubmit).not.toHaveBeenCalled()
  })

  it('400 når delingssamtykke mangler', async () => {
    const res = await POST(req(body({ consentShare: false })))
    expect(res.status).toBe(400)
    expect((await res.json()).fields.consentShare).toBeTruthy()
  })

  it('201 med orderId og sender sesjon og targeting videre', async () => {
    const res = await POST(req(body()))
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ orderId: 'order-1' })
    expect(mockSubmit).toHaveBeenCalledTimes(1)
    const [, ctx] = mockSubmit.mock.calls[0]
    expect(ctx).toEqual({
      sessionId: 'sess-1',
      personId: null,
      targeting: { postcode: '0150', movingStatus: 'unknown' },
    })
  })

  it('logger benefit_selected per linje med channel web og sessionId etter vellykket ordre', async () => {
    await POST(req(body()))
    expect(trackEvent).toHaveBeenCalledTimes(1)
    expect(trackEvent).toHaveBeenCalledWith('benefit_selected', B1, undefined, {
      channel: 'web',
      viewId: 'web_card:standard',
      sessionId: 'sess-1',
      userId: null,
    })
  })

  it('CR-028: sender innlogget person videre til bestillingen og hendelsene', async () => {
    const request = new NextRequest('http://localhost/api/flow/order', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-person-id': 'person-1' },
      body: JSON.stringify(body()),
    })
    const res = await POST(request)
    expect(res.status).toBe(201)
    expect(mockSubmit.mock.calls[0][1]).toEqual(expect.objectContaining({ personId: 'person-1' }))
    expect(trackEvent).toHaveBeenCalledWith(
      'benefit_selected',
      B1,
      undefined,
      expect.objectContaining({ userId: 'person-1' })
    )
  })

  it('200 med samme orderId og ingen ny hendelse når submissionId er sendt før', async () => {
    mockSubmit.mockResolvedValueOnce({ orderId: 'order-1', created: false, lines: [] })
    const res = await POST(req(body()))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ orderId: 'order-1' })
    expect(trackEvent).not.toHaveBeenCalled()
  })

  it('400 INVALID_LINES med liste over ugyldige linjer', async () => {
    mockSubmit.mockRejectedValueOnce(
      new InvalidOrderLinesError([{ benefitId: B1, productId: P1, reason: 'benefit_not_in_flow' }])
    )
    const res = await POST(req(body()))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('INVALID_LINES')
    expect(json.lines).toEqual([{ benefitId: B1, productId: P1, reason: 'benefit_not_in_flow' }])
    expect(trackEvent).not.toHaveBeenCalled()
  })

  it('en feil i tracking påvirker ikke svaret', async () => {
    ;(trackEvent as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('tracking nede'))
    const res = await POST(req(body()))
    expect(res.status).toBe(201)
  })

  it('uten sesjon sendes sessionId og targeting som null', async () => {
    mockSession.mockResolvedValueOnce(null)
    await POST(req(body()))
    expect(mockSubmit.mock.calls[0][1]).toEqual({ sessionId: null, personId: null, targeting: null })
  })

  it('500 ved uventet feil, og persondata havner aldri i loggen', async () => {
    const leaky = new Error(`Unique constraint failed for ${EMAIL}`)
    ;(leaky as unknown as { code: string }).code = 'P9999'
    mockSubmit.mockRejectedValueOnce(leaky)
    const res = await POST(req(body()))
    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('INTERNAL_ERROR')
    expect(errorSpy).toHaveBeenCalled()
    const logged = JSON.stringify(errorSpy.mock.calls)
    expect(logged).not.toContain(EMAIL)
    expect(logged).not.toContain('Test Testesen')
    expect(logged).toContain('P9999')
  })
})
