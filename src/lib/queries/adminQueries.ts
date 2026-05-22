// CR-004: Admin-facing queries. Never use these in consumer-app routes.

import { prisma } from '@/lib/db/client'
import type {
  AdminDashboardStats,
  AdminBenefitRow,
  AdminAdvertiserRow,
  AdminCodePoolRow,
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
      redemption: {
        include: { codePool: true, leadForm: true },
      },
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
  return prisma.hero.findFirst({ where: { id, deletedAt: null } })
}

// ---- Kategorier (for dropdowns) ----

export async function getAdminCategories() {
  return prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true, slug: true },
  })
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
