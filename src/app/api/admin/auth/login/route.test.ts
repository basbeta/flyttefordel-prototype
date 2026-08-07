// CR-014: unit tests for rate limiting on POST /api/admin/auth/login.
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/rateLimit', () => ({
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(() => '203.0.113.5'),
}))

vi.mock('@/lib/admin/auth', () => ({
  validateAdminCredentials: vi.fn(),
  signAdminJWT: vi.fn().mockResolvedValue('signed-token'),
  ADMIN_TOKEN_COOKIE: 'admin_token',
}))

import { checkRateLimit } from '@/lib/rateLimit'
import { validateAdminCredentials } from '@/lib/admin/auth'
import { POST } from './route'
import { NextRequest } from 'next/server'

const mockCheckRateLimit = checkRateLimit as unknown as ReturnType<typeof vi.fn>
const mockValidateAdminCredentials = validateAdminCredentials as unknown as ReturnType<typeof vi.fn>

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => vi.clearAllMocks())

describe('POST /api/admin/auth/login', () => {
  it('returnerer 429 med Retry-After når rate-grensen er overskredet, uten å sjekke passord', async () => {
    mockCheckRateLimit.mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 300 })
    const res = await POST(makeRequest({ email: 'a@b.no', password: 'x' }))
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('300')
    expect(mockValidateAdminCredentials).not.toHaveBeenCalled()
  })

  it('sjekker rate-grensen med nøkkel login:{ip}, 5 forsøk / 900 sekunder', async () => {
    mockCheckRateLimit.mockResolvedValueOnce({ allowed: true, retryAfterSeconds: 0 })
    mockValidateAdminCredentials.mockReturnValueOnce(false)
    await POST(makeRequest({ email: 'a@b.no', password: 'x' }))
    expect(mockCheckRateLimit).toHaveBeenCalledWith('login:203.0.113.5', 5, 900)
  })

  it('returnerer fortsatt 401 ved feil passord innenfor grensen (uendret oppførsel)', async () => {
    mockCheckRateLimit.mockResolvedValueOnce({ allowed: true, retryAfterSeconds: 0 })
    mockValidateAdminCredentials.mockReturnValueOnce(false)
    const res = await POST(makeRequest({ email: 'a@b.no', password: 'feil' }))
    expect(res.status).toBe(401)
  })

  it('returnerer fortsatt 200 med token ved riktig passord innenfor grensen (uendret oppførsel)', async () => {
    mockCheckRateLimit.mockResolvedValueOnce({ allowed: true, retryAfterSeconds: 0 })
    mockValidateAdminCredentials.mockReturnValueOnce(true)
    const res = await POST(makeRequest({ email: 'a@b.no', password: 'riktig' }))
    expect(res.status).toBe(200)
  })
})
