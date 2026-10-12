// CR-025: Admin auth check for /api/admin routes. Middleware does NOT protect
// /api/admin, so every route must call this itself and return 401 when it is null.
// (Older routes define their own identical copy; they are left as they are.)

import type { NextRequest } from 'next/server'
import { verifyAdminJWT, ADMIN_TOKEN_COOKIE, type AdminPayload } from './auth'

export async function authCheck(request: NextRequest): Promise<AdminPayload | null> {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value
  if (!token) return null
  return verifyAdminJWT(token)
}
