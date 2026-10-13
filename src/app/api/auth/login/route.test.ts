// CR-028: POST /api/auth/login (simulated Vipps).
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/rateLimit', () => ({
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(() => '203.0.113.5'),
}))
const mockLogin = vi.fn()
vi.mock('@/lib/identity', () => ({
  getIdentityProvider: () => ({ login: mockLogin }),
}))
vi.mock('@/lib/identity/linkSession', () => ({ linkSessionToPerson: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/identity/token', () => ({
  PERSON_TOKEN_COOKIE: 'person_token',
  PERSON_COOKIE_MAX_AGE: 2592000,
  signPersonToken: vi.fn().mockResolvedValue('signed-person-token'),
}))

import { checkRateLimit } from '@/lib/rateLimit'
import { linkSessionToPerson } from '@/lib/identity/linkSession'
import { signPersonToken } from '@/lib/identity/token'
import { POST } from './route'
import { NextRequest } from 'next/server'

const mockRate = checkRateLimit as unknown as ReturnType<typeof vi.fn>
const ID = '3f2b1c3e-8c58-4a0d-9d3e-111111111111'
const PERSON = {
  id: ID,
  name: 'Test Nylig-Flyttet',
  email: 'qa@bas.no',
  postcode: '0150',
  movingStatus: 'recently_moved',
}

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...headers },
  })
}

let errorSpy: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  vi.clearAllMocks()
  mockRate.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 })
  mockLogin.mockResolvedValue(PERSON)
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => errorSpy.mockRestore())

describe('POST /api/auth/login', () => {
  it('429 med Retry-After, før noe annet', async () => {
    mockRate.mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 120 })
    const res = await POST(makeRequest({ personId: ID, email: 'qa@bas.no' }))
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('120')
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('bruker rate-limit-nøkkel person-login:{ip}', async () => {
    await POST(makeRequest({ personId: ID, email: 'qa@bas.no' }))
    expect(mockRate).toHaveBeenCalledWith('person-login:203.0.113.5', 30, 900)
  })

  it('400 ved ugyldig e-post, ugyldig person og ugyldig JSON, uten å logge inn', async () => {
    expect((await POST(makeRequest({ personId: ID, email: 'ikke-epost' }))).status).toBe(400)
    expect((await POST(makeRequest({ personId: 'x', email: 'qa@bas.no' }))).status).toBe(400)
    expect((await POST(makeRequest({}))).status).toBe(400)
    const bad = new NextRequest('http://localhost/api/auth/login', { method: 'POST', body: 'ikke json' })
    expect((await POST(bad)).status).toBe(400)
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('404 for ukjent person, og ingen cookie', async () => {
    mockLogin.mockResolvedValueOnce(null)
    const res = await POST(makeRequest({ personId: ID, email: 'qa@bas.no' }))
    expect(res.status).toBe(404)
    expect(res.headers.get('set-cookie')).toBeNull()
  })

  it('200: setter httpOnly person_token, kobler sesjonen og sender e-posten til provideren', async () => {
    const res = await POST(makeRequest({ personId: ID, email: '  qa@bas.no ' }, { 'x-anon-id': 'anon-1' }))
    expect(res.status).toBe(200)
    expect(mockLogin).toHaveBeenCalledWith({ personId: ID, email: 'qa@bas.no' })
    expect(signPersonToken).toHaveBeenCalledWith(ID)
    expect(linkSessionToPerson).toHaveBeenCalledWith('anon-1', PERSON)
    const cookie = res.headers.get('set-cookie') ?? ''
    expect(cookie).toContain('person_token=signed-person-token')
    expect(cookie.toLowerCase()).toContain('httponly')
    expect(cookie.toLowerCase()).toContain('samesite=lax')
    expect(((await res.json()) as { person: { id: string } }).person.id).toBe(ID)
  })

  it('kobler ikke sesjon når x-anon-id mangler, men logger fortsatt inn', async () => {
    const res = await POST(makeRequest({ personId: ID, email: 'qa@bas.no' }))
    expect(res.status).toBe(200)
    expect(linkSessionToPerson).not.toHaveBeenCalled()
  })

  it('500 uten å logge e-post eller person ved uventet feil, og uten cookie', async () => {
    mockLogin.mockRejectedValueOnce(new Error('db nede for qa@bas.no'))
    const res = await POST(makeRequest({ personId: ID, email: 'qa@bas.no' }))
    expect(res.status).toBe(500)
    expect(res.headers.get('set-cookie')).toBeNull()
    // Neither the error object nor its message is logged (it carried the e-mail here).
    expect(errorSpy).toHaveBeenCalled()
    const logged = JSON.stringify(errorSpy.mock.calls)
    expect(logged).not.toContain('qa@bas.no')
    expect(logged).not.toContain('db nede')
  })
})
