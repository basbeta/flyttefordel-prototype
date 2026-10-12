// CR-025: admin API for products on a benefit.
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db/client', () => ({
  prisma: {
    benefit: { findFirst: vi.fn() },
    product: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}))
vi.mock('@/lib/admin/auth', () => ({
  ADMIN_TOKEN_COOKIE: 'admin_token',
  verifyAdminJWT: vi.fn(),
}))
vi.mock('@/lib/queries/adminQueries', () => ({
  getAdminBenefitProducts: vi.fn(),
}))

import { prisma } from '@/lib/db/client'
import { verifyAdminJWT } from '@/lib/admin/auth'
import { getAdminBenefitProducts } from '@/lib/queries/adminQueries'
import { GET, POST } from './route'
import { PATCH, DELETE } from './[productId]/route'

const mockPrisma = prisma as unknown as {
  benefit: Record<string, ReturnType<typeof vi.fn>>
  product: Record<string, ReturnType<typeof vi.fn>>
}
const mockVerify = verifyAdminJWT as unknown as ReturnType<typeof vi.fn>
const mockList = getAdminBenefitProducts as unknown as ReturnType<typeof vi.fn>

function req(method: string, body?: unknown, cookie = true) {
  return new NextRequest('http://localhost/api/admin/benefits/b1/products', {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie: 'admin_token=valid' } : {}) },
  })
}

const BENEFIT = { params: Promise.resolve({ id: 'b1' }) }
const PRODUCT = { params: Promise.resolve({ id: 'b1', productId: 'pr1' }) }
let errorSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  vi.clearAllMocks()
  mockVerify.mockResolvedValue({ email: 'admin@example.test' })
  mockPrisma.benefit.findFirst.mockResolvedValue({ id: 'b1' })
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => errorSpy.mockRestore())

describe('auth på alle produktruter', () => {
  it('gir 401 uten cookie og rører ikke databasen', async () => {
    expect((await GET(req('GET', undefined, false), BENEFIT)).status).toBe(401)
    expect((await POST(req('POST', { name: 'x' }, false), BENEFIT)).status).toBe(401)
    expect((await PATCH(req('PATCH', {}, false), PRODUCT)).status).toBe(401)
    expect((await DELETE(req('DELETE', undefined, false), PRODUCT)).status).toBe(401)
    expect(mockPrisma.product.create).not.toHaveBeenCalled()
    expect(mockPrisma.product.update).not.toHaveBeenCalled()
  })
})

describe('GET /api/admin/benefits/[id]/products', () => {
  it('404 når fordelen ikke finnes', async () => {
    mockPrisma.benefit.findFirst.mockResolvedValueOnce(null)
    expect((await GET(req('GET'), BENEFIT)).status).toBe(404)
  })

  it('200 med liste', async () => {
    mockList.mockResolvedValueOnce([{ id: 'pr1' }])
    const res = await GET(req('GET'), BENEFIT)
    expect(res.status).toBe(200)
    expect(mockList).toHaveBeenCalledWith('b1')
  })
})

describe('POST /api/admin/benefits/[id]/products', () => {
  it('oppretter produkt koblet til fordelen i URL-en (201)', async () => {
    mockPrisma.product.create.mockResolvedValueOnce({ id: 'new' })
    const res = await POST(req('POST', { name: 'Digital', priceText: '149 kr/mnd' }), BENEFIT)
    expect(res.status).toBe(201)
    expect(mockPrisma.product.create.mock.calls[0][0].data).toMatchObject({
      benefitId: 'b1',
      name: 'Digital',
      priceText: '149 kr/mnd',
      sortOrder: 0,
      isActive: true,
    })
  })

  it('kan ikke sette benefitId via body (tvinges fra URL)', async () => {
    mockPrisma.product.create.mockResolvedValueOnce({ id: 'new' })
    await POST(req('POST', { name: 'X', benefitId: 'annen-fordel' }), BENEFIT)
    expect(mockPrisma.product.create.mock.calls[0][0].data.benefitId).toBe('b1')
  })

  it('404 for ukjent fordel, 400 for ugyldig input', async () => {
    mockPrisma.benefit.findFirst.mockResolvedValueOnce(null)
    expect((await POST(req('POST', { name: 'X' }), BENEFIT)).status).toBe(404)
    expect((await POST(req('POST', { name: '' }), BENEFIT)).status).toBe(400)
    expect((await POST(req('POST', { name: 'a'.repeat(121) }), BENEFIT)).status).toBe(400)
    expect((await POST(req('POST', { name: 'ok', priceText: 'x'.repeat(81) }), BENEFIT)).status).toBe(400)
    expect(mockPrisma.product.create).not.toHaveBeenCalled()
  })

  it('500 ved databasefeil', async () => {
    mockPrisma.product.create.mockRejectedValueOnce(new Error('db'))
    expect((await POST(req('POST', { name: 'ok' }), BENEFIT)).status).toBe(500)
  })
})

describe('PATCH og DELETE /api/admin/benefits/[id]/products/[productId]', () => {
  it('slår opp produktet innenfor fordelen i URL-en, og ikke slettede', async () => {
    mockPrisma.product.findFirst.mockResolvedValueOnce({ id: 'pr1' })
    await PATCH(req('PATCH', { name: 'Ny' }), PRODUCT)
    expect(mockPrisma.product.findFirst.mock.calls[0][0].where).toEqual({
      id: 'pr1',
      benefitId: 'b1',
      deletedAt: null,
    })
  })

  it('404 når produktet ikke tilhører fordelen (ingen endring)', async () => {
    mockPrisma.product.findFirst.mockResolvedValue(null)
    expect((await PATCH(req('PATCH', { name: 'Ny' }), PRODUCT)).status).toBe(404)
    expect((await DELETE(req('DELETE'), PRODUCT)).status).toBe(404)
    expect(mockPrisma.product.update).not.toHaveBeenCalled()
  })

  it('PATCH oppdaterer delvis', async () => {
    mockPrisma.product.findFirst.mockResolvedValueOnce({ id: 'pr1' })
    const res = await PATCH(req('PATCH', { isActive: false, sortOrder: 3 }), PRODUCT)
    expect(res.status).toBe(200)
    expect(mockPrisma.product.update).toHaveBeenCalledWith({
      where: { id: 'pr1' },
      data: { isActive: false, sortOrder: 3 },
    })
  })

  it('PATCH gir 400 for ugyldig input', async () => {
    expect((await PATCH(req('PATCH', { name: '' }), PRODUCT)).status).toBe(400)
    expect((await PATCH(req('PATCH', { sortOrder: 'x' }), PRODUCT)).status).toBe(400)
  })

  it('DELETE er soft delete (deletedAt), siden ordrelinjer refererer produktet', async () => {
    mockPrisma.product.findFirst.mockResolvedValueOnce({ id: 'pr1' })
    const res = await DELETE(req('DELETE'), PRODUCT)
    expect(res.status).toBe(204)
    const call = mockPrisma.product.update.mock.calls[0][0]
    expect(call.where).toEqual({ id: 'pr1' })
    expect(call.data.deletedAt).toBeInstanceOf(Date)
  })

  it('500 ved databasefeil', async () => {
    mockPrisma.product.findFirst.mockRejectedValue(new Error('db'))
    expect((await PATCH(req('PATCH', { name: 'x' }), PRODUCT)).status).toBe(500)
    expect((await DELETE(req('DELETE'), PRODUCT)).status).toBe(500)
  })
})
