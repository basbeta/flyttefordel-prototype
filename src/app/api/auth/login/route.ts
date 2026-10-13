// CR-028: Simulated Vipps login. The chosen test person + the QA test e-mail gives a signed
// person_token cookie. Rate limited per IP. The e-mail is personal data: never logged.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { getIdentityProvider } from '@/lib/identity'
import { loginSchema } from '@/lib/identity/schemas'
import { linkSessionToPerson } from '@/lib/identity/linkSession'
import { safeErrorLabel } from '@/lib/identity/safeErrorLabel'
import { PERSON_COOKIE_MAX_AGE, PERSON_TOKEN_COOKIE, signPersonToken } from '@/lib/identity/token'
import { ANON_ID_HEADER } from '@/lib/session'

// Guesses for the prototype: QA switches person often.
const LOGIN_RATE_LIMIT = 30
const LOGIN_RATE_WINDOW_SECONDS = 15 * 60

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rateLimit = await checkRateLimit(`person-login:${ip}`, LOGIN_RATE_LIMIT, LOGIN_RATE_WINDOW_SECONDS)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { message: 'For mange innloggingsforsøk. Prøv igjen senere.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
    )
  }

  const body: unknown = await request.json().catch(() => null)
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.errors[0]?.message ?? 'Ugyldig input' }, { status: 400 })
  }

  try {
    const person = await getIdentityProvider().login(parsed.data)
    if (!person) return NextResponse.json({ message: 'Ukjent person' }, { status: 404 })

    const anonymousId = request.headers.get(ANON_ID_HEADER)
    if (anonymousId) await linkSessionToPerson(anonymousId, person)

    const token = await signPersonToken(person.id)
    const response = NextResponse.json({ person })
    response.cookies.set(PERSON_TOKEN_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: PERSON_COOKIE_MAX_AGE,
      path: '/',
    })
    return response
  } catch (err) {
    // Never the error message: it can carry the e-mail (see safeErrorLabel).
    console.error('[auth/login POST] Uventet feil:', safeErrorLabel(err))
    return NextResponse.json({ message: 'Noe gikk galt' }, { status: 500 })
  }
}
