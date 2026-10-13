// CR-028: POST /api/auth/test-persons (create a new test person).
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/rateLimit', () => ({
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(() => '203.0.113.5'),
}))
const mockCreate = vi.fn()
vi.mock('@/lib/identity', () => ({
  getIdentityProvider: () => ({ createPerson: mockCreate }),
}))

import { checkRateLimit } from '@/lib/rateLimit'
import { POST } from './route'
import { NextRequest } from 'next/server'

const mockRate = checkRateLimit as unknown as ReturnType<typeof vi.fn>

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/auth/test-persons', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

let errorSpy: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  vi.clearAllMocks()
  mockRate.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 })
  mockCreate.mockResolvedValue({ id: 'p-new', name: 'Test Ny' })
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => errorSpy.mockRestore())

describe('POST /api/auth/test-persons', () => {
  it('429 med Retry-After når grensen er overskredet', async () => {
    mockRate.mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 600 })
    const res = await POST(makeRequest({ name: 'Test Ny', movingStatus: 'unknown' }))
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('600')
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('bruker rate-limit-nøkkel person-create:{ip}, 10 per time', async () => {
    await POST(makeRequest({ name: 'Test Ny', movingStatus: 'unknown' }))
    expect(mockRate).toHaveBeenCalledWith('person-create:203.0.113.5', 10, 3600)
  })

  it('400 ved ugyldig input, uten å opprette', async () => {
    expect((await POST(makeRequest({ movingStatus: 'unknown' }))).status).toBe(400)
    expect((await POST(makeRequest({ name: 'T', movingStatus: 'unknown', postcode: '12' }))).status).toBe(400)
    expect((await POST(makeRequest({ name: 'T', movingStatus: 'unknown', isTest: false }))).status).toBe(400)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('201 og sender normalisert input til provideren (tomme felt blir null)', async () => {
    const res = await POST(makeRequest({ name: ' Test Ny ', movingStatus: 'unknown', postcode: '', movedAt: '' }))
    expect(res.status).toBe(201)
    expect(mockCreate).toHaveBeenCalledWith({
      name: 'Test Ny',
      postcode: null,
      movingStatus: 'unknown',
      movedAt: null,
      fromAddress: null,
      toAddress: null,
      housingType: null,
    })
    expect(((await res.json()) as { person: { id: string } }).person.id).toBe('p-new')
  })

  it('oppretter ikke innlogging (ingen cookie)', async () => {
    const res = await POST(makeRequest({ name: 'Test Ny', movingStatus: 'unknown' }))
    expect(res.headers.get('set-cookie')).toBeNull()
  })

  it('500 ved uventet feil', async () => {
    mockCreate.mockRejectedValueOnce(new Error('db'))
    const res = await POST(makeRequest({ name: 'Test Ny', movingStatus: 'unknown' }))
    expect(res.status).toBe(500)
  })
})
