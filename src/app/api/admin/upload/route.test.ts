// CR-012: Unit tests for bildeopplastings-API.
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/admin/auth', () => ({
  ADMIN_TOKEN_COOKIE: 'admin_token',
  verifyAdminJWT: vi.fn().mockResolvedValue({ email: 'admin@test.no' }),
}))

vi.mock('@/lib/storage', () => ({
  validateImage: vi.fn(),
  uploadImage: vi.fn(),
}))

import { verifyAdminJWT } from '@/lib/admin/auth'
import { validateImage, uploadImage } from '@/lib/storage'
import { POST } from './route'

const mockVerify = verifyAdminJWT as unknown as ReturnType<typeof vi.fn>
const mockValidate = validateImage as unknown as ReturnType<typeof vi.fn>
const mockUpload = uploadImage as unknown as ReturnType<typeof vi.fn>

function makeRequest(opts: { withAuthCookie?: boolean; includeFile?: boolean } = {}) {
  const { withAuthCookie = true, includeFile = true } = opts

  const formData = new FormData()
  if (includeFile) {
    formData.set('file', new Blob(['fake-image-bytes'], { type: 'image/jpeg' }), 'test.jpg')
  }

  const headers: Record<string, string> = {}
  if (withAuthCookie) headers.Cookie = 'admin_token=valid'

  return new NextRequest(
    new Request('http://localhost/api/admin/upload', { method: 'POST', body: formData, headers })
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockVerify.mockResolvedValue({ email: 'admin@test.no' })
})

describe('POST /api/admin/upload', () => {
  it('returnerer 401 uten admin-auth', async () => {
    const res = await POST(makeRequest({ withAuthCookie: false }))
    expect(res.status).toBe(401)
  })

  it('returnerer 400 når ingen fil er sendt', async () => {
    const res = await POST(makeRequest({ includeFile: false }))
    expect(res.status).toBe(400)
  })

  it('returnerer 400 når filvalidering feiler', async () => {
    mockValidate.mockReturnValue({ valid: false, error: 'Ukjent eller ikke-tillatt filtype' })

    const res = await POST(makeRequest())

    expect(res.status).toBe(400)
    const body = (await res.json()) as { message: string }
    expect(body.message).toBe('Ukjent eller ikke-tillatt filtype')
    expect(mockUpload).not.toHaveBeenCalled()
  })

  it('returnerer 201 med URL ved gyldig opplasting', async () => {
    mockValidate.mockReturnValue({ valid: true, contentType: 'image/jpeg' })
    mockUpload.mockResolvedValue({ url: 'https://fsn1.your-objectstorage.com/basbeta-pub-object-storage/abc.jpg' })

    const res = await POST(makeRequest())

    expect(res.status).toBe(201)
    const body = (await res.json()) as { url: string }
    expect(body.url).toBe('https://fsn1.your-objectstorage.com/basbeta-pub-object-storage/abc.jpg')
  })

  it('returnerer JSON 500-feilrespons hvis opplasting kaster', async () => {
    mockValidate.mockReturnValue({ valid: true, contentType: 'image/jpeg' })
    mockUpload.mockRejectedValue(new Error('S3 nede'))

    const res = await POST(makeRequest())

    expect(res.status).toBe(500)
    const body = (await res.json()) as { message: string }
    expect(body.message).toBeDefined()
  })
})
