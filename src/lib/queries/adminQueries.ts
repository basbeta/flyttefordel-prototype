// CR-004: Admin-facing queries. Never use these in consumer-app routes.

import { prisma } from '@/lib/db/client'
import { VIEW_FORMATS } from '@/lib/views'
import type {
  AdminDashboardStats,
  AdminAnalyticsData,
  AdminBenefitRow,
  AdminAdvertiserRow,
  AdminCategoryRow,
  AdminCodePoolRow,
  AdminCodePoolDetail,
  AdminLeadRow,
  AdminProfitabilityData,
  AdminFlowPageRow,
  AdminFlowPageOption,
  AdminProductRow,
} from '@/types/admin'
import type { BenefitStatus, LeadStatus } from '@prisma/client'

// ---- Dashboard ----

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const [active, scheduled, expiringSoon, newLeads, lowPools] = await Promise.all([
    prisma.benefit.count({ where: { status: 'active', deletedAt: null } }),
    prisma.benefit.count({ where: { status: 'scheduled', deletedAt: null } }),
    prisma.benefit.count({
      where: {
        status: 'active',
        deletedAt: null,
        endsAt: { gte: now, lte: sevenDaysFromNow },
      },
    }),
    prisma.lead.count({ where: { status: 'new', deletedAt: null, createdAt: { gte: sevenDaysAgo } } }),
    prisma.codePool.findMany({
      where: { isActive: true },
      select: { id: true, name: true, availableCodes: true, lowStockThreshold: true },
      orderBy: { availableCodes: 'asc' },
    }).then((pools) => pools.filter((p) => p.availableCodes <= p.lowStockThreshold).slice(0, 5))
      .catch(() => []),
  ])

  return {
    activeBenefitsCount: active,
    scheduledBenefitsCount: scheduled,
    expiringSoonCount: expiringSoon,
    newLeadsCount: newLeads,
    lowCodePools: lowPools,
  }
}

// ---- Analytics ----

