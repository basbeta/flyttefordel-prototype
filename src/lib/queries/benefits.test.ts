// CR-016: Unit tests for getAdminBenefits — verifiserer at redemption/codePool
// mappes riktig, siden BenefitStatusBadge er avhengig av disse feltene.
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  prisma: {
    benefit: { findMany: vi.fn() },
  },
}))

import { prisma } from '@/lib/db/client'
import { getAdminBenefits } from './adminQueries'

const mockPrisma = prisma as unknown as {
  benefit: { findMany: ReturnType<typeof vi.fn> }
}

beforeEach(() => vi.clearAllMocks())

describe('getAdminBenefits', () => {
  it('mapper redemption + codePool.availableCodes for beregning av visningsstatus', async () => {
    mockPrisma.benefit.findMany.mockResolvedValueOnce([
      {
        id: 'b1', title: 'Fordel A', slug: 'fordel-a', status: 'active', priority: 0,
        startsAt: null, endsAt: null, createdAt: new Date('2026-01-01'),
        redemptionType: 'unique_code',
        advertiser: { name: 'Adv' },
        category: { name: 'Kat' },
        redemption: {
          genericCode: null, externalUrl: null, qrValue: null,
          codePoolId: 'pool-1', leadFormId: null,
          codePool: { availableCodes: 3 },
        },
      },
    ])

    const [row] = await getAdminBenefits()

    expect(row.redemptionType).toBe('unique_code')
    expect(row.redemption).toEqual({
      genericCode: null, externalUrl: null, qrValue: null,
      codePoolId: 'pool-1', leadFormId: null,
      codePool: { availableCodes: 3 },
    })
  })

  it('mapper redemption til null når fordelen ikke har noen (f.eks. info_only)', async () => {
    mockPrisma.benefit.findMany.mockResolvedValueOnce([
      {
        id: 'b2', title: 'Fordel B', slug: 'fordel-b', status: 'active', priority: 0,
        startsAt: null, endsAt: null, createdAt: new Date('2026-01-01'),
        redemptionType: 'info_only',
        advertiser: { name: 'Adv' },
        category: { name: 'Kat' },
        redemption: null,
      },
    ])

    const [row] = await getAdminBenefits()
    expect(row.redemption).toBeNull()
  })

  it('mapper codePool til null når redemption finnes men ingen kodepool er koblet', async () => {
    mockPrisma.benefit.findMany.mockResolvedValueOnce([
      {
        id: 'b3', title: 'Fordel C', slug: 'fordel-c', status: 'active', priority: 0,
        startsAt: null, endsAt: null, createdAt: new Date('2026-01-01'),
        redemptionType: 'unique_code',
        advertiser: { name: 'Adv' },
        category: { name: 'Kat' },
        redemption: {
          genericCode: null, externalUrl: null, qrValue: null,
          codePoolId: null, leadFormId: null, codePool: null,
        },
      },
    ])

    const [row] = await getAdminBenefits()
    expect(row.redemption?.codePool).toBeNull()
  })
})
