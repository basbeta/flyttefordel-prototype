// CR-012: Admin — last opp bilde til S3-kompatibel storage.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyAdminJWT, ADMIN_TOKEN_COOKIE } from '@/lib/admin/auth'
import { validateImage, uploadImage } from '@/lib/storage'

async function authCheck(request: NextRequest) {
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value
  if (!token) return null
  return verifyAdminJWT(token)
}

export async function POST(request: NextRequest) {
  if (!await authCheck(request)) return NextResponse.json({ message: 'Ikke autentisert' }, { status: 401 })

  const formData = await request.formData().catch(() => null)
  const file = formData?.get('file')
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ message: 'Ingen fil mottatt' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const validation = validateImage(buffer)
  if (!validation.valid) {
    return NextResponse.json({ message: validation.error }, { status: 400 })
  }

  try {
    const { url } = await uploadImage(buffer, validation.contentType)
    return NextResponse.json({ url }, { status: 201 })
  } catch (err) {
    console.error('[admin/upload POST] Uventet feil:', err)
    return NextResponse.json({ message: 'Opplasting feilet' }, { status: 500 })
  }
}
