// CR-004: Admin logout — clears JWT cookie.

import { NextResponse } from 'next/server'
import { ADMIN_TOKEN_COOKIE } from '@/lib/admin/auth'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.delete(ADMIN_TOKEN_COOKIE)
  return response
}
