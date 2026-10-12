// CR-021: getActiveBenefits resolves card content through BenefitView overrides.
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  prisma: {
    benefit: { findMany: vi.fn() },
    savedBenefit: { findMany: vi.fn() },
  },
}))

import { prisma } from '@/lib/db/client'
import { getActiveBenefits } from './benefitQueries'

const mockPrisma = prisma as unknown as {
  benefit: { findMany: ReturnType<typeof vi.fn> }
  savedBenefit: { findMany: ReturnType<typeof vi.fn> }
}

function benefitRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'b1',
    title: 'Kjernetittel',
    slug: 'kjerne',
    shortDescription: 'Kjernetekst',
    imageUrl: 'https://example.test/core.jpg',
    imageAlt: 'Kjernealt',
    badgeText: 'Ny',
    redemptionType: 'info_only',
    endsAt: null,
    isTimeLimited: false,
    isFeatured: false,
    advertiser: { id: 'a1', name: 'Adv', slug: 'adv', logoUrl: null, websiteUrl: null },
    category: { id: 'c1', name: 'Kat', slug: 'kat', icon: null, sortOrder: 0 },
    targeting: null,
    views: [],
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockPrisma.savedBenefit.findMany.mockResolvedValue([])
})

describe('getActiveBenefits (CR-021)', () => {
  it('uten views gir kortet fordelens eget innhold', async () => {
    mockPrisma.benefit.findMany.mockResolvedValueOnce([benefitRow()])
    const [card] = await getActiveBenefits()
    expect(card).toEqual({
      id: 'b1',
      title: 'Kjernetittel',
      slug: 'kjerne',
      shortDescription: 'Kjernetekst',
      imageUrl: 'https://example.test/core.jpg',
      imageAlt: 'Kjernealt',
      badgeText: 'Ny',
      redemptionType: 'info_only',
      endsAt: null,
      isTimeLimited: false,
      isFeatured: false,
      isSaved: false,
      advertiser: { id: 'a1', name: 'Adv', slug: 'adv', logoUrl: null, websiteUrl: null },
      category: { id: 'c1', name: 'Kat', slug: 'kat', icon: null, sortOrder: 0 },
    })
  })

  it('en app_card-overstyring gir overstyrt tittel og tekst, resten arves', async () => {
    mockPrisma.benefit.findMany.mockResolvedValueOnce([
      benefitRow({
        views: [{ format: 'app_card', variant: 'standard', title: 'Kort-tittel', text: 'Kort-tekst' }],
      }),
    ])
    const [card] = await getActiveBenefits()
    expect(card.title).toBe('Kort-tittel')
    expect(card.shortDescription).toBe('Kort-tekst')
    expect(card.imageUrl).toBe('https://example.test/core.jpg')
    expect(card.badgeText).toBe('Ny')
  })

  it('henter kun app_card-views i spørringen', async () => {
    mockPrisma.benefit.findMany.mockResolvedValueOnce([])
    await getActiveBenefits()
    const arg = mockPrisma.benefit.findMany.mock.calls[0][0]
    expect(arg.include.views).toEqual({ where: { format: 'app_card' } })
  })

  it('markerer lagrede fordeler som før', async () => {
    mockPrisma.benefit.findMany.mockResolvedValueOnce([benefitRow()])
    mockPrisma.savedBenefit.findMany.mockResolvedValueOnce([{ benefitId: 'b1' }])
    const [card] = await getActiveBenefits(undefined, {
      sessionId: 's1',
      postcode: null,
      movingStatus: 'unknown',
    })
    expect(card.isSaved).toBe(true)
  })
})

// CR-025: showInApp
describe('getActiveBenefits (CR-025 showInApp)', () => {
  it('spør bare etter fordeler som skal vises i appen', async () => {
    mockPrisma.benefit.findMany.mockResolvedValueOnce([])
    await getActiveBenefits()
    const arg = mockPrisma.benefit.findMany.mock.calls[0][0]
    expect(arg.where.showInApp).toBe(true)
    expect(arg.where.status).toBe('active')
    expect(arg.where.deletedAt).toBeNull()
  })
})