export async function getAnalytics(period: '7d' | '30d' | 'all'): Promise<AdminAnalyticsData> {
  const now = new Date()
  const since =
    period === '7d' ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) :
    period === '30d' ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) :
    null

  const dateFilter = since ? { createdAt: { gte: since } } : {}

  const [benefits, events] = await Promise.all([
    prisma.benefit.findMany({
      where: { status: 'active', deletedAt: null },
      select: { id: true, title: true, slug: true },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.benefitEvent.groupBy({
      by: ['benefitId', 'eventType'],
      where: { benefitId: { not: null }, ...dateFilter },
      _count: { id: true },
    }),
  ])

  const eventMap = new Map<string, Record<string, number>>()
  for (const e of events) {
    if (!e.benefitId) continue
    if (!eventMap.has(e.benefitId)) eventMap.set(e.benefitId, {})
    eventMap.get(e.benefitId)![e.eventType] = e._count.id
  }

  const rows = benefits.map((b) => {
    const m = eventMap.get(b.id) ?? {}
    const views = m['benefit_viewed'] ?? 0
    const codeRevealed = m['code_revealed'] ?? 0
    const codeCopied = m['code_copied'] ?? 0
    const leads = m['lead_submitted'] ?? 0
    const saved = m['benefit_saved'] ?? 0
    return {
      id: b.id,
      title: b.title,
      slug: b.slug,
      views,
      codeRevealed,
      codeCopied,
      leads,
      saved,
      conversionRate: views > 0 ? Math.round((codeRevealed / views) * 100) : 0,
    }
  }).sort((a, b) => b.views - a.views)

  return {
    rows,
    totalViews: rows.reduce((s, r) => s + r.views, 0),
    totalRedemptions: rows.reduce((s, r) => s + r.codeRevealed, 0),
    totalLeads: rows.reduce((s, r) => s + r.leads, 0),
  }
}

// ---- Lønnsomhetsanalyse (CR-010) ----

export async function getProfitabilityData(): Promise<AdminProfitabilityData> {
  const [benefits, events] = await Promise.all([
    prisma.benefit.findMany({
      where: { deletedAt: null },
      select: {
        id: true, title: true, slug: true, redemptionType: true,
        campaignFee: true, pricePerView: true, pricePerLead: true, pricePerRedemption: true,
        advertiser: { select: { id: true, name: true } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.benefitEvent.groupBy({
      by: ['benefitId', 'eventType'],
      where: { benefitId: { not: null } },
      _count: { id: true },
    }),
  ])

  const eventMap = new Map<string, Record<string, number>>()
  for (const e of events) {
    if (!e.benefitId) continue
    if (!eventMap.has(e.benefitId)) eventMap.set(e.benefitId, {})
    eventMap.get(e.benefitId)![e.eventType] = e._count.id
  }

  function toNum(d: { toNumber(): number } | null | undefined): number | null {
    return d == null ? null : d.toNumber()
  }

  function calcRevenue(
    views: number, leads: number, redemptions: number,
    fee: number | null, cpv: number | null, cpl: number | null, cpr: number | null,
  ): number {
    return (fee ?? 0) + views * (cpv ?? 0) + leads * (cpl ?? 0) + redemptions * (cpr ?? 0)
  }

  const benefitRows = benefits.map((b) => {
    const m = eventMap.get(b.id) ?? {}
    const views = m['benefit_viewed'] ?? 0
    const leads = m['lead_submitted'] ?? 0
    const redemptions = m['code_revealed'] ?? 0
    const fee = toNum(b.campaignFee)
    const cpv = toNum(b.pricePerView)
    const cpl = toNum(b.pricePerLead)
    const cpr = toNum(b.pricePerRedemption)
    const hasPricing = fee != null || cpv != null || cpl != null || cpr != null
    return {
      id: b.id, title: b.title, slug: b.slug,
      advertiserName: b.advertiser.name,
      redemptionType: b.redemptionType,
      views, leads, redemptions,
      campaignFee: fee, pricePerView: cpv, pricePerLead: cpl, pricePerRedemption: cpr,
      revenue: calcRevenue(views, leads, redemptions, fee, cpv, cpl, cpr),
      hasPricing,
      _advertiserId: b.advertiser.id,
    }
  })

  // Per annonsør
  const advertiserMap = new Map<string, { name: string; rows: typeof benefitRows }>()
  for (const r of benefitRows) {
    if (!advertiserMap.has(r._advertiserId)) {
      advertiserMap.set(r._advertiserId, { name: r.advertiserName, rows: [] })
    }
    advertiserMap.get(r._advertiserId)!.rows.push(r)
  }

  const advertisers = Array.from(advertiserMap.entries()).map(([id, { name, rows }]) => {
    const totalViews = rows.reduce((s, r) => s + r.views, 0)
    const totalLeads = rows.reduce((s, r) => s + r.leads, 0)
    const totalRedemptions = rows.reduce((s, r) => s + r.redemptions, 0)
    const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0)
    const pricedRows = rows.filter((r) => r.hasPricing)
    const leadRevenue = pricedRows.reduce((s, r) => s + r.leads * (r.pricePerLead ?? 0), 0)
    const viewRevenue = pricedRows.reduce((s, r) => s + r.views * (r.pricePerView ?? 0), 0)
    return {
      id, name,
      campaignCount: rows.length,
      totalViews, totalLeads, totalRedemptions, totalRevenue,
      avgCPL: totalLeads > 0 ? Math.round((leadRevenue / totalLeads) * 100) / 100 : null,
      avgCPV: totalViews > 0 ? Math.round((viewRevenue / totalViews) * 10000) / 10000 : null,
    }
  }).sort((a, b) => b.totalRevenue - a.totalRevenue)

  // Per annonseType
  const typeMap = new Map<string, typeof benefitRows>()
  for (const r of benefitRows) {
    if (!typeMap.has(r.redemptionType)) typeMap.set(r.redemptionType, [])
    typeMap.get(r.redemptionType)!.push(r)
  }

  const byType = Array.from(typeMap.entries()).map(([type, rows]) => {
    const totalViews = rows.reduce((s, r) => s + r.views, 0)
    const totalLeads = rows.reduce((s, r) => s + r.leads, 0)
    const totalRedemptions = rows.reduce((s, r) => s + r.redemptions, 0)
    const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0)
    const codeRows = rows.filter((r) => r.views > 0)
    const avgConversionRate = codeRows.length > 0
      ? Math.round(codeRows.reduce((s, r) => s + (r.redemptions / r.views) * 100, 0) / codeRows.length)
      : 0
    return { redemptionType: type, campaignCount: rows.length, totalViews, totalLeads, totalRedemptions, totalRevenue, avgConversionRate }
  }).sort((a, b) => b.totalRevenue - a.totalRevenue)

  const cleanBenefitRows = benefitRows.map(({ _advertiserId: _, ...rest }) => rest)

  return {
    benefits: cleanBenefitRows.sort((a, b) => b.revenue - a.revenue),
    advertisers,
    byType,
    totalRevenue: benefitRows.reduce((s, r) => s + r.revenue, 0),
    pricedCampaigns: benefitRows.filter((r) => r.hasPricing).length,
    totalCampaigns: benefitRows.length,
  }
}

// ---- Fordeler ----

export async function getAdminBenefits(filters?: {
  status?: BenefitStatus
  advertiserId?: string
  categoryId?: string
}): Promise<AdminBenefitRow[]> {
  const benefits = await prisma.benefit.findMany({
    where: {
      deletedAt: null,
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.advertiserId ? { advertiserId: filters.advertiserId } : {}),
      ...(filters?.categoryId ? { categoryId: filters.categoryId } : {}),
    },
    include: {
      advertiser: { select: { name: true } },
      category: { select: { name: true } },
      // CR-016: nødvendig for å beregne visningsstatus (se /lib/benefits/displayStatus.ts)
      redemption: { include: { codePool: { select: { availableCodes: true } } } },
    },
    orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
  })

  return benefits.map((b) => ({
    id: b.id,
    title: b.title,
    slug: b.slug,
    status: b.status,
    advertiserName: b.advertiser.name,
    categoryName: b.category.name,
    priority: b.priority,
    startsAt: b.startsAt?.toISOString() ?? null,
    endsAt: b.endsAt?.toISOString() ?? null,
    createdAt: b.createdAt.toISOString(),
    redemptionType: b.redemptionType,
    redemption: b.redemption
      ? {
          genericCode: b.redemption.genericCode,
          externalUrl: b.redemption.externalUrl,
          qrValue: b.redemption.qrValue,
          codePoolId: b.redemption.codePoolId,
          leadFormId: b.redemption.leadFormId,
          codePool: b.redemption.codePool ? { availableCodes: b.redemption.codePool.availableCodes } : null,
        }
      : null,
  }))
}

export async function getAdminBenefitById(id: string) {
  return prisma.benefit.findFirst({
    where: { id, deletedAt: null },
    include: {
      advertiser: true,
      category: true,
      redemption: { include: { codePool: true, leadForm: true } },
      targeting: true,
    },
  })
}

// ---- Annonsører ----

export async function getAdminAdvertisers(): Promise<AdminAdvertiserRow[]> {
  const advertisers = await prisma.advertiser.findMany({
    where: { deletedAt: null },
    include: { _count: { select: { benefits: true } } },
    orderBy: { name: 'asc' },
  })

  return advertisers.map((a) => ({
    id: a.id,
    name: a.name,
    slug: a.slug,
    isActive: a.isActive,
    contactEmail: a.contactEmail,
    benefitCount: a._count.benefits,
    createdAt: a.createdAt.toISOString(),
  }))
}

export async function getAdminAdvertiserById(id: string) {
  return prisma.advertiser.findFirst({ where: { id, deletedAt: null } })
}

// ---- Heroer ----

export async function getAdminHeroes() {
  return prisma.hero.findMany({
    where: { deletedAt: null },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
  })
}

export async function getAdminHeroById(id: string) {
  return prisma.hero.findFirst({ where: { id, deletedAt: null }, include: { targeting: true } })
}

// ---- Kategorier (for dropdowns) ----

export async function getAdminCategories() {
  return prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true, slug: true },
  })
}

