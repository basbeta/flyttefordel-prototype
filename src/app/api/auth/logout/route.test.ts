// CR-028: POST /api/auth/logout removes the person_token cookie.
import { describe, it, expect } from 'vitest'
import { POST } from './route'

describe('POST /api/auth/logout', () => {
  it('200 og tømmer person_token-cookien (maxAge 0)', async () => {
    const res = await POST()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    const cookie = res.headers.get('set-cookie') ?? ''
    expect(cookie).toContain('person_token=;')
    expect(cookie).toContain('Max-Age=0')
    expect(cookie.toLowerCase()).toContain('httponly')
  })
})
