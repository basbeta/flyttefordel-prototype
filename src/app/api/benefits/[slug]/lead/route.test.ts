// CR-020: lead_submitted is logged with the caller's session id.
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  prisma: {
    benefit: { findFirst: vi.fn() },
    lead: { create: vi.fn() },
  },
}))
vi.mock('@/lib/tracking/trackEvent', () => ({
  trackEvent: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/session', () => ({
  getSessionIdFromRequest: vi.fn(),
}))

import { prisma } from '@/lib/db/client'
import { trackEvent } from '@/lib/tracking/trackEvent'
import { getSessionIdFromRequest } from '@/lib/session'
import { POST } from './route'

const mockPrisma = prisma as unknown as {
  benefit: { findFirst: ReturnType<typeof vi.fn> }
  lead: { create: ReturnType<typeof vi.fn> }
}
const mockGetSessionId = getSessionIdFromRequest as unknown as ReturnType<typeof vi.fn>

const PARAMS = { params: Promise.resolve({ slug: 'test-slug' }) }

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/benefits/test-slug/lead', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockPrisma.benefit.findFirst.mockResolvedValue({
    id: 'benefit-1',
    advertiserId: 'adv-1',
    consentText: null,
  })
  mockPrisma.lead.create.mockResolvedValue({})
})

describe('POST /api/benefits/[slug]/lead', () => {
  it('logger lead_submitted med sessionId', async () => {
    mockGetSessionId.mockResolvedValueOnce('session-1')
    const res = await POST(makeRequest({ consent: 'on', name: 'Test' }), PARAMS)
    expect(res.status).toBe(200)
    expect(trackEvent).toHaveBeenCalledWith('lead_submitted', 'benefit-1', undefined, {
      sessionId: 'session-1',
      userId: null,
    })
  })

  it('logger fortsatt hendelsen uten sesjon (sessionId null)', async () => {
    mockGetSessionId.mockResolvedValueOnce(null)
    const res = await POST(makeRequest({ consent: 'on' }), PARAMS)
    expect(res.status).toBe(200)
    expect(trackEvent).toHaveBeenCalledWith('lead_submitted', 'benefit-1', undefined, {
      sessionId: null,
      userId: null,
    })
  })

  it('avviser uten samtykke og logger ingen hendelse', async () => {
    const res = await POST(makeRequest({ name: 'Test' }), PARAMS)
    expect(res.status).toBe(400)
    expect(trackEvent).not.toHaveBeenCalled()
  })
})