// ---- Kategorier (full CRUD-visning) ----

export async function getAdminCategoriesFull(): Promise<AdminCategoryRow[]> {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { benefits: true } } },
    orderBy: { sortOrder: 'asc' },
  })
  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    icon: c.icon,
    sortOrder: c.sortOrder,
    isActive: c.isActive,
    benefitCount: c._count.benefits,
    createdAt: c.createdAt.toISOString(),
  }))
}

export async function getAdminCategoryById(id: string) {
  return prisma.category.findFirst({ where: { id } })
}

// ---- Koder ----

export async function getAdminCodePools(): Promise<AdminCodePoolRow[]> {
  const pools = await prisma.codePool.findMany({
    where: { isActive: true },
    include: {
      redemption: {
        include: { benefit: { select: { title: true } } },
      },
    },
    orderBy: { availableCodes: 'asc' },
  })

  return pools.map((p) => ({
    id: p.id,
    name: p.name,
    benefitTitle: p.redemption[0]?.benefit.title ?? '—',
    totalCodes: p.totalCodes,
    availableCodes: p.availableCodes,
    lowStockThreshold: p.lowStockThreshold,
    isActive: p.isActive,
  }))
}

// CR-009: Detaljvisning av én kode-pool med alle koder.
export async function getAdminCodePoolDetail(poolId: string): Promise<AdminCodePoolDetail | null> {
  const pool = await prisma.codePool.findFirst({
    where: { id: poolId },
    include: {
      redemption: {
        include: { benefit: { select: { id: true, title: true } } },
      },
      codes: {
        orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          codeValue: true,
          status: true,
          assignedSessionId: true,
          assignedAt: true,
          createdAt: true,
        },
      },
    },
  })
  if (!pool) return null

  return {
    id: pool.id,
    name: pool.name,
    benefitId: pool.redemption[0]?.benefit.id ?? '',
    benefitTitle: pool.redemption[0]?.benefit.title ?? '—',
    description: pool.description,
    totalCodes: pool.totalCodes,
    availableCodes: pool.availableCodes,
    lowStockThreshold: pool.lowStockThreshold,
    isActive: pool.isActive,
    codes: pool.codes.map((c) => ({
      id: c.id,
      codeValue: c.codeValue,
      status: c.status,
      assignedSessionId: c.assignedSessionId,
      assignedAt: c.assignedAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
    })),
  }
}

