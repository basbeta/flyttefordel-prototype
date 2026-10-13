// CR-003: Anonymous session middleware.
// CR-004: Admin JWT protection added.
// CR-028: Login required for all consumer traffic (simulated Vipps, person_token cookie).

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { PERSON_ID_HEADER, PERSON_TOKEN_COOKIE, verifyPersonToken } from '@/lib/identity/token'
import { LOGIN_PATH, safeNext } from '@/lib/identity/safeNext'

export const ANON_ID_COOKIE = 'anon_id'
export const ANON_ID_HEADER = 'x-anon-id'
const ADMIN_TOKEN_COOKIE = 'admin_token'

function getAdminSecret() {
  const secret = process.env.ADMIN_JWT_SECRET ?? ''
  return new TextEncoder().encode(secret)
}

// Consumer paths that do not need a person login. Admin has its own auth (the /admin guard
// below, and per-route authCheck for /api/admin). The manifest is fetched without cookies.
function isLoginExempt(pathname: string): boolean {
  return (
    pathname === LOGIN_PATH ||
    pathname.startsWith(`${LOGIN_PATH}/`) ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/admin/') ||
    pathname === '/manifest.json'
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ---- Admin auth guard ----
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value
    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    try {
      const { payload } = await jwtVerify(token, getAdminSecret())
      // CR-028: the secret is shared with the person token, so the role MUST be checked.
      if (payload.role !== 'admin') throw new Error('not an admin token')
    } catch {
      const response = NextResponse.redirect(new URL('/admin/login', request.url))
      response.cookies.delete(ADMIN_TOKEN_COOKIE)
      return response
    }
  }

  // ---- Anonymous session (consumer app) ----
  if (pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  // ---- Person login (CR-028) ----
  const personToken = request.cookies.get(PERSON_TOKEN_COOKIE)?.value
  const personId = await verifyPersonToken(personToken)

  if (!personId && !isLoginExempt(pathname)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ message: 'Ikke innlogget' }, { status: 401 })
    }
    const url = new URL(LOGIN_PATH, request.url)
    const next = safeNext(`${pathname}${request.nextUrl.search}`)
    if (next !== '/') url.searchParams.set('next', next)
    const response = NextResponse.redirect(url)
    if (personToken) response.cookies.delete(PERSON_TOKEN_COOKIE)
    return response
  }

  const existing = request.cookies.get(ANON_ID_COOKIE)?.value
  const anonymousId = existing ?? crypto.randomUUID()

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(ANON_ID_HEADER, anonymousId)
  // Always drop a client-sent value; only the verified token may set it.
  requestHeaders.delete(PERSON_ID_HEADER)
  if (personId) requestHeaders.set(PERSON_ID_HEADER, personId)

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  if (!existing) {
    response.cookies.set(ANON_ID_COOKIE, anonymousId, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    })
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
