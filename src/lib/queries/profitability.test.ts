// CR-010: Unit tests for getProfitabilityData.
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  prisma: {
    benefit: { findMany: vi.fn() },
    benefitEvent: { groupBy: vi.fn() },
  },
}))

import { prisma } from '@/lib/db/client'
import { getProfitabilityData } from './adminQueries'

const mockPrisma = prisma as unknown as {
  benefit: { findMany: ReturnType<typeof vi.fn> }
  benefitEvent: { groupBy: ReturnType<typeof vi.fn> }
}

function toDecimal(n: number) {
  return { toNumber: () => n }
}

beforeEach(() => vi.clearAllMocks())

describe('getProfitabilityData — inntektsberegning', () => {
  it('kun fast kampanjepris', async () => {
    mockPrisma.benefit.findMany.mockResolvedValueOnce([
      {
        id: 'b1', title: 'T', slug: 's', redemptionType: 'generic_code',
        campaignFee: toDecimal(1000), pricePerView: null, pricePerLead: null, pricePerRedemption: null,
        advertiser: { id: 'a1', name: 'Adv' },
      },
    ])
    mockPrisma.benefitEvent.groupBy.mockResolvedValueOnce([
      { benefitId: 'b1', eventType: 'benefit_viewed', _count: { id: 50 } },
    ])

    const data = await getProfitabilityData()
    expect(data.benefits[0].revenue).toBe(1000)
    expect(data.totalRevenue).toBe(1000)
  })

  it('alle priskomponenter summeres korrekt', async () => {
    mockPrisma.benefit.findMany.mockResolvedValueOnce([
      {
        id: 'b1', title: 'T', slug: 's', redemptionType: 'lead_form',
        campaignFee: toDecimal(500),
        pricePerView: toDecimal(0.5),
        pricePerLead: toDecimal(100),
        pricePerRedemption: null,
        advertiser: { id: 'a1', name: 'Adv' },
      },
    ])
    mockPrisma.benefitEvent.groupBy.mockResolvedValueOnce([
      { benefitId: 'b1', eventType: 'benefit_viewed', _count: { id: 100 } },
      { benefitId: 'b1', eventType: 'lead_submitted', _count: { id: 10 } },
    ])

    // 500 + 100×0.5 + 10×100 = 500 + 50 + 1000 = 1550
    const data = await getProfitabilityData()
    expect(data.benefits[0].revenue).toBe(1550)
  })

  it('ingen prisfelter gir inntekt 0 og hasPricing false', async () => {
    mockPrisma.benefit.findMany.mockResolvedValueOnce([
      {
        id: 'b1', title: 'T', slug: 's', redemptionType: 'info_only',
        campaignFee: null, pricePerView: null, pricePerLead: null, pricePerRedemption: null,
        advertiser: { id: 'a1', name: 'Adv' },
      },
    ])
    mockPrisma.benefitEvent.groupBy.mockResolvedValueOnce([
      { benefitId: 'b1', eventType: 'benefit_viewed', _count: { id: 99 } },
    ])

    const data = await getProfitabilityData()
    expect(data.benefits[0].revenue).toBe(0)
    expect(data.benefits[0].hasPricing).toBe(false)
    expect(data.pricedCampaigns).toBe(0)
  })

  it('ingen events gir inntekt lik kun fast pris', async () => {
    mockPrisma.benefit.findMany.mockResolvedValueOnce([
      {
        id: 'b1', title: 'T', slug: 's', redemptionType: 'generic_code',
        campaignFee: toDecimal(200), pricePerView: toDecimal(1), pricePerLead: null, pricePerRedemption: null,
        advertiser: { id: 'a1', name: 'Adv' },
      },
    ])
    mockPrisma.benefitEvent.groupBy.mockResolvedValueOnce([])

    const data = await getProfitabilityData()
    // 200 + 0×1 = 200
    expect(data.benefits[0].revenue).toBe(200)
  })
})

describe('getProfitabilityData — per-annonsør aggregering', () => {
  it('summerer inntekt korrekt på tvers av fordeler', async () => {
    mockPrisma.benefit.findMany.mockResolvedValueOnce([
      {
        id: 'b1', title: 'T1', slug: 's1', redemptionType: 'generic_code',
        campaignFee: toDecimal(500), pricePerView: null, pricePerLead: null, pricePerRedemption: null,
        advertiser: { id: 'a1', name: 'Acme' },
      },
      {
        id: 'b2', title: 'T2', slug: 's2', redemptionType: 'lead_form',
        campaignFee: toDecimal(300), pricePerView: null, pricePerLead: toDecimal(50), pricePerRedemption: null,
        advertiser: { id: 'a1', name: 'Acme' },
      },
      {
        id: 'b3', title: 'T3', slug: 's3', redemptionType: 'external_link',
        campaignFee: toDecimal(1000), pricePerView: null, pricePerLead: null, pricePerRedemption: null,
        advertiser: { id: 'a2', name: 'Beta' },
      },
    ])
    mockPrisma.benefitEvent.groupBy.mockResolvedValueOnce([
      { benefitId: 'b2', eventType: 'lead_submitted', _count: { id: 4 } },
    ])

    // b1: 500, b2: 300 + 4×50 = 500, b3: 1000
    // Acme total: 1000, Beta total: 1000
    const data = await getProfitabilityData()

    const acme = data.advertisers.find((a) => a.name === 'Acme')!
    expect(acme.campaignCount).toBe(2)
    expect(acme.totalRevenue).toBe(1000)

    const beta = data.advertisers.find((a) => a.name === 'Beta')!
    expect(beta.campaignCount).toBe(1)
    expect(beta.totalRevenue).toBe(1000)

    expect(data.totalRevenue).toBe(2000)
  })

  it('beregner snitt-CPL korrekt', async () => {
    mockPrisma.benefit.findMany.mockResolvedValueOnce([
      {
        id: 'b1', title: 'T1', slug: 's1', redemptionType: 'lead_form',
        campaignFee: null, pricePerView: null, pricePerLead: toDecimal(100), pricePerRedemption: null,
        advertiser: { id: 'a1', name: 'Acme' },
      },
    ])
    mockPrisma.benefitEvent.groupBy.mockResolvedValueOnce([
      { benefitId: 'b1', eventType: 'lead_submitted', _count: { id: 5 } },
    ])

    const data = await getProfitabilityData()
    const acme = data.advertisers.find((a) => a.name === 'Acme')!
    // 5 leads × 100 kr / 5 leads = 100 kr snitt-CPL
    expect(acme.avgCPL).toBe(100)
  })
})
