// CR-007: Unit tests for kategori-API.
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db/client', () => ({
  prisma: {
    category: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/admin/auth', () => ({
  ADMIN_TOKEN_COOKIE: 'admin_token',
  verifyAdminJWT: vi.fn().mockResolvedValue({ email: 'admin@test.no' }),
}))

vi.mock('@/lib/queries/adminQueries', () => ({
  getAdminCategoriesFull: vi.fn().mockResolvedValue([]),
}))

import { prisma } from '@/lib/db/client'
import { POST } from './route'
import { PATCH, DELETE } from './[id]/route'

const mockPrisma = prisma as unknown as { category: Record<string, ReturnType<typeof vi.fn>> }

function makeRequest(method: string, body: unknown, url = 'http://localhost/api/admin/categories') {
  return new NextRequest(new Request(url, {
    method,
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', Cookie: 'admin_token=valid' },
  }))
}

beforeEach(() => vi.clearAllMocks())

describe('POST /api/admin/categories', () => {
  it('returnerer 409 ved duplikat slug', async () => {
    mockPrisma.category.findFirst.mockResolvedValueOnce({ id: 'existing', slug: 'mat' })

    const req = makeRequest('POST', { name: 'Mat', slug: 'mat', sortOrder: 0, isActive: true })
    const res = await POST(req)

    expect(res.status).toBe(409)
    const body = await res.json() as { message: string }
    expect(body.message).toMatch(/slug/i)
  })

  it('returnerer 400 ved ugyldig slug-format', async () => {
    const req = makeRequest('POST', { name: 'Test', slug: 'Ugyldig Slug!', sortOrder: 0, isActive: true })
    const res = await POST(req)

    expect(res.status).toBe(400)
  })

  it('oppretter kategori og returnerer 201', async () => {
    mockPrisma.category.findFirst.mockResolvedValueOnce(null)
    mockPrisma.category.create.mockResolvedValueOnce({ id: 'new-id' })

    const req = makeRequest('POST', { name: 'Bolig', slug: 'bolig', sortOrder: 1, isActive: true })
    const res = await POST(req)

    expect(res.status).toBe(201)
  })
})

describe('PATCH /api/admin/categories/[id]', () => {
  it('returnerer 404 for ukjent ID', async () => {
    mockPrisma.category.findFirst.mockResolvedValueOnce(null)

    const req = makeRequest('PATCH', { name: 'Ny tittel' }, 'http://localhost/api/admin/categories/ukjent-id')
    const res = await PATCH(req, { params: Promise.resolve({ id: 'ukjent-id' }) })

    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/admin/categories/[id]', () => {
  it('setter isActive = false, ikke hard delete', async () => {
    mockPrisma.category.findFirst.mockResolvedValueOnce({ id: 'cat-1', isActive: true })

    const req = makeRequest('DELETE', null, 'http://localhost/api/admin/categories/cat-1')
    const res = await DELETE(req, { params: Promise.resolve({ id: 'cat-1' }) })

    expect(res.status).toBe(200)
    expect(mockPrisma.category.update).toHaveBeenCalledWith({
      where: { id: 'cat-1' },
      data: { isActive: false },
    })
  })

  it('returnerer 404 for ukjent ID', async () => {
    mockPrisma.category.findFirst.mockResolvedValueOnce(null)

    const req = makeRequest('DELETE', null, 'http://localhost/api/admin/categories/ukjent')
    const res = await DELETE(req, { params: Promise.resolve({ id: 'ukjent' }) })

    expect(res.status).toBe(404)
  })
})
