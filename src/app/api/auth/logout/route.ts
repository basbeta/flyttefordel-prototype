// CR-028: Log out (switch person). Removes the person_token cookie.

import { NextResponse } from 'next/server'
import { PERSON_TOKEN_COOKIE } from '@/lib/identity/token'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(PERSON_TOKEN_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/',
  })
  return response
}
