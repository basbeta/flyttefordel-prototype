// CR-003: Anonymous session middleware.
// CR-004: Admin JWT protection added.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

export const ANON_ID_COOKIE = 'anon_id'
export const ANON_ID_HEADER = 'x-anon-id'
const ADMIN_TOKEN_COOKIE = 'admin_token'

function getAdminSecret() {
  const secret = process.env.ADMIN_JWT_SECRET ?? ''
  return new TextEncoder().encode(secret)
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
      await jwtVerify(token, getAdminSecret())
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

  const existing = request.cookies.get(ANON_ID_COOKIE)?.value
  const anonymousId = existing ?? crypto.randomUUID()

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(ANON_ID_HEADER, anonymousId)

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
