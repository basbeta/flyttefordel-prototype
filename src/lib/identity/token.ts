// CR-028: Person login token. A signed JWT (jose, HS256) in the httpOnly cookie person_token.
// Edge-safe (jose only, no next/headers or Prisma) so middleware can verify it.
//
// The secret is ADMIN_JWT_SECRET, shared with the admin token (bruker, 2026-10-13). That is only
// safe because BOTH sides check `role`: this file requires role === 'person', and the admin side
// (verifyAdminJWT and middleware) requires role === 'admin'. Never verify a token without
// checking the role. Missing secret fails closed: no token can be signed or verified.

import { SignJWT, jwtVerify } from 'jose'

export const PERSON_TOKEN_COOKIE = 'person_token'
// Set by middleware from the VERIFIED token (a client-sent value is always overwritten/removed).
export const PERSON_ID_HEADER = 'x-person-id'
// Route handlers: the verified person id that middleware put on the request (null = not logged in).
export function getPersonIdFromRequest(request: Request): string | null {
  return request.headers.get(PERSON_ID_HEADER)
}

export const PERSON_COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days, a guess for the prototype

function getSecret(): Uint8Array | null {
  const secret = process.env.ADMIN_JWT_SECRET
  if (!secret) return null
  return new TextEncoder().encode(secret)
}

export async function signPersonToken(personId: string): Promise<string> {
  const secret = getSecret()
  if (!secret) throw new Error('ADMIN_JWT_SECRET not set')
  return new SignJWT({ role: 'person' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(personId)
    .setIssuedAt()
    .setExpirationTime(`${PERSON_COOKIE_MAX_AGE}s`)
    .sign(secret)
}

// Returns the person id, or null for anything that is not a valid, unexpired person token
// (including an admin token, a tampered token, and a missing secret).
export async function verifyPersonToken(token: string | undefined | null): Promise<string | null> {
  if (!token) return null
  const secret = getSecret()
  if (!secret) return null
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] })
    if (payload.role !== 'person') return null
    return typeof payload.sub === 'string' && payload.sub !== '' ? payload.sub : null
  } catch {
    return null
  }
}
