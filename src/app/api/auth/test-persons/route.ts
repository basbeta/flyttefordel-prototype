// CR-028: Create a new test person (open for everyone on /logg-inn, rate limited). Does not log
// in: the person is chosen afterwards via POST /api/auth/login (where the test e-mail is given).

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { getIdentityProvider } from '@/lib/identity'
import { newPersonSchema } from '@/lib/identity/schemas'
import { safeErrorLabel } from '@/lib/identity/safeErrorLabel'

// Guesses for the prototype.
const CREATE_RATE_LIMIT = 10
const CREATE_RATE_WINDOW_SECONDS = 60 * 60

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rateLimit = await checkRateLimit(`person-create:${ip}`, CREATE_RATE_LIMIT, CREATE_RATE_WINDOW_SECONDS)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { message: 'For mange nye testpersoner. Prøv igjen senere.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
    )
  }

  const body: unknown = await request.json().catch(() => null)
  const parsed = newPersonSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.errors[0]?.message ?? 'Ugyldig input' }, { status: 400 })
  }

  try {
    const person = await getIdentityProvider().createPerson(parsed.data)
    return NextResponse.json({ person }, { status: 201 })
  } catch (err) {
    console.error('[auth/test-persons POST] Uventet feil:', safeErrorLabel(err))
    return NextResponse.json({ message: 'Noe gikk galt' }, { status: 500 })
  }
}
