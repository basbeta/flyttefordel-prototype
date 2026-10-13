// CR-020: validation and pass-through on POST /api/track.
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/tracking/trackEvent', () => ({
  trackEvent: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/session', () => ({
  getSessionIdFromRequest: vi.fn().mockResolvedValue('session-1'),
}))

import { trackEvent } from '@/lib/tracking/trackEvent'
import { POST } from './route'

function makeRequest(body: unknown, raw = false) {
  return new Request('http://localhost/api/track', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ? (body as string) : JSON.stringify(body),
  })
}

beforeEach(() => vi.clearAllMocks())

describe('POST /api/track', () => {
  it('lagrer gyldig hendelse uten channel som app, med sessionId', async () => {
    const res = await POST(makeRequest({ eventType: 'code_copied', benefitId: 'b1' }))
    expect(res.status).toBe(200)
    expect(trackEvent).toHaveBeenCalledWith('code_copied', 'b1', undefined, {
      channel: 'app',
      viewId: null,
      testId: null,
      variant: null,
      sessionId: 'session-1',
      userId: null,
    })
  })

  it('sender channel, viewId, testId og variant videre', async () => {
    const res = await POST(
      makeRequest({
        eventType: 'benefit_opened',
        benefitId: 'b1',
        channel: 'web',
        viewId: ' hero ',
        testId: 't1',
        variant: 'B',
      })
    )
    expect(res.status).toBe(200)
    expect(trackEvent).toHaveBeenCalledWith('benefit_opened', 'b1', undefined, {
      channel: 'web',
      viewId: 'hero',
      testId: 't1',
      variant: 'B',
      sessionId: 'session-1',
      userId: null,
    })
  })

  it('CR-028: setter userId fra person-id som middleware la på forespørselen', async () => {
    const res = await POST(
      new Request('http://localhost/api/track', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-person-id': 'person-1' },
        body: JSON.stringify({ eventType: 'code_copied', benefitId: 'b1' }),
      })
    )
    expect(res.status).toBe(200)
    expect(trackEvent).toHaveBeenCalledWith(
      'code_copied',
      'b1',
      undefined,
      expect.objectContaining({ userId: 'person-1' })
    )
  })

  it('avviser manglende eventType med 400', async () => {
    const res = await POST(makeRequest({ benefitId: 'b1' }))
    expect(res.status).toBe(400)
    expect(trackEvent).not.toHaveBeenCalled()
  })

  it('avviser ukjent eventType med 400', async () => {
    const res = await POST(makeRequest({ eventType: 'benefit_veiwed' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('VALIDATION_ERROR')
    expect(trackEvent).not.toHaveBeenCalled()
  })

  it('avviser ukjent channel med 400', async () => {
    const res = await POST(makeRequest({ eventType: 'code_copied', channel: 'sms' }))
    expect(res.status).toBe(400)
    expect(trackEvent).not.toHaveBeenCalled()
  })

  it('avviser for lang viewId, testId og variant med 400', async () => {
    const long = 'x'.repeat(65)
    for (const field of ['viewId', 'testId', 'variant']) {
      const res = await POST(makeRequest({ eventType: 'code_copied', [field]: long }))
      expect(res.status).toBe(400)
    }
    expect(trackEvent).not.toHaveBeenCalled()
  })

  it('avviser ikke-streng i viewId med 400', async () => {
    const res = await POST(makeRequest({ eventType: 'code_copied', viewId: 5 }))
    expect(res.status).toBe(400)
  })

  it('returnerer 500 ved ugyldig JSON', async () => {
    const res = await POST(makeRequest('{ikke json', true))
    expect(res.status).toBe(500)
  })
})
