// CR-008: Unit tests for getAnalytics.
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  prisma: {
    benefit: { findMany: vi.fn() },
    benefitEvent: { groupBy: vi.fn() },
  },
}))

import { prisma } from '@/lib/db/client'
import { getAnalytics } from './adminQueries'

const mockPrisma = prisma as unknown as {
  benefit: { findMany: ReturnType<typeof vi.fn> }
  benefitEvent: { groupBy: ReturnType<typeof vi.fn> }
}

const BENEFITS = [
  { id: 'b1', title: 'Fordel A', slug: 'fordel-a' },
  { id: 'b2', title: 'Fordel B', slug: 'fordel-b' },
]

beforeEach(() => vi.clearAllMocks())

describe('getAnalytics', () => {
  it('aggregerer events korrekt per benefit', async () => {
    mockPrisma.benefit.findMany.mockResolvedValueOnce(BENEFITS)
    mockPrisma.benefitEvent.groupBy.mockResolvedValueOnce([
      { benefitId: 'b1', eventType: 'benefit_viewed', _count: { id: 10 } },
      { benefitId: 'b1', eventType: 'code_revealed', _count: { id: 4 } },
      { benefitId: 'b1', eventType: 'lead_submitted', _count: { id: 2 } },
      { benefitId: 'b2', eventType: 'benefit_viewed', _count: { id: 5 } },
    ])

    const result = await getAnalytics('7d')

    const a = result.rows.find((r) => r.id === 'b1')!
    expect(a.views).toBe(10)
    expect(a.codeRevealed).toBe(4)
    expect(a.leads).toBe(2)
    expect(a.conversionRate).toBe(40)

    const b = result.rows.find((r) => r.id === 'b2')!
    expect(b.views).toBe(5)
    expect(b.codeRevealed).toBe(0)
  })

  it('returnerer 0% konvertering ved 0 visninger — ingen division by zero', async () => {
    mockPrisma.benefit.findMany.mockResolvedValueOnce(BENEFITS)
    mockPrisma.benefitEvent.groupBy.mockResolvedValueOnce([
      { benefitId: 'b1', eventType: 'code_revealed', _count: { id: 3 } },
    ])

    const result = await getAnalytics('all')
    const a = result.rows.find((r) => r.id === 'b1')!
    expect(a.conversionRate).toBe(0)
  })

  it('returnerer riktige globale summer', async () => {
    mockPrisma.benefit.findMany.mockResolvedValueOnce(BENEFITS)
    mockPrisma.benefitEvent.groupBy.mockResolvedValueOnce([
      { benefitId: 'b1', eventType: 'benefit_viewed', _count: { id: 10 } },
      { benefitId: 'b1', eventType: 'code_revealed', _count: { id: 3 } },
      { benefitId: 'b1', eventType: 'lead_submitted', _count: { id: 1 } },
      { benefitId: 'b2', eventType: 'benefit_viewed', _count: { id: 6 } },
      { benefitId: 'b2', eventType: 'code_revealed', _count: { id: 2 } },
      { benefitId: 'b2', eventType: 'lead_submitted', _count: { id: 4 } },
    ])

    const result = await getAnalytics('30d')
    expect(result.totalViews).toBe(16)
    expect(result.totalRedemptions).toBe(5)
    expect(result.totalLeads).toBe(5)
  })
})
