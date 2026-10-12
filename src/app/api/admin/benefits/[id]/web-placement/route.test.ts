// CR-025: admin API for web placement of a benefit.
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db/client', () => ({
  prisma: {
    benefit: { findFirst: vi.fn() },
    flowPage: { findFirst: vi.fn() },
    benefitView: { findUnique: vi.fn(), upsert: vi.fn() },
  },
}))
vi.mock('@/lib/admin/auth', () => ({
  ADMIN_TOKEN_COOKIE: 'admin_token',
  verifyAdminJWT: vi.fn(),
}))

import { prisma } from '@/lib/db/client'
import { verifyAdminJWT } from '@/lib/admin/auth'
import { PUT } from './route'

const mockPrisma = prisma as unknown as {
  benefit: Record<string, ReturnType<typeof vi.fn>>
  flowPage: Record<string, ReturnType<typeof vi.fn>>
  benefitView: Record<string, ReturnType<typeof vi.fn>>
}
const mockVerify = verifyAdminJWT as unknown as ReturnType<typeof vi.fn>

const PAGE_ID = '3b241101-e2bb-4255-8caf-4136c566a962'
const PARAMS = { params: Promise.resolve({ id: 'b1' }) }
const KEY = { benefitId_format_variant: { benefitId: 'b1', format: 'web_card', variant: 'standard' } }

function req(body?: unknown, cookie = true) {
  return new NextRequest('http://localhost/api/admin/benefits/b1/web-placement', {
    method: 'PUT',
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie: 'admin_token=valid' } : {}) },
  })
}

let errorSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  vi.clearAllMocks()
  mockVerify.mockResolvedValue({ email: 'admin@example.test' })
  mockPrisma.benefit.findFirst.mockResolvedValue({ id: 'b1' })
  mockPrisma.flowPage.findFirst.mockResolvedValue({ id: PAGE_ID })
  mockPrisma.benefitView.findUnique.mockResolvedValue(null)
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => errorSpy.mockRestore())

describe('PUT /api/admin/benefits/[id]/web-placement', () => {
  it('401 uten admin-cookie', async () => {
    expect((await PUT(req({ pageId: PAGE_ID }, false), PARAMS)).status).toBe(401)
    expect(mockPrisma.benefitView.upsert).not.toHaveBeenCalled()
  })

  it('oppretter web_card/standard-raden med side og rekkefølge', async () => {
    const res = await PUT(req({ pageId: PAGE_ID, sortOrder: 2 }), PARAMS)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ pageId: PAGE_ID, sortOrder: 2 })
    expect(mockPrisma.benefitView.upsert).toHaveBeenCalledWith({
      where: KEY,
      create: { benefitId: 'b1', format: 'web_card', variant: 'standard', pageId: PAGE_ID, sortOrder: 2 },
      update: { pageId: PAGE_ID, sortOrder: 2 },
    })
  })

  it('rekkefølge har default 0', async () => {
    await PUT(req({ pageId: PAGE_ID }), PARAMS)
    expect(mockPrisma.benefitView.upsert.mock.calls[0][0].update.sortOrder).toBe(0)
  })

  it('«Ikke i løpet» (pageId null) beholder raden og nuller siden', async () => {
    mockPrisma.benefitView.findUnique.mockResolvedValueOnce({ id: 'v1' })
    const res = await PUT(req({ pageId: null, sortOrder: 0 }), PARAMS)
    expect(res.status).toBe(200)
    expect(mockPrisma.benefitView.upsert.mock.calls[0][0].update).toEqual({ pageId: null, sortOrder: 0 })
    expect(mockPrisma.flowPage.findFirst).not.toHaveBeenCalled()
  })

  it('«Ikke i løpet» uten eksisterende rad oppretter ingen tom rad', async () => {
    const res = await PUT(req({ pageId: null }), PARAMS)
    expect(res.status).toBe(200)
    expect(mockPrisma.benefitView.upsert).not.toHaveBeenCalled()
  })

  it('404 for ukjent fordel', async () => {
    mockPrisma.benefit.findFirst.mockResolvedValueOnce(null)
    expect((await PUT(req({ pageId: PAGE_ID }), PARAMS)).status).toBe(404)
    expect(mockPrisma.benefitView.upsert).not.toHaveBeenCalled()
  })

  it('404 når siden ikke finnes eller er slettet', async () => {
    mockPrisma.flowPage.findFirst.mockResolvedValueOnce(null)
    const res = await PUT(req({ pageId: PAGE_ID }), PARAMS)
    expect(res.status).toBe(404)
    expect(mockPrisma.flowPage.findFirst.mock.calls[0][0].where).toEqual({ id: PAGE_ID, deletedAt: null })
    expect(mockPrisma.benefitView.upsert).not.toHaveBeenCalled()
  })

  it('400 for ugyldig side-id, manglende pageId, ugyldig rekkefølge og ugyldig JSON', async () => {
    expect((await PUT(req({ pageId: 'ikke-uuid' }), PARAMS)).status).toBe(400)
    expect((await PUT(req({}), PARAMS)).status).toBe(400)
    expect((await PUT(req({ pageId: PAGE_ID, sortOrder: 1.5 }), PARAMS)).status).toBe(400)
    const bad = new NextRequest('http://localhost/x', {
      method: 'PUT',
      body: '{ikke json',
      headers: { cookie: 'admin_token=valid' },
    })
    expect((await PUT(bad, PARAMS)).status).toBe(400)
    expect(mockPrisma.benefitView.upsert).not.toHaveBeenCalled()
  })

  it('500 ved databasefeil', async () => {
    mockPrisma.benefitView.upsert.mockRejectedValueOnce(new Error('db'))
    expect((await PUT(req({ pageId: PAGE_ID }), PARAMS)).status).toBe(500)
  })
})
