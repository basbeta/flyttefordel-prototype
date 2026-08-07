// CR-014: unit tests for getClientIp header fallback chain.
import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { getClientIp } from './getClientIp'

function makeRequest(headers: Record<string, string>) {
  return new NextRequest('http://localhost/api/test', { headers })
}

describe('getClientIp', () => {
  it('reads the first IP from a comma-separated x-forwarded-for', () => {
    const request = makeRequest({ 'x-forwarded-for': '203.0.113.5, 10.0.0.1, 10.0.0.2' })
    expect(getClientIp(request)).toBe('203.0.113.5')
  })

  it('trims whitespace around the first x-forwarded-for entry', () => {
    const request = makeRequest({ 'x-forwarded-for': '  203.0.113.5  ,10.0.0.1' })
    expect(getClientIp(request)).toBe('203.0.113.5')
  })

  it('falls back to x-real-ip when x-forwarded-for is absent', () => {
    const request = makeRequest({ 'x-real-ip': '198.51.100.7' })
    expect(getClientIp(request)).toBe('198.51.100.7')
  })

  it('falls back to "unknown" when neither header is present', () => {
    const request = makeRequest({})
    expect(getClientIp(request)).toBe('unknown')
  })
})
