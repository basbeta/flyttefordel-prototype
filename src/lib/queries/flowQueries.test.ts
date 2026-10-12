// CR-022: getWebFlow rules (pages, cards, products, targeting, no leaks).
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  prisma: { flowPage: { findMany: vi.fn() } },
}))

import { prisma } from '@/lib/db/client'
import { getWebFlow } from './flowQueries'

const mockFindMany = (prisma as unknown as { flowPage: { findMany: ReturnType<typeof vi.fn> } })
  .flowPage.findMany

const NOW = new Date('2026-10-12T12:00:00Z')

function product(id: string, overrides: Record<string, unknown> = {}) {
  return { id, name: `Produkt ${id}`, text: null, priceText: null, ...overrides }
}

function benefit(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    slug: `fordel-${id}`,
    title: `Tittel ${id}`,
    shortDescription: `Tekst ${id}`,
    imageUrl: null,
    imageAlt: null,
    badgeText: null,
    termsText: 'Vilkår',
    status: 'active',
    deletedAt: null,
    startsAt: null,
    endsAt: null,
    targeting: null,
    advertiser: { name: 'Demo Kunde', logoUrl: null },
    products: [product(`${id}-p1`)],
    // Fields that must never leak:
    consentText: 'hemmelig samtykke',
    pricePerLead: 99,
    campaignFee: 1000,
    ...overrides,
  }
}

function view(b: ReturnType<typeof benefit>, overrides: Record<string, unknown> = {}) {
  return {
    format: 'web_card',
    variant: 'standard',
    title: null,
    text: null,
    imageUrl: null,
    imageAlt: null,
    badgeText: null,
    benefit: b,
    ...overrides,
  }
}

function page(id: string, views: ReturnType<typeof view>[], overrides: Record<string, unknown> = {}) {
  return { id, name: `Side ${id}`, text: null, imageUrl: null, imageAlt: null, views, ...overrides }
}

beforeEach(() => vi.clearAllMocks())

