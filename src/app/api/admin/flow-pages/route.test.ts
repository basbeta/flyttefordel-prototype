// CR-025: admin API for pages in the web flow.
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db/client', () => ({
  prisma: {
    flowPage: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}))
vi.mock('@/lib/admin/auth', () => ({
  ADMIN_TOKEN_COOKIE: 'admin_token',
  verifyAdminJWT: vi.fn(),
}))
vi.mock('@/lib/queries/adminQueries', () => ({
  getAdminFlowPages: vi.fn(),
  getAdminFlowPageById: vi.fn(),
}))

import { prisma } from '@/lib/db/client'
import { verifyAdminJWT } from '@/lib/admin/auth'
import { getAdminFlowPageById, getAdminFlowPages } from '@/lib/queries/adminQueries'
import { GET, POST } from './route'
import { GET as GET_ONE, PATCH, DELETE } from './[id]/route'

const mockPrisma = prisma as unknown as { flowPage: Record<string, ReturnType<typeof vi.fn>> }
const mockVerify = verifyAdminJWT as unknown as ReturnType<typeof vi.fn>
const mockList = getAdminFlowPages as unknown as ReturnType<typeof vi.fn>
const mockById = getAdminFlowPageById as unknown as ReturnType<typeof vi.fn>

function req(method: string, body?: unknown, cookie = true) {
  return new NextRequest('http://localhost/api/admin/flow-pages', {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie: 'admin_token=valid' } : {}) },
  })
}

const ID = { params: Promise.resolve({ id: 'p1' }) }
let errorSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  vi.clearAllMocks()
  mockVerify.mockResolvedValue({ email: 'admin@example.test' })
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => errorSpy.mockRestore())

describe('auth på alle sideruter', () => {
  it('gir 401 uten cookie', async () => {
    expect((await GET(req('GET', undefined, false))).status).toBe(401)
    expect((await POST(req('POST', { name: 'x' }, false))).status).toBe(401)
    expect((await GET_ONE(req('GET', undefined, false), ID)).status).toBe(401)
    expect((await PATCH(req('PATCH', {}, false), ID)).status).toBe(401)
    expect((await DELETE(req('DELETE', undefined, false), ID)).status).toBe(401)
    expect(mockPrisma.flowPage.create).not.toHaveBeenCalled()
  })

  it('gir 401 med ugyldig token', async () => {
    mockVerify.mockResolvedValue(null)
    expect((await GET(req('GET'))).status).toBe(401)
    expect((await DELETE(req('DELETE'), ID)).status).toBe(401)
    expect(mockPrisma.flowPage.update).not.toHaveBeenCalled()
  })
})

describe('GET /api/admin/flow-pages', () => {
  it('returnerer listen', async () => {
    mockList.mockResolvedValueOnce([{ id: 'p1' }])
    const res = await GET(req('GET'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([{ id: 'p1' }])
  })

  it('500 med JSON ved feil', async () => {
    mockList.mockRejectedValueOnce(new Error('db'))
    const res = await GET(req('GET'))
    expect(res.status).toBe(500)
    expect((await res.json()).message).toBeTruthy()
  })
})

describe('POST /api/admin/flow-pages', () => {
  it('oppretter side med standardverdier (201)', async () => {
    mockPrisma.flowPage.create.mockResolvedValueOnce({ id: 'new' })
    const res = await POST(req('POST', { name: '  Til hjemmet  ' }))
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ id: 'new' })
    expect(mockPrisma.flowPage.create.mock.calls[0][0].data).toMatchObject({
      name: 'Til hjemmet',
      sortOrder: 0,
      isActive: true,
    })
  })

  it('400 uten navn, med for langt navn og med ugyldig bilde-URL', async () => {
    expect((await POST(req('POST', { name: '   ' }))).status).toBe(400)
    expect((await POST(req('POST', { name: 'a'.repeat(121) }))).status).toBe(400)
    expect((await POST(req('POST', { name: 'ok', imageUrl: 'javascript:alert(1)' }))).status).toBe(400)
    expect((await POST(req('POST', { name: 'ok', sortOrder: 1.5 }))).status).toBe(400)
    expect(mockPrisma.flowPage.create).not.toHaveBeenCalled()
  })

  it('godtar https-bilde og relativ bilde-URL', async () => {
    mockPrisma.flowPage.create.mockResolvedValue({ id: 'n' })
    expect((await POST(req('POST', { name: 'a', imageUrl: 'https://example.test/a.jpg' }))).status).toBe(201)
    expect((await POST(req('POST', { name: 'a', imageUrl: '/bilder/a.jpg' }))).status).toBe(201)
  })

  it('400 ved ugyldig JSON', async () => {
    const r = new NextRequest('http://localhost/api/admin/flow-pages', {
      method: 'POST',
      body: '{ikke json',
      headers: { cookie: 'admin_token=valid' },
    })
    expect((await POST(r)).status).toBe(400)
  })

  it('500 ved databasefeil', async () => {
    mockPrisma.flowPage.create.mockRejectedValueOnce(new Error('db'))
    expect((await POST(req('POST', { name: 'ok' }))).status).toBe(500)
  })
})

