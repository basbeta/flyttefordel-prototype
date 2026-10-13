// CR-028: person token. The secret is shared with the admin token, so the role check is the
// security boundary.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { SignJWT } from 'jose'
import { signPersonToken, verifyPersonToken, getPersonIdFromRequest, PERSON_ID_HEADER } from './token'

const SECRET = 'test-secret-for-person-token'
const PERSON = '3f2b1c3e-8c58-4a0d-9d3e-111111111111'

async function adminToken(secret = SECRET) {
  return new SignJWT({ email: 'a@b.no', role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(secret))
}

let original: string | undefined
beforeEach(() => {
  original = process.env.ADMIN_JWT_SECRET
  process.env.ADMIN_JWT_SECRET = SECRET
})
afterEach(() => {
  if (original === undefined) delete process.env.ADMIN_JWT_SECRET
  else process.env.ADMIN_JWT_SECRET = original
})

describe('person token', () => {
  it('signerer og verifiserer en gyldig token og gir person-id', async () => {
    const token = await signPersonToken(PERSON)
    expect(await verifyPersonToken(token)).toBe(PERSON)
  })

  it('avviser manglende token', async () => {
    expect(await verifyPersonToken(undefined)).toBeNull()
    expect(await verifyPersonToken(null)).toBeNull()
    expect(await verifyPersonToken('')).toBeNull()
  })

  it('avviser en manipulert token', async () => {
    const token = await signPersonToken(PERSON)
    const tampered = `${token.slice(0, -2)}xx`
    expect(await verifyPersonToken(tampered)).toBeNull()
  })

  it('avviser en token signert med en annen hemmelighet', async () => {
    const token = await signPersonToken(PERSON)
    process.env.ADMIN_JWT_SECRET = 'a-different-secret'
    expect(await verifyPersonToken(token)).toBeNull()
  })

  it('avviser en utløpt token', async () => {
    const now = Math.floor(Date.now() / 1000)
    const expired = await new SignJWT({ role: 'person' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(PERSON)
      .setIssuedAt(now - 7200)
      .setExpirationTime(now - 3600)
      .sign(new TextEncoder().encode(SECRET))
    expect(await verifyPersonToken(expired)).toBeNull()
  })

  it('avviser en ADMIN-token (samme hemmelighet, feil rolle)', async () => {
    expect(await verifyPersonToken(await adminToken())).toBeNull()
  })

  it('avviser en token uten rolle eller uten subject', async () => {
    const key = new TextEncoder().encode(SECRET)
    const noRole = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(PERSON)
      .setExpirationTime('1h')
      .sign(key)
    const noSub = await new SignJWT({ role: 'person' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(key)
    expect(await verifyPersonToken(noRole)).toBeNull()
    expect(await verifyPersonToken(noSub)).toBeNull()
  })

  it('feiler lukket uten hemmelighet: kan ikke signere og verifiserer aldri', async () => {
    const token = await signPersonToken(PERSON)
    delete process.env.ADMIN_JWT_SECRET
    await expect(signPersonToken(PERSON)).rejects.toThrow('ADMIN_JWT_SECRET')
    expect(await verifyPersonToken(token)).toBeNull()
  })

  it('getPersonIdFromRequest leser x-person-id', () => {
    const withId = new Request('http://x', { headers: { [PERSON_ID_HEADER]: 'p1' } })
    expect(getPersonIdFromRequest(withId)).toBe('p1')
    expect(getPersonIdFromRequest(new Request('http://x'))).toBeNull()
  })
})
