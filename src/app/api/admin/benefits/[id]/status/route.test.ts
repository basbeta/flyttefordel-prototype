// CR-017: unit tests for sperre mot å sette Aktiv/Planlagt på en fordel
// med manglende påkrevd redemption-innhold, via hurtigknappene.
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  prisma: {
    benefit: { findFirst: vi.fn(), update: vi.fn().mockResolvedValue({}) },
  },
}))

vi.mock('@/lib/admin/auth', () => ({
  verifyAdminJWT: vi.fn().mockResolvedValue({ email: 'admin@example.com' }),
  ADMIN_TOKEN_COOKIE: 'admin_token',
}))

import { prisma } from '@/lib/db/client'
import { PATCH } from './route'
import { NextRequest } from 'next/server'

const mockPrisma = prisma as unknown as {
  benefit: { findFirst: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> }
}

function makeRequest(status: string) {
  return new NextRequest('http://localhost/api/admin/benefits/b1/status', {
    method: 'PATCH',
    body: JSON.stringify({ status }),
    headers: { 'content-type': 'application/json', cookie: 'admin_token=valid' },
  })
}

const PARAMS = { params: Promise.resolve({ id: 'b1' }) }

beforeEach(() => vi.clearAllMocks())

describe('PATCH /api/admin/benefits/[id]/status — CR-017 sperre', () => {
  it('blokkerer aktivering når rabattkode mangler', async () => {
    mockPrisma.benefit.findFirst.mockResolvedValueOnce({
      id: 'b1', status: 'draft', redemptionType: 'generic_code',
      startsAt: null, endsAt: null,
      redemption: { genericCode: null, externalUrl: null, qrValue: null, codePoolId: null, leadFormId: null, codePool: null },
    })

    const res = await PATCH(makeRequest('active'), PARAMS)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.message).toContain('Mangler rabattkode')
    expect(mockPrisma.benefit.update).not.toHaveBeenCalled()
  })

  it('tillater aktivering når rabattkoden er satt', async () => {
    mockPrisma.benefit.findFirst.mockResolvedValueOnce({
      id: 'b1', status: 'draft', redemptionType: 'generic_code',
      startsAt: null, endsAt: null,
      redemption: { genericCode: 'FLYTT20', externalUrl: null, qrValue: null, codePoolId: null, leadFormId: null, codePool: null },
    })

    const res = await PATCH(makeRequest('active'), PARAMS)
    expect(res.status).toBe(200)
    expect(mockPrisma.benefit.update).toHaveBeenCalledWith({ where: { id: 'b1' }, data: { status: 'active' } })
  })

  it('blokkerer scheduled på samme grunnlag som active', async () => {
    mockPrisma.benefit.findFirst.mockResolvedValueOnce({
      id: 'b1', status: 'draft', redemptionType: 'unique_code',
      startsAt: null, endsAt: null,
      redemption: { genericCode: null, externalUrl: null, qrValue: null, codePoolId: 'pool-1', leadFormId: null, codePool: { availableCodes: 0 } },
    })

    const res = await PATCH(makeRequest('scheduled'), PARAMS)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.message).toContain('Kodepool er tom')
  })

  it('sperren gjelder ikke overganger til draft/paused/archived', async () => {
    mockPrisma.benefit.findFirst.mockResolvedValueOnce({
      id: 'b1', status: 'active', redemptionType: 'generic_code',
      startsAt: null, endsAt: null,
      redemption: { genericCode: null, externalUrl: null, qrValue: null, codePoolId: null, leadFormId: null, codePool: null },
    })

    const res = await PATCH(makeRequest('paused'), PARAMS)
    expect(res.status).toBe(200)
    expect(mockPrisma.benefit.update).toHaveBeenCalled()
  })
})