describe('/api/admin/flow-pages/[id]', () => {
  it('GET: 404 når siden ikke finnes, 200 når den finnes', async () => {
    mockById.mockResolvedValueOnce(null)
    expect((await GET_ONE(req('GET'), ID)).status).toBe(404)
    mockById.mockResolvedValueOnce({ id: 'p1', name: 'Side' })
    const res = await GET_ONE(req('GET'), ID)
    expect(res.status).toBe(200)
    expect((await res.json()).name).toBe('Side')
  })

  it('PATCH: 404 for ukjent side, delvis oppdatering for kjent', async () => {
    mockPrisma.flowPage.findFirst.mockResolvedValueOnce(null)
    expect((await PATCH(req('PATCH', { name: 'x' }), ID)).status).toBe(404)

    mockPrisma.flowPage.findFirst.mockResolvedValueOnce({ id: 'p1' })
    const res = await PATCH(req('PATCH', { isActive: false }), ID)
    expect(res.status).toBe(200)
    expect(mockPrisma.flowPage.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { isActive: false } })
  })

  it('PATCH: 400 ved ugyldig input, og rører ikke databasen', async () => {
    expect((await PATCH(req('PATCH', { name: '' }), ID)).status).toBe(400)
    expect(mockPrisma.flowPage.update).not.toHaveBeenCalled()
  })

  it('DELETE: soft delete (setter deletedAt, sletter ikke raden)', async () => {
    mockPrisma.flowPage.findFirst.mockResolvedValueOnce({ id: 'p1' })
    const res = await DELETE(req('DELETE'), ID)
    expect(res.status).toBe(204)
    const call = mockPrisma.flowPage.update.mock.calls[0][0]
    expect(call.where).toEqual({ id: 'p1' })
    expect(call.data.deletedAt).toBeInstanceOf(Date)
  })

  it('DELETE: 404 for ukjent eller allerede slettet side', async () => {
    mockPrisma.flowPage.findFirst.mockResolvedValueOnce(null)
    expect((await DELETE(req('DELETE'), ID)).status).toBe(404)
    expect(mockPrisma.flowPage.update).not.toHaveBeenCalled()
    expect(mockPrisma.flowPage.findFirst.mock.calls[0][0].where).toEqual({ id: 'p1', deletedAt: null })
  })

  it('500 ved databasefeil i PATCH og DELETE', async () => {
    mockPrisma.flowPage.findFirst.mockRejectedValue(new Error('db'))
    expect((await PATCH(req('PATCH', { name: 'x' }), ID)).status).toBe(500)
    expect((await DELETE(req('DELETE'), ID)).status).toBe(500)
  })
})
