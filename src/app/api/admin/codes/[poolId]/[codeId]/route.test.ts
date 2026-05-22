// CR-009: Unit tests for PATCH /api/admin/codes/[poolId]/[codeId]
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  prisma: {
    code: { findFirst: vi.fn(), update: vi.fn() },
    codePool: { update: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/admin/auth', () => ({
  verifyAdminJWT: vi.fn().mockResolvedValue({ email: 'admin@test.com' }),
  ADMIN_TOKEN_COOKIE: 'admin_token',
}))

import { prisma } from '@/lib/db/client'
import { PATCH } from './route'
import { NextRequest } from 'next/server'

const mockPrisma = prisma as unknown as {
  code: { findFirst: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> }
  codePool: { update: ReturnType<typeof vi.fn> }
  $transaction: ReturnType<typeof vi.fn>
}

function makeRequest() {
  return new NextRequest('http://localhost/api/admin/codes/pool1/code1', {
    method: 'PATCH',
    headers: { cookie: 'admin_token=tok' },
  })
}

const PARAMS = { params: { poolId: 'pool1', codeId: 'code1' } }

beforeEach(() => vi.clearAllMocks())

describe('PATCH /api/admin/codes/[poolId]/[codeId]', () => {
  it('returnerer 404 om koden ikke finnes', async () => {
    mockPrisma.code.findFirst.mockResolvedValueOnce(null)
    const res = await PATCH(makeRequest(), PARAMS)
    expect(res.status).toBe(404)
  })

  it('deaktiverer available-kode og kaller $transaction', async () => {
    mockPrisma.code.findFirst.mockResolvedValueOnce({ id: 'code1', status: 'available' })
    mockPrisma.$transaction.mockImplementationOnce(async (ops: unknown[]) => {
      for (const op of ops) await op
    })
    const res = await PATCH(makeRequest(), PARAMS)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.disabled).toBe(true)
    expect(body.availableAdjusted).toBe(true)
    expect(mockPrisma.$transaction).toHaveBeenCalledOnce()
  })

  it('deaktiverer assigned-kode uten å justere availableCodes', async () => {
    mockPrisma.code.findFirst.mockResolvedValueOnce({ id: 'code1', status: 'assigned' })
    mockPrisma.$transaction.mockImplementationOnce(async (ops: unknown[]) => {
      for (const op of ops) await op
    })
    const res = await PATCH(makeRequest(), PARAMS)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.availableAdjusted).toBe(false)
  })

  it('returnerer 200 uten handling om koden allerede er disabled', async () => {
    mockPrisma.code.findFirst.mockResolvedValueOnce({ id: 'code1', status: 'disabled' })
    const res = await PATCH(makeRequest(), PARAMS)
    expect(res.status).toBe(200)
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })
})
