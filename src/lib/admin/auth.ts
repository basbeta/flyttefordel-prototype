// CR-004: Admin JWT auth helpers.
// MIGRATION NOTE: Replace plaintext password comparison with bcrypt at MVP.
// Replace env-var credentials with AdminUser DB lookup + hashed password.

import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export const ADMIN_TOKEN_COOKIE = 'admin_token'
const COOKIE_MAX_AGE = 60 * 60 * 8 // 8 hours

function getSecret() {
  const secret = process.env.ADMIN_JWT_SECRET
  if (!secret) throw new Error('ADMIN_JWT_SECRET not set')
  return new TextEncoder().encode(secret)
}

export type AdminPayload = {
  email: string
  role: 'admin'
}

export async function signAdminJWT(payload: AdminPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(getSecret())
}

export async function verifyAdminJWT(token: string): Promise<AdminPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as unknown as AdminPayload
  } catch {
    return null
  }
}

export async function requireAdminAuth(): Promise<AdminPayload> {
  const token = cookies().get(ADMIN_TOKEN_COOKIE)?.value
  if (!token) redirect('/admin/login')
  const payload = await verifyAdminJWT(token)
  if (!payload) redirect('/admin/login')
  return payload
}

export function validateAdminCredentials(email: string, password: string): boolean {
  // DEMO-ONLY: plaintext comparison against env vars.
  // MVP: lookup AdminUser in DB, compare with bcrypt.hash.
  return (
    email === (process.env.ADMIN_EMAIL ?? 'admin@fordelsklubben.no') &&
    password === (process.env.ADMIN_PASSWORD ?? 'Admin123!')
  )
}
