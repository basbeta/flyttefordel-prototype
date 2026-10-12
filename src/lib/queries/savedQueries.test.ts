// CR-025: the saved list leaves out benefits switched off for the app.
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  prisma: { savedBenefit: { findMany: vi.fn() } },
}))

import { prisma } from '@/lib/db/client'
import { getSavedBenefits } from './savedQueries'

const mockFindMany = (prisma as unknown as { savedBenefit: { findMany: ReturnType<typeof vi.fn> } })
  .savedBenefit.findMany

function saved(id: string, overrides: Record<string, unknown> = {}) {
  return {
    benefit: {
      id,
      title: `Fordel ${id}`,
      slug: `fordel-${id}`,
      shortDescription: 'Tekst',
      imageUrl: null,
      imageAlt: null,
      badgeText: null,
      redemptionType: 'info_only',
      endsAt: null,
      isTimeLimited: false,
      isFeatured: false,
      status: 'active',
      deletedAt: null,
      showInApp: true,
      advertiser: { id: 'a1', name: 'Adv', slug: 'adv', logoUrl: null, websiteUrl: null },
      category: { id: 'c1', name: 'Kat', slug: 'kat', icon: null, sortOrder: 0 },
      ...overrides,
    },
  }
}

beforeEach(() => vi.clearAllMocks())

describe('getSavedBenefits', () => {
  it('beholder aktive fordeler som vises i appen, merket som lagret', async () => {
    mockFindMany.mockResolvedValueOnce([saved('b1')])
    const cards = await getSavedBenefits('s1')
    expect(cards).toHaveLength(1)
    expect(cards[0]).toMatchObject({ id: 'b1', isSaved: true })
  })

  it('utelater fordeler med showInApp av', async () => {
    mockFindMany.mockResolvedValueOnce([saved('b1'), saved('b2', { showInApp: false })])
    const cards = await getSavedBenefits('s1')
    expect(cards.map((c) => c.id)).toEqual(['b1'])
  })

  it('utelater fortsatt ikke-aktive og slettede fordeler', async () => {
    mockFindMany.mockResolvedValueOnce([
      saved('b1', { status: 'paused' }),
      saved('b2', { deletedAt: new Date('2026-01-01') }),
    ])
    expect(await getSavedBenefits('s1')).toEqual([])
  })
})