describe('getWebFlow', () => {
  it('spør kun aktive, ikke-slettede sider i sortOrder, og web_card/standard-views', async () => {
    mockFindMany.mockResolvedValueOnce([])
    await getWebFlow(null, NOW)
    const arg = mockFindMany.mock.calls[0][0]
    expect(arg.where).toEqual({ isActive: true, deletedAt: null })
    expect(arg.orderBy[0]).toEqual({ sortOrder: 'asc' })
    expect(arg.include.views.where).toEqual({ format: 'web_card', variant: 'standard' })
    expect(arg.include.views.orderBy[0]).toEqual({ sortOrder: 'asc' })
    expect(arg.include.views.include.benefit.include.products.where).toEqual({
      isActive: true,
      deletedAt: null,
    })
  })

  it('beholder rekkefølgen fra databasen for sider og kort', async () => {
    mockFindMany.mockResolvedValueOnce([
      page('p1', [view(benefit('b2')), view(benefit('b1'))]),
      page('p2', [view(benefit('b3'))]),
    ])
    const flow = await getWebFlow(null, NOW)
    expect(flow.map((p) => p.id)).toEqual(['p1', 'p2'])
    expect(flow[0].cards.map((c) => c.benefitId)).toEqual(['b2', 'b1'])
  })

  it('utelater kort for fordeler som ikke er live', async () => {
    mockFindMany.mockResolvedValueOnce([
      page('p1', [
        view(benefit('ok')),
        view(benefit('draft', { status: 'draft' })),
        view(benefit('slettet', { deletedAt: new Date('2026-01-01') })),
        view(benefit('utløpt', { endsAt: new Date('2026-10-01') })),
        view(benefit('fremtid', { startsAt: new Date('2026-11-01') })),
      ]),
    ])
    const flow = await getWebFlow(null, NOW)
    expect(flow[0].cards.map((c) => c.benefitId)).toEqual(['ok'])
  })

  it('utelater en side uten synlige kort', async () => {
    mockFindMany.mockResolvedValueOnce([
      page('tom', []),
      page('bare-draft', [view(benefit('d', { status: 'draft' }))]),
      page('ok', [view(benefit('b1'))]),
    ])
    const flow = await getWebFlow(null, NOW)
    expect(flow.map((p) => p.id)).toEqual(['ok'])
  })

  it('filtrerer på targeting for sesjonen', async () => {
    const onlyOslo = {
      appliesNationally: false,
      includeUnknownLocation: false,
      postcodes: ['0150'],
      postcodeRanges: null,
      movingStatuses: null,
    }
    mockFindMany.mockResolvedValue([
      page('p1', [view(benefit('oslo', { targeting: onlyOslo })), view(benefit('alle'))]),
    ])
    const oslo = await getWebFlow({ postcode: '0150', movingStatus: 'unknown' }, NOW)
    expect(oslo[0].cards.map((c) => c.benefitId)).toEqual(['oslo', 'alle'])
    const bergen = await getWebFlow({ postcode: '5003', movingStatus: 'unknown' }, NOW)
    expect(bergen[0].cards.map((c) => c.benefitId)).toEqual(['alle'])
  })

  it('løser kortinnhold med web_card-overstyring, resten arves', async () => {
    mockFindMany.mockResolvedValueOnce([
      page('p1', [view(benefit('b1'), { title: 'Web-tittel', badgeText: 'Ny på web' })]),
    ])
    const [card] = (await getWebFlow(null, NOW))[0].cards
    expect(card.title).toBe('Web-tittel')
    expect(card.badgeText).toBe('Ny på web')
    expect(card.text).toBe('Tekst b1')
  })

  it('beholder fordel uten produkter som kort med tom produktliste', async () => {
    mockFindMany.mockResolvedValueOnce([page('p1', [view(benefit('b1', { products: [] }))])])
    const [card] = (await getWebFlow(null, NOW))[0].cards
    expect(card.products).toEqual([])
  })

  it('mapper produkter i gitt rekkefølge med kun avgrensede felt', async () => {
    mockFindMany.mockResolvedValueOnce([
      page('p1', [
        view(
          benefit('b1', {
            products: [
              product('a', { name: 'Digital', priceText: '99 kr/mnd', internal: 'x' }),
              product('b', { name: 'Komplett', text: 'Alt inkludert' }),
            ],
          })
        ),
      ]),
    ])
    const [card] = (await getWebFlow(null, NOW))[0].cards
    expect(card.products).toEqual([
      { id: 'a', name: 'Digital', text: null, priceText: '99 kr/mnd' },
      { id: 'b', name: 'Komplett', text: 'Alt inkludert', priceText: null },
    ])
  })

  it('lekker ingen interne felter i lesemodellen', async () => {
    mockFindMany.mockResolvedValueOnce([
      page('p1', [view(benefit('b1'))], { internalNote: 'intern' }),
    ])
    const flow = await getWebFlow(null, NOW)
    expect(Object.keys(flow[0]).sort()).toEqual(
      ['cards', 'id', 'imageAlt', 'imageUrl', 'name', 'text'].sort()
    )
    expect(Object.keys(flow[0].cards[0]).sort()).toEqual(
      [
        'advertiser',
        'badgeText',
        'benefitId',
        'imageAlt',
        'imageUrl',
        'products',
        'slug',
        'termsText',
        'text',
        'title',
      ].sort()
    )
    expect(Object.keys(flow[0].cards[0].advertiser).sort()).toEqual(['logoUrl', 'name'])
    const json = JSON.stringify(flow)
    expect(json).not.toContain('hemmelig samtykke')
    expect(json).not.toContain('pricePerLead')
    expect(json).not.toContain('internal')
  })

  it('returnerer tom liste når det ikke finnes sider', async () => {
    mockFindMany.mockResolvedValueOnce([])
    expect(await getWebFlow(null, NOW)).toEqual([])
  })
})
