// CR-011: unit tests for the connect_timeout/socket_timeout URL helper.
// Long-running containers (unlike Vercel) never kill a hung DB connection
// themselves, so these params must always end up on the connection string.

import { describe, expect, it } from 'vitest'
import { withConnectionTimeouts } from './client'

describe('withConnectionTimeouts', () => {
  it('adds connect_timeout and socket_timeout when absent', () => {
    const result = withConnectionTimeouts('postgresql://user:pass@host:5432/db')
    const url = new URL(result)
    expect(url.searchParams.get('connect_timeout')).toBe('10')
    expect(url.searchParams.get('socket_timeout')).toBe('10')
  })

  it('does not override an existing connect_timeout or socket_timeout', () => {
    const result = withConnectionTimeouts(
      'postgresql://user:pass@host:5432/db?connect_timeout=30&socket_timeout=5'
    )
    const url = new URL(result)
    expect(url.searchParams.get('connect_timeout')).toBe('30')
    expect(url.searchParams.get('socket_timeout')).toBe('5')
  })

  it('preserves other existing query params', () => {
    const result = withConnectionTimeouts('postgresql://user:pass@host:5432/db?pgbouncer=true')
    const url = new URL(result)
    expect(url.searchParams.get('pgbouncer')).toBe('true')
    expect(url.searchParams.get('connect_timeout')).toBe('10')
  })

  it('returns the input unchanged if it is not a valid URL', () => {
    expect(withConnectionTimeouts('not-a-valid-url')).toBe('not-a-valid-url')
  })
})
