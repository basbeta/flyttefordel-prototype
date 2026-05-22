// CR-004: Admin-facing queries. Never use these in consumer-app routes.

import { prisma } from '@/lib/db/client'
import type {
  AdminDashboardStats,
  AdminAnalyticsData,
  AdminBenefitRow,
  AdminAdvertiserRow,
  AdminCategoryRow,
  AdminCodePoolRow,
  AdminCodePoolDetail,
  AdminLeadRow,
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

  return leads.map((l) => ({
    id: l.id,
    benefitTitle: '—', // benefitId on lead, not a relation — resolve separately if needed
    advertiserName: l.advertiser.name,
    status: l.status,
    consentAcceptedAt: l.consentAcceptedAt.toISOString(),
    createdAt: l.createdAt.toISOString(),
  }))
}
