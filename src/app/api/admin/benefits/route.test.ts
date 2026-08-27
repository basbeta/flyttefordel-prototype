// CR-017: unit tests for sperre mot å opprette Aktiv/Planlagt fordeler
// med manglende påkrevd redemption-innhold.
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  prisma: {
    benefit: { create: vi.fn().mockResolvedValue({ id: 'new-id' }) },
  },
}))

vi.mock('@/lib/admin/auth', () => ({
  verifyAdminJWT: vi.fn().mockResolvedValue({ email: 'admin@example.com' }),
  ADMIN_TOKEN_COOKIE: 'admin_token',
}))

import { prisma } from '@/lib/db/client'
import { POST } from './route'
import { NextRequest } from 'next/server'

const mockCreate = (prisma as unknown as { benefit: { create: ReturnType<typeof vi.fn> } }).benefit.create

const ADVERTISER_ID = '11111111-1111-1111-1111-111111111111'
const CATEGORY_ID = '22222222-2222-2222-2222-222222222222'

function baseBody(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Test',
    slug: 'test',
    shortDescription: 'Kort',
    longDescription: 'Lang',
    advertiserId: ADVERTISER_ID,
    categoryId: CATEGORY_ID,
    redemptionType: 'generic_code',
    status: 'draft',
    ...overrides,
  }
}

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/admin/benefits', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', cookie: 'admin_token=valid' },
  })
}

beforeEach(() => vi.clearAllMocks())

describe('POST /api/admin/benefits — CR-017 sperre', () => {
  it('tillater draft uten redemption-innhold (sperren gjelder kun active/scheduled)', async () => {
    const res = await POST(makeRequest(baseBody({ status: 'draft' })))
    expect(res.status).toBe(201)
    expect(mockCreate).toHaveBeenCalled()
  })

  it('blokkerer active med generic_code men uten kode', async () => {
    const res = await POST(makeRequest(baseBody({ status: 'active', redemptionType: 'generic_code' })))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.message).toContain('Mangler rabattkode')
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('tillater active med generic_code når koden er satt', async () => {
    const res = await POST(makeRequest(baseBody({
      status: 'active',
      redemptionType: 'generic_code',
      redemption: { genericCode: 'FLYTT20' },
    })))
    expect(res.status).toBe(201)
    expect(mockCreate).toHaveBeenCalled()
  })

  it('blokkerer scheduled på samme måte som active', async () => {
    const res = await POST(makeRequest(baseBody({ status: 'scheduled', redemptionType: 'generic_code' })))
    expect(res.status).toBe(400)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('blokkerer alltid unique_code ved opprettelse (kodepool kan ikke kobles til her)', async () => {
    const res = await POST(makeRequest(baseBody({ status: 'active', redemptionType: 'unique_code' })))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.message).toContain('Mangler koblet kodepool')
  })

  it('tillater active med info_only uten noe redemption-innhold', async () => {
    const res = await POST(makeRequest(baseBody({ status: 'active', redemptionType: 'info_only' })))
    expect(res.status).toBe(201)
    expect(mockCreate).toHaveBeenCalled()
  })
})
