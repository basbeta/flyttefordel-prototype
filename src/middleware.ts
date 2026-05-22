// CR-003: Anonymous session middleware.
// Ensures every request carries an anonymousId — set as a cookie (persisted to browser)
// and forwarded as x-anon-id in the request headers so Server Components can read it
// in the same request cycle without an extra round-trip.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const ANON_ID_COOKIE = 'anon_id'
export const ANON_ID_HEADER = 'x-anon-id'

export function middleware(request: NextRequest) {
  const existing = request.cookies.get(ANON_ID_COOKIE)?.value
  const anonymousId = existing ?? crypto.randomUUID()

  // Forward anonymousId in a request header so Server Components can read it
  // via headers() from next/headers — cookies() only reflects the incoming request.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(ANON_ID_HEADER, anonymousId)

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  if (!existing) {
    response.cookies.set(ANON_ID_COOKIE, anonymousId, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    })
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
