// CR-004: Admin login endpoint.
// CR-014: rate limiting (5 forsøk / 15 min per IP) lagt til.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { signAdminJWT, validateAdminCredentials, ADMIN_TOKEN_COOKIE } from '@/lib/admin/auth'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const LOGIN_RATE_LIMIT = 5
const LOGIN_RATE_WINDOW_SECONDS = 15 * 60

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rateLimit = await checkRateLimit(`login:${ip}`, LOGIN_RATE_LIMIT, LOGIN_RATE_WINDOW_SECONDS)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { message: 'For mange innloggingsforsøk. Prøv igjen senere.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
    )
  }

  const body: unknown = await request.json().catch(() => null)
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Ugyldig input' }, { status: 400 })
  }

  if (!validateAdminCredentials(parsed.data.email, parsed.data.password)) {
    return NextResponse.json({ message: 'Feil e-post eller passord' }, { status: 401 })
  }

  try {
    const token = await signAdminJWT({ email: parsed.data.email, role: 'admin' })

    const response = NextResponse.json({ ok: true })
    response.cookies.set(ADMIN_TOKEN_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 8,
      path: '/',
    })
    return response
  } catch (err) {
    console.error('[admin/auth/login POST] Uventet feil:', err)
    return NextResponse.json({ message: 'Noe gikk galt' }, { status: 500 })
  }
}