// ---- Leads ----

export async function getAdminLeads(filters?: {
  status?: LeadStatus
  advertiserId?: string
}): Promise<AdminLeadRow[]> {
  const leads = await prisma.lead.findMany({
    where: {
      deletedAt: null,
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.advertiserId ? { advertiserId: filters.advertiserId } : {}),
    },
    include: {
      advertiser: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  })

  const benefitIds = Array.from(new Set(leads.map((l) => l.benefitId)))
  const benefits = await prisma.benefit.findMany({
    where: { id: { in: benefitIds } },
    select: { id: true, title: true },
  })
  const benefitMap = new Map(benefits.map((b) => [b.id, b.title]))

  return leads.map((l) => ({
    id: l.id,
    benefitTitle: benefitMap.get(l.benefitId) ?? '—',
    advertiserName: l.advertiser.name,
    status: l.status,
    consentAcceptedAt: l.consentAcceptedAt.toISOString(),
    createdAt: l.createdAt.toISOString(),
  }))
}

// ---- Web-løpet (CR-025) ----

export async function getAdminFlowPages(): Promise<AdminFlowPageRow[]> {
  const pages = await prisma.flowPage.findMany({
    where: { deletedAt: null },
    include: {
      _count: { select: { views: { where: { format: 'web_card', variant: 'standard' } } } },
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })
  return pages.map((p) => ({
    id: p.id,
    name: p.name,
    text: p.text,
    imageUrl: p.imageUrl,
    imageAlt: p.imageAlt,
    sortOrder: p.sortOrder,
    isActive: p.isActive,
    placedCount: p._count.views,
    createdAt: p.createdAt.toISOString(),
  }))
}

export async function getAdminFlowPageById(id: string) {
  return prisma.flowPage.findFirst({ where: { id, deletedAt: null } })
}

// For the page select on the benefit form: not deleted, inactive ones included (and marked).
export async function getAdminFlowPageOptions(): Promise<AdminFlowPageOption[]> {
  const pages = await prisma.flowPage.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })
  return pages
}

export async function getAdminBenefitProducts(benefitId: string): Promise<AdminProductRow[]> {
  const products = await prisma.product.findMany({
    where: { benefitId, deletedAt: null },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    text: p.text,
    priceText: p.priceText,
    sortOrder: p.sortOrder,
    isActive: p.isActive,
  }))
}

// The web placement lives on the web_card/standard view row (CR-022).
export async function getAdminWebPlacement(benefitId: string) {
  const view = await prisma.benefitView.findUnique({
    where: { benefitId_format_variant: { benefitId, format: 'web_card', variant: 'standard' } },
    include: { page: { select: { id: true, isActive: true, deletedAt: true } } },
  })
  return view
}

// CR-027: the stored content overrides of a benefit, one row per format (variant standard).
export async function getAdminBenefitViewOverrides(benefitId: string) {
  return prisma.benefitView.findMany({
    where: { benefitId, variant: 'standard', format: { in: Object.keys(VIEW_FORMATS) } },
    select: { format: true, title: true, text: true, imageUrl: true, imageAlt: true, badgeText: true },
  })
}

// CR-029: id and title of the (not deleted) benefits, for the cross-sell condition in the
// targeting section of the benefit and hero forms.
export async function getBenefitOptions(): Promise<{ id: string; title: string }[]> {
  return prisma.benefit.findMany({
    where: { deletedAt: null },
    select: { id: true, title: true },
    orderBy: { title: 'asc' },
  })
}

// CR-030: A/B tests of a benefit (content tests: the benefit id is part of the scope key) and the
// content of their non-standard variants, for the "A/B-test" section on the edit page.
export async function getAdminBenefitAbTests(benefitId: string) {
  const [tests, variantViews] = await Promise.all([
    prisma.abTest.findMany({
      where: { scopeKey: { startsWith: `content:${benefitId}:` } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.benefitView.findMany({
      where: { benefitId, variant: { not: 'standard' }, format: { in: Object.keys(VIEW_FORMATS) } },
      select: { format: true, variant: true, title: true, text: true, imageUrl: true, imageAlt: true, badgeText: true },
    }),
  ])
  return {
    tests: tests.map((t) => ({
      id: t.id,
      name: t.name,
      status: t.status,
      format: (t.scope as { format?: string } | null)?.format ?? '',
      variants: t.variants as { key: string; weight: number }[],
      primaryGoal: t.primaryGoal,
    })),
    variantViews,
  }
}
