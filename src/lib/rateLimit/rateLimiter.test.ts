// CR-014: unit tests for checkRateLimit (fixed-window via mocked Redis client).
import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockRedis = {
  incr: vi.fn(),
  expire: vi.fn(),
  ttl: vi.fn(),
}

vi.mock('./client', () => ({
  getRedisClient: () => mockRedis,
}))

import { checkRateLimit } from './rateLimiter'

beforeEach(() => vi.clearAllMocks())

describe('checkRateLimit', () => {
  it('allows the request and sets an expiry on the first hit in the window', async () => {
    mockRedis.incr.mockResolvedValueOnce(1)
    const result = await checkRateLimit('login:1.2.3.4', 5, 900)
    expect(result).toEqual({ allowed: true, retryAfterSeconds: 0 })
    expect(mockRedis.expire).toHaveBeenCalledWith('login:1.2.3.4', 900)
  })

  it('allows the request when under the limit without resetting the expiry', async () => {
    mockRedis.incr.mockResolvedValueOnce(3)
    const result = await checkRateLimit('login:1.2.3.4', 5, 900)
    expect(result).toEqual({ allowed: true, retryAfterSeconds: 0 })
    expect(mockRedis.expire).not.toHaveBeenCalled()
  })

  it('allows the request exactly at the limit', async () => {
    mockRedis.incr.mockResolvedValueOnce(5)
    const result = await checkRateLimit('login:1.2.3.4', 5, 900)
    expect(result.allowed).toBe(true)
  })

  it('denies the request over the limit and returns the TTL as retryAfterSeconds', async () => {
    mockRedis.incr.mockResolvedValueOnce(6)
    mockRedis.ttl.mockResolvedValueOnce(420)
    const result = await checkRateLimit('login:1.2.3.4', 5, 900)
    expect(result).toEqual({ allowed: false, retryAfterSeconds: 420 })
  })

  it('falls back to the full window when TTL is unavailable (-1/-2)', async () => {
    mockRedis.incr.mockResolvedValueOnce(6)
    mockRedis.ttl.mockResolvedValueOnce(-1)
    const result = await checkRateLimit('login:1.2.3.4', 5, 900)
    expect(result).toEqual({ allowed: false, retryAfterSeconds: 900 })
  })

  it('fails open (allowed=true) when Redis throws', async () => {
    mockRedis.incr.mockRejectedValueOnce(new Error('ECONNREFUSED'))
    const result = await checkRateLimit('login:1.2.3.4', 5, 900)
    expect(result).toEqual({ allowed: true, retryAfterSeconds: 0 })
  })
})
