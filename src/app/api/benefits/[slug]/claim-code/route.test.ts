// CR-014: unit tests for rate limiting on POST /api/benefits/[slug]/claim-code.
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/rateLimit', () => ({
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(() => '203.0.113.5'),
}))

vi.mock('@/lib/db/client', () => ({
  prisma: {
    userSession: { findUnique: vi.fn() },
    benefit: { findFirst: vi.fn() },
  },
}))

vi.mock('@/lib/tracking/trackEvent', () => ({
  trackEvent: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/codes/claimCode', () => {
  class NoCodesAvailableError extends Error {}
  return {
    claimCode: vi.fn(),
    NoCodesAvailableError,
  }
})

vi.mock('@/lib/session', () => ({
  ANON_ID_HEADER: 'x-anon-id',
}))

import { checkRateLimit } from '@/lib/rateLimit'
import { prisma } from '@/lib/db/client'
import { claimCode, NoCodesAvailableError } from '@/lib/codes/claimCode'
import { ANON_ID_HEADER } from '@/lib/session'
import { POST } from './route'
import { NextRequest } from 'next/server'

const mockCheckRateLimit = checkRateLimit as unknown as ReturnType<typeof vi.fn>
const mockPrisma = prisma as unknown as {
  userSession: { findUnique: ReturnType<typeof vi.fn> }
  benefit: { findFirst: ReturnType<typeof vi.fn> }
}
const mockClaimCode = claimCode as unknown as ReturnType<typeof vi.fn>

function makeRequest(anonymousId: string | null) {
  return new NextRequest('http://localhost/api/benefits/test-slug/claim-code', {
    method: 'POST',
    headers: anonymousId ? { [ANON_ID_HEADER]: anonymousId } : {},
  })
}

const PARAMS = { params: Promise.resolve({ slug: 'test-slug' }) }

beforeEach(() => vi.clearAllMocks())

describe('POST /api/benefits/[slug]/claim-code', () => {
  it('returnerer 401 uten sesjon før rate-limit-sjekk (uendret oppførsel)', async () => {
    const res = await POST(makeRequest(null), PARAMS)
    expect(res.status).toBe(401)
    expect(mockCheckRateLimit).not.toHaveBeenCalled()
  })

  it('returnerer 429 med Retry-After når rate-grensen er overskredet', async () => {
    mockCheckRateLimit.mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 1800 })
    const res = await POST(makeRequest('anon-1'), PARAMS)
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('1800')
    expect(mockPrisma.userSession.findUnique).not.toHaveBeenCalled()
  })

  it('sjekker rate-grensen med nøkkel claim-code:{ip}, 20 forsøk / 3600 sekunder', async () => {
    mockCheckRateLimit.mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 60 })
    await POST(makeRequest('anon-1'), PARAMS)
    expect(mockCheckRateLimit).toHaveBeenCalledWith('claim-code:203.0.113.5', 20, 3600)
  })

  it('returnerer fortsatt 404 når fordelen ikke finnes, innenfor grensen (uendret oppførsel)', async () => {
    mockCheckRateLimit.mockResolvedValueOnce({ allowed: true, retryAfterSeconds: 0 })
    mockPrisma.userSession.findUnique.mockResolvedValueOnce({ id: 'session-1' })
    mockPrisma.benefit.findFirst.mockResolvedValueOnce(null)
    const res = await POST(makeRequest('anon-1'), PARAMS)
    expect(res.status).toBe(404)
  })

  it('returnerer fortsatt 410 når pool er tom, innenfor grensen (uendret oppførsel)', async () => {
    mockCheckRateLimit.mockResolvedValueOnce({ allowed: true, retryAfterSeconds: 0 })
    mockPrisma.userSession.findUnique.mockResolvedValueOnce({ id: 'session-1' })
    mockPrisma.benefit.findFirst.mockResolvedValueOnce({
      id: 'benefit-1',
      redemptionType: 'unique_code',
      redemption: { codePoolId: 'pool-1' },
    })
    mockClaimCode.mockRejectedValueOnce(new NoCodesAvailableError())
    const res = await POST(makeRequest('anon-1'), PARAMS)
    expect(res.status).toBe(410)
  })

  it('returnerer fortsatt 200 med kode ved vellykket claim, innenfor grensen (uendret oppførsel)', async () => {
    mockCheckRateLimit.mockResolvedValueOnce({ allowed: true, retryAfterSeconds: 0 })
    mockPrisma.userSession.findUnique.mockResolvedValueOnce({ id: 'session-1' })
    mockPrisma.benefit.findFirst.mockResolvedValueOnce({
      id: 'benefit-1',
      redemptionType: 'unique_code',
      redemption: { codePoolId: 'pool-1' },
    })
    mockClaimCode.mockResolvedValueOnce({ codeValue: 'ABC123', alreadyClaimed: false })
    const res = await POST(makeRequest('anon-1'), PARAMS)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.code).toBe('ABC123')
  })
})
