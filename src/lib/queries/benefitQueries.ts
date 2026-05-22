// CR-002: Fase 2 — Fordeler i app
// Public-facing benefit queries — maps Prisma objects to API response types.
// Pages call these directly as Server Components. Never import prisma directly in components.

import QRCode from 'qrcode'
import { prisma } from '@/lib/db/client'
import type { BenefitCard, BenefitDetail, CategorySummary, BenefitRedemptionConfig, LeadFormField } from '@/types/app'
import type { BenefitRedemptionType, Prisma } from '@prisma/client'

// ---- Categories ----

export async function getActiveCategories(): Promise<CategorySummary[]> {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  })
  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    icon: c.icon,
    sortOrder: c.sortOrder,
  }))
}

// ---- Benefits list ----

export async function getActiveBenefits(categorySlug?: string): Promise<BenefitCard[]> {
  const now = new Date()
  const benefits = await prisma.benefit.findMany({
    where: {
      status: 'active',
      deletedAt: null,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
      ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    },
    include: {
      advertiser: { select: { id: true, name: true, slug: true, logoUrl: true, websiteUrl: true } },
      category: { select: { id: true, name: true, slug: true, icon: true, sortOrder: true } },
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
  })
  return benefits.map(mapBenefitCard)
}

// ---- Benefit detail ----

export async function getBenefitBySlug(slug: string): Promise<BenefitDetail | null> {
  const now = new Date()
  // decodeURIComponent handles URL-encoded characters (e.g. ø → %C3%B8) from route params.
  const decodedSlug = decodeURIComponent(slug)
  const benefit = await prisma.benefit.findFirst({
    where: {
      slug: decodedSlug,
      status: 'active',
      deletedAt: null,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    include: {
      advertiser: { select: { id: true, name: true, slug: true, logoUrl: true, websiteUrl: true } },
      category: { select: { id: true, name: true, slug: true, icon: true, sortOrder: true } },
      redemption: {
        include: {
          codePool: { select: { availableCodes: true } },
          leadForm: { select: { fields: true } },
        },
      },
    },
  })
  if (!benefit) return null

  const redemption = benefit.redemption ? mapRedemptionConfig(benefit.redemption) : null

  // Generate QR code as data URL server-side so the client gets a plain <img> src.
  if (redemption?.type === 'qr_code' && redemption.qrValue && !redemption.qrImageUrl) {
    redemption.qrImageUrl = await QRCode.toDataURL(redemption.qrValue, {
      width: 256,
      margin: 2,
      color: { dark: '#1e1e1b', light: '#ffffff' },
    })
  }

  return {
    ...mapBenefitCard(benefit),
    longDescription: benefit.longDescription,
    termsText: benefit.termsText,
    usageInstruction: benefit.usageInstruction,
    consentText: benefit.consentText,
    isSaved: false, // Phase 2: auth not yet implemented — always false
    redemption,
  }
}

// ---- Mappers ----

type BenefitWithRelations = {
  id: string
  title: string
  slug: string
  shortDescription: string
  imageUrl: string | null
  imageAlt: string | null
  badgeText: string | null
  redemptionType: BenefitRedemptionType
  endsAt: Date | null
  isTimeLimited: boolean
  isFeatured: boolean
  advertiser: { id: string; name: string; slug: string; logoUrl: string | null; websiteUrl: string | null }
  category: { id: string; name: string; slug: string; icon: string | null; sortOrder: number }
}

function mapBenefitCard(benefit: BenefitWithRelations): BenefitCard {
  return {
    id: benefit.id,
    title: benefit.title,
    slug: benefit.slug,
    shortDescription: benefit.shortDescription,
    imageUrl: benefit.imageUrl,
    imageAlt: benefit.imageAlt,
    badgeText: benefit.badgeText,
    redemptionType: benefit.redemptionType,
    endsAt: benefit.endsAt?.toISOString() ?? null,
    isTimeLimited: benefit.isTimeLimited,
    isFeatured: benefit.isFeatured,
    advertiser: benefit.advertiser,
    category: benefit.category,
  }
}

type RedemptionWithRelations = {
  type: BenefitRedemptionType
  genericCode: string | null
  externalUrl: string | null
  qrValue: string | null
  qrImageUrl: string | null
  ctaLabel: string | null
  opensInNewTab: boolean
  codePool: { availableCodes: number } | null
  leadForm: { fields: Prisma.JsonValue } | null
}

function mapRedemptionConfig(redemption: RedemptionWithRelations): BenefitRedemptionConfig {
  return {
    type: redemption.type,
    genericCode: redemption.genericCode ?? undefined,
    externalUrl: redemption.externalUrl ?? undefined,
    qrValue: redemption.qrValue ?? undefined,
    qrImageUrl: redemption.qrImageUrl ?? undefined,
    ctaLabel: redemption.ctaLabel,
    opensInNewTab: redemption.opensInNewTab,
    codePoolAvailable: redemption.codePool != null ? redemption.codePool.availableCodes > 0 : undefined,
    leadFormFields: redemption.leadForm != null ? (redemption.leadForm.fields as LeadFormField[]) : undefined,
  }
}
