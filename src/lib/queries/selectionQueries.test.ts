// CR-029: the app list, the web flow and the heroes all use the same selection function, and the
// whole person (moved date, housing type, earlier choices) reaches it.
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  prisma: {
    benefit: { findMany: vi.fn() },
    savedBenefit: { findMany: vi.fn() },
    flowPage: { findMany: vi.fn() },
    hero: { findMany: vi.fn() },
  },
}))

import { prisma } from '@/lib/db/client'
import { getActiveBenefits } from './benefitQueries'
import { getWebFlow } from './flowQueries'
import { getActiveHeroes } from './heroQueries'

const db = prisma as unknown as {
  benefit: { findMany: ReturnType<typeof vi.fn> }
  savedBenefit: { findMany: ReturnType<typeof vi.fn> }
  flowPage: { findMany: ReturnType<typeof vi.fn> }
  hero: { findMany: ReturnType<typeof vi.fn> }
}

const NOW = new Date('2026-10-13T08:00:00Z')
const date = (s: string) => new Date(`${s}T00:00:00Z`)

function rule(overrides: Record<string, unknown> = {}) {
  return {
    appliesNationally: false,
    includeUnknownLocation: true,
    postcodes: [],
    postcodeRanges: [],
    movingStatuses: [],
    benefitId: null,
    daysSinceMoveMin: null,
    daysSinceMoveMax: null,
    housingTypes: null,
    requiresChosenBenefitIds: null,
    hideIfChosen: false,
    ...overrides,
  }
}

function benefitRow(id: string, targeting: unknown) {
  return {
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
    startsAt: null,
    termsText: null,
    advertiser: { id: 'a1', name: 'Adv', slug: 'adv', logoUrl: null, websiteUrl: null },
    category: { id: 'c1', name: 'Kat', slug: 'kat', icon: null, sortOrder: 0 },
    products: [],
    views: [],
    targeting,
  }
}

const recentlyMoved = {
  sessionId: 's1',
  postcode: '0150',
  movingStatus: 'recently_moved',
  movedAt: date('2026-10-03'), // 10 dager siden
  housingType: 'leilighet',
  chosenBenefitIds: ['kjøpt'],
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  db.savedBenefit.findMany.mockResolvedValue([])
})
afterEach(() => vi.useRealTimers())

describe('getActiveBenefits bruker hele personen (CR-029)', () => {
  const rows = () => [
    benefitRow('uten-regel', null),
    benefitRow('første-60', rule({ benefitId: 'første-60', daysSinceMoveMin: 0, daysSinceMoveMax: 60 })),
    benefitRow('etter-180', rule({ benefitId: 'etter-180', daysSinceMoveMin: 180 })),
    benefitRow('enebolig', rule({ benefitId: 'enebolig', housingTypes: ['enebolig'] })),
    benefitRow('leilighet', rule({ benefitId: 'leilighet', housingTypes: ['leilighet'] })),
    benefitRow('kryssalg', rule({ benefitId: 'kryssalg', requiresChosenBenefitIds: ['kjøpt'] })),
    benefitRow('kryssalg-annet', rule({ benefitId: 'kryssalg-annet', requiresChosenBenefitIds: ['aldri'] })),
    benefitRow('kjøpt', rule({ benefitId: 'kjøpt', hideIfChosen: true })),
  ]

  it('gir fordelene personen kvalifiserer for, ikke de andre', async () => {
    db.benefit.findMany.mockResolvedValueOnce(rows())
    const cards = await getActiveBenefits(undefined, recentlyMoved)
    expect(cards.map((c) => c.id).sort()).toEqual(['første-60', 'kryssalg', 'leilighet', 'uten-regel'].sort())
  })

  it('en person uten flyttedato, boligtype og historikk får bare de uten krav (streng)', async () => {
    db.benefit.findMany.mockResolvedValueOnce(rows())
    const cards = await getActiveBenefits(undefined, { sessionId: 's2', postcode: '0150', movingStatus: 'unknown' })
    // 'kjøpt' har bare hideIfChosen og er ikke valgt, så den vises
    expect(cards.map((c) => c.id).sort()).toEqual(['kjøpt', 'uten-regel'].sort())
  })

  it('uten innlogget sesjon (null) fungerer som en person uten data', async () => {
    db.benefit.findMany.mockResolvedValueOnce(rows())
    const cards = await getActiveBenefits(undefined, null)
    expect(cards.map((c) => c.id).sort()).toEqual(['kjøpt', 'uten-regel'].sort())
  })

  it('dagsregelen regnes fra dagens dato (flytter over tid)', async () => {
    db.benefit.findMany.mockResolvedValue(rows())
    vi.setSystemTime(new Date('2027-04-13T08:00:00Z')) // 192 dager etter flytting
    const cards = await getActiveBenefits(undefined, recentlyMoved)
    const ids = cards.map((c) => c.id)
    expect(ids).toContain('etter-180')
    expect(ids).not.toContain('første-60')
  })
})

