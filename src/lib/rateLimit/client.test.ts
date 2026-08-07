// CR-014: unit tests for Redis config resolution and lazy client construction.
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { getRedisUrl, getRedisClient } from './client'

let originalUrl: string | undefined

beforeEach(() => {
  originalUrl = process.env.REDIS_URL
})

afterEach(() => {
  if (originalUrl === undefined) delete process.env.REDIS_URL
  else process.env.REDIS_URL = originalUrl
})

describe('getRedisUrl', () => {
  it('returns null when REDIS_URL is not set', () => {
    delete process.env.REDIS_URL
    expect(getRedisUrl()).toBeNull()
  })

  it('returns the URL when set', () => {
    process.env.REDIS_URL = 'redis://default:pw@localhost:6379'
    expect(getRedisUrl()).toBe('redis://default:pw@localhost:6379')
  })
})

describe('getRedisClient', () => {
  it('throws a clear error instead of constructing a client when not configured', () => {
    delete process.env.REDIS_URL
    expect(() => getRedisClient()).toThrow(/Redis.*ikke konfigurert/i)
  })
})
