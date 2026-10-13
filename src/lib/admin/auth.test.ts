// CR-028: the admin and person tokens share ADMIN_JWT_SECRET, so verifyAdminJWT must check the
// role. A person token in the admin_token cookie must never open admin.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SignJWT } from 'jose'

vi.mock('next/headers', () => ({ cookies: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

import { signAdminJWT, verifyAdminJWT } from './auth'
import { signPersonToken } from '@/lib/identity/token'

const SECRET = 'test-secret-shared-by-admin-and-person'

let original: string | undefined
beforeEach(() => {
  original = process.env.ADMIN_JWT_SECRET
  process.env.ADMIN_JWT_SECRET = SECRET
})
afterEach(() => {
  if (original === undefined) delete process.env.ADMIN_JWT_SECRET
  else process.env.ADMIN_JWT_SECRET = original
})

describe('verifyAdminJWT (CR-028 role check)', () => {
  it('godtar en ekte admin-token', async () => {
    const token = await signAdminJWT({ email: 'a@bas.no', role: 'admin' })
    const payload = await verifyAdminJWT(token)
    expect(payload?.role).toBe('admin')
    expect(payload?.email).toBe('a@bas.no')
  })

  it('avviser en PERSON-token signert med samme hemmelighet', async () => {
    const personToken = await signPersonToken('3f2b1c3e-8c58-4a0d-9d3e-111111111111')
    expect(await verifyAdminJWT(personToken)).toBeNull()
  })

  it('avviser en token uten rolle', async () => {
    const noRole = await new SignJWT({ email: 'a@bas.no' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(SECRET))
    expect(await verifyAdminJWT(noRole)).toBeNull()
  })

  it('avviser en token med annen hemmelighet og en ødelagt token', async () => {
    const other = await new SignJWT({ role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode('another-secret'))
    expect(await verifyAdminJWT(other)).toBeNull()
    expect(await verifyAdminJWT('ikke-en-jwt')).toBeNull()
  })
})
