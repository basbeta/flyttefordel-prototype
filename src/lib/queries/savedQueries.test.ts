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
      views: [],
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

  // CR-027: same card content as the list
  it('henter app_card-visninger i spørringen', async () => {
    mockFindMany.mockResolvedValueOnce([])
    await getSavedBenefits('s1')
    const arg = mockFindMany.mock.calls[0][0]
    expect(arg.include.benefit.include.views).toEqual({ where: { format: 'app_card' } })
  })

  it('bruker app_card-overstyring på lagret-siden, og arver resten', async () => {
    mockFindMany.mockResolvedValueOnce([
      saved('b1', {
        imageUrl: 'https://example.test/core.jpg',
        imageAlt: 'Kjernealt',
        badgeText: 'Ny',
        views: [{ format: 'app_card', variant: 'standard', title: 'Kort-tittel', text: 'Kort-tekst' }],
      }),
    ])
    const [card] = await getSavedBenefits('s1')
    expect(card.title).toBe('Kort-tittel')
    expect(card.shortDescription).toBe('Kort-tekst')
    expect(card.imageUrl).toBe('https://example.test/core.jpg')
    expect(card.imageAlt).toBe('Kjernealt')
    expect(card.badgeText).toBe('Ny')
    expect(card.isSaved).toBe(true)
  })

  it('uten visninger er kortet fordelens eget innhold (uendret)', async () => {
    mockFindMany.mockResolvedValueOnce([saved('b1')])
    const [card] = await getSavedBenefits('s1')
    expect(card.title).toBe('Fordel b1')
    expect(card.shortDescription).toBe('Tekst')
  })

  it('ignorerer visninger for andre formater og bruker samme resultat som listen', async () => {
    mockFindMany.mockResolvedValueOnce([
      saved('b1', { views: [{ format: 'web_card', variant: 'standard', title: 'Web-tittel' }] }),
    ])
    const [card] = await getSavedBenefits('s1')
    expect(card.title).toBe('Fordel b1')
  })
})
