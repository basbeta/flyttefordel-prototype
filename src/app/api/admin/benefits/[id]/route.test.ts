// CR-017: unit tests for sperre mot at en fordel-redigering resulterer i
// Aktiv/Planlagt med manglende påkrevd redemption-innhold — enten fordi
// status eksplisitt endres, eller fordi en allerede aktiv fordel
// utilsiktet ødelegges av redigeringen.
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

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/admin/benefits/b1', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', cookie: 'admin_token=valid' },
  })
}

const PARAMS = { params: Promise.resolve({ id: 'b1' }) }

function existingActiveBenefit(overrides: Record<string, unknown> = {}) {
  return {
    id: 'b1',
    status: 'active',
    redemptionType: 'generic_code',
    startsAt: null,
    endsAt: null,
    redemption: { genericCode: 'FLYTT20', externalUrl: null, qrValue: null, codePoolId: null, leadFormId: null, codePool: null },
    ...overrides,
  }
}

beforeEach(() => vi.clearAllMocks())

describe('PATCH /api/admin/benefits/[id] — CR-017 sperre', () => {
  it('blokkerer eksplisitt statusendring til active når rabattkode mangler', async () => {
    mockPrisma.benefit.findFirst.mockResolvedValueOnce(existingActiveBenefit({
      status: 'draft',
      redemption: { genericCode: null, externalUrl: null, qrValue: null, codePoolId: null, leadFormId: null, codePool: null },
    }))

    const res = await PATCH(makeRequest({ status: 'active' }), PARAMS)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.message).toContain('Mangler rabattkode')
    expect(mockPrisma.benefit.update).not.toHaveBeenCalled()
  })

  it('blokkerer en redigering som fjerner rabattkoden fra en allerede aktiv fordel, selv uten statusfelt i payload', async () => {
    mockPrisma.benefit.findFirst.mockResolvedValueOnce(existingActiveBenefit())

    const res = await PATCH(makeRequest({ redemption: { genericCode: null } }), PARAMS)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.message).toContain('Mangler rabattkode')
    expect(mockPrisma.benefit.update).not.toHaveBeenCalled()
  })

  it('tillater en redigering som ikke rører redemption-innhold på en allerede aktiv fordel', async () => {
    mockPrisma.benefit.findFirst.mockResolvedValueOnce(existingActiveBenefit())

    const res = await PATCH(makeRequest({ priority: 5 }), PARAMS)
    expect(res.status).toBe(200)
    expect(mockPrisma.benefit.update).toHaveBeenCalled()
  })

  it('tillater å sette en ufullstendig fordel til draft (sperren gjelder kun active/scheduled)', async () => {
    mockPrisma.benefit.findFirst.mockResolvedValueOnce(existingActiveBenefit({
      status: 'active',
      redemption: { genericCode: null, externalUrl: null, qrValue: null, codePoolId: null, leadFormId: null, codePool: null },
    }))

    const res = await PATCH(makeRequest({ status: 'draft' }), PARAMS)
    expect(res.status).toBe(200)
    expect(mockPrisma.benefit.update).toHaveBeenCalled()
  })

  it('tillater å legge til rabattkoden samtidig som status settes til active', async () => {
    mockPrisma.benefit.findFirst.mockResolvedValueOnce(existingActiveBenefit({
      status: 'draft',
      redemption: { genericCode: null, externalUrl: null, qrValue: null, codePoolId: null, leadFormId: null, codePool: null },
    }))

    const res = await PATCH(
      makeRequest({ status: 'active', redemption: { genericCode: 'NYKODE' } }),
      PARAMS,
    )
    expect(res.status).toBe(200)
    expect(mockPrisma.benefit.update).toHaveBeenCalled()
  })
})

// CR-025: showInApp
describe('PATCH /api/admin/benefits/[id] — CR-025 showInApp', () => {
  it('sender showInApp videre til oppdateringen', async () => {
    mockPrisma.benefit.findFirst.mockResolvedValueOnce(existingActiveBenefit())
    const res = await PATCH(makeRequest({ showInApp: false }), PARAMS)
    expect(res.status).toBe(200)
    expect(mockPrisma.benefit.update.mock.calls[0][0].data).toMatchObject({ showInApp: false })
  })

  it('avviser showInApp som ikke er boolsk', async () => {
    const res = await PATCH(makeRequest({ showInApp: 'nei' }), PARAMS)
    expect(res.status).toBe(400)
  })
})
