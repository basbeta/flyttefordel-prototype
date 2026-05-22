// CR-004: Admin login endpoint.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { signAdminJWT, validateAdminCredentials, ADMIN_TOKEN_COOKIE } from '@/lib/admin/auth'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null)
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Ugyldig input' }, { status: 400 })
  }

  if (!validateAdminCredentials(parsed.data.email, parsed.data.password)) {
    return NextResponse.json({ message: 'Feil e-post eller passord' }, { status: 401 })
  }

  const token = await signAdminJWT({ email: parsed.data.email, role: 'admin' })

  const response = NextResponse.json({ ok: true })
  response.cookies.set(ADMIN_TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })
  return response
}