describe('getWebFlow bruker hele personen (CR-029)', () => {
  function flowBenefit(id: string, targeting: unknown) {
    return { ...benefitRow(id, targeting), products: [{ id: `${id}-p`, name: 'P', text: null, priceText: null }] }
  }
  function flowPage(benefits: ReturnType<typeof flowBenefit>[]) {
    return {
      id: 'p1',
      name: 'Side',
      text: null,
      imageUrl: null,
      imageAlt: null,
      views: benefits.map((b) => ({
        format: 'web_card', variant: 'standard', title: null, text: null, imageUrl: null, imageAlt: null, badgeText: null, benefit: b,
      })),
    }
  }

  it('kryssalg vises først etter at personen har valgt den påkrevde fordelen', async () => {
    const page = flowPage([
      flowBenefit('grunn', null),
      flowBenefit('kryssalg', rule({ benefitId: 'kryssalg', requiresChosenBenefitIds: ['grunn'] })),
    ])
    db.flowPage.findMany.mockResolvedValue([page])
    const before = await getWebFlow({ postcode: '0150', movingStatus: 'recently_moved', chosenBenefitIds: [] }, NOW)
    expect(before[0].cards.map((c) => c.benefitId)).toEqual(['grunn'])
    const after = await getWebFlow({ postcode: '0150', movingStatus: 'recently_moved', chosenBenefitIds: ['grunn'] }, NOW)
    expect(after[0].cards.map((c) => c.benefitId)).toEqual(['grunn', 'kryssalg'])
  })

  it('hideIfChosen skjuler en fordel personen allerede har bestilt', async () => {
    db.flowPage.findMany.mockResolvedValue([
      flowPage([flowBenefit('b1', rule({ benefitId: 'b1', hideIfChosen: true })), flowBenefit('b2', null)]),
    ])
    const flow = await getWebFlow({ postcode: null, movingStatus: 'unknown', chosenBenefitIds: ['b1'] }, NOW)
    expect(flow[0].cards.map((c) => c.benefitId)).toEqual(['b2'])
  })

  it('dager siden flytting og boligtype brukes (og bruker now som er sendt inn)', async () => {
    db.flowPage.findMany.mockResolvedValue([
      flowPage([
        flowBenefit('ny', rule({ benefitId: 'ny', daysSinceMoveMax: 30, housingTypes: ['leilighet'] })),
        flowBenefit('alle', null),
      ]),
    ])
    const ok = await getWebFlow(recentlyMoved, NOW)
    expect(ok[0].cards.map((c) => c.benefitId)).toEqual(['ny', 'alle'])
    const wrongHousing = await getWebFlow({ ...recentlyMoved, housingType: 'enebolig' }, NOW)
    expect(wrongHousing[0].cards.map((c) => c.benefitId)).toEqual(['alle'])
    const later = await getWebFlow(recentlyMoved, new Date('2026-12-31T08:00:00Z'))
    expect(later[0].cards.map((c) => c.benefitId)).toEqual(['alle'])
  })
})

describe('getActiveHeroes bruker samme funksjon (CR-029)', () => {
  function heroRow(id: string, targeting: unknown, isFallback = false) {
    return {
      id, title: `Hero ${id}`, description: null, imageUrl: null, imageAlt: null, ctaLabel: null,
      ctaType: 'none', ctaTarget: null, isFallback, targeting,
    }
  }

  it('en hero med boligtype og dager vises bare for matchende person, ellers fallback', async () => {
    db.hero.findMany.mockResolvedValue([
      heroRow('målrettet', rule({ housingTypes: ['leilighet'], daysSinceMoveMax: 30 })),
      heroRow('fallback', null, true),
    ])
    const match = await getActiveHeroes(recentlyMoved)
    expect(match.map((h) => h.id)).toEqual(['målrettet'])
    const miss = await getActiveHeroes({ ...recentlyMoved, housingType: 'enebolig' })
    expect(miss.map((h) => h.id)).toEqual(['fallback'])
  })

  it('en hero-regel uten benefitId påvirkes ikke av hideIfChosen', async () => {
    db.hero.findMany.mockResolvedValue([heroRow('h', rule({ hideIfChosen: true }))])
    const heroes = await getActiveHeroes({ ...recentlyMoved, chosenBenefitIds: ['h'] })
    expect(heroes.map((h) => h.id)).toEqual(['h'])
  })
})
