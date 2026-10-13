// CR-002: Fase 2 — Fordeler i app
// CR-003: Fase 3 — isSaved join added (requires sessionId)
// CR-005: Fase 5 — Targeting filter added (in-memory after DB fetch)
// CR-021: Card list content resolved via BenefitView overrides (app_card), default = inherit.
// Public-facing benefit queries — maps Prisma objects to API response types.
// Pages call these directly as Server Components. Never import prisma directly in components.

import QRCode from 'qrcode'
import { prisma } from '@/lib/db/client'
import { isQualified } from '@/lib/selection'
import { contentScopeKey, resolveActiveAssignments } from '@/lib/abtest'
import { resolveBenefitView, type BenefitViewRow } from '@/lib/views'
import type { TargetingSession } from '@/lib/targeting'
import type { BenefitCard, BenefitDetail, CategorySummary, BenefitRedemptionConfig, LeadFormField } from '@/types/app'
import type { BenefitRedemptionType, Prisma } from '@prisma/client'

type BenefitListSession = TargetingSession & { sessionId: string; personId?: string | null }

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

export async function getActiveBenefits(
  categorySlug?: string,
  session?: BenefitListSession | null,
): Promise<BenefitCard[]> {
  const now = new Date()
  const [benefits, savedIds] = await Promise.all([
    prisma.benefit.findMany({
      where: {
        status: 'active',
        deletedAt: null,
        // CR-025: benefits switched off for the app are left out of the lists.
        showInApp: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
        ...(categorySlug ? { category: { slug: categorySlug } } : {}),
      },
      include: {
        advertiser: { select: { id: true, name: true, slug: true, logoUrl: true, websiteUrl: true } },
        category: { select: { id: true, name: true, slug: true, icon: true, sortOrder: true } },
        targeting: true,
        views: { where: { format: 'app_card' } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    }),
    session?.sessionId
      ? prisma.savedBenefit
          .findMany({
            where: { sessionId: session.sessionId, deletedAt: null },
            select: { benefitId: true },
          })
          .then((rows) => new Set(rows.map((r) => r.benefitId)))
      : Promise.resolve(new Set<string>()),
  ])
  // CR-029: the whole session (incl. moved date, housing type and earlier choices) goes to the
  // selection, not only postcode and moving status.
  const person: TargetingSession = session ?? { postcode: null, movingStatus: 'unknown' }
  const qualified = benefits.filter((b) => isQualified(b.targeting, person, now))
  // CR-030: a running content test picks the variant of the card for this person.
  const variants = await getAppCardVariants(session?.personId ?? null, qualified.map((b) => b.id))
  return qualified.map((b) => ({
    ...mapBenefitCard(withAppCardView(b, variants.get(b.id))),
    isSaved: savedIds.has(b.id),
  }))
}

// ---- Benefit detail ----

export async function getBenefitBySlug(
  slug: string,
  sessionId?: string,
): Promise<BenefitDetail | null> {
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

  const [redemption, isSaved] = await Promise.all([
    Promise.resolve(benefit.redemption ? mapRedemptionConfig(benefit.redemption) : null),
    sessionId
      ? prisma.savedBenefit
          .findFirst({
            where: { sessionId, benefitId: benefit.id, deletedAt: null },
            select: { id: true },
          })
          .then(Boolean)
      : Promise.resolve(false),
  ])

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
    isSaved,
    longDescription: benefit.longDescription,
    termsText: benefit.termsText,
    usageInstruction: benefit.usageInstruction,
    consentText: benefit.consentText,
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

export function mapBenefitCardFromSaved(benefit: BenefitWithRelations): BenefitCard {
  return mapBenefitCard(benefit)
}

// CR-021 / CR-027: the card content on the app surface = override from the benefit's app_card
// view, else the benefit's own content. One place, so the list, "I nærheten" and "Lagret"
// always show the same card.
type CardContentSource = {
  title: string
  shortDescription: string
  imageUrl: string | null
  imageAlt: string | null
  badgeText: string | null
  views: readonly BenefitViewRow[]
}

export function withAppCardView<T extends CardContentSource>(benefit: T, variant?: string): T {
  const view = resolveBenefitView(benefit, benefit.views, 'app_card', variant)
  return {
    ...benefit,
    title: view.title,
    shortDescription: view.text,
    imageUrl: view.imageUrl,
    imageAlt: view.imageAlt,
    badgeText: view.badgeText,
  }
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
    isSaved: false, // default — callers override with actual session data
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

// CR-030: benefit id -> assigned variant for the app card (only benefits with a running test).
export async function getAppCardVariants(
  personId: string | null,
  benefitIds: readonly string[],
): Promise<Map<string, string>> {
  const keys = benefitIds.map((id) => contentScopeKey(id, 'app_card'))
  const assignments = await resolveActiveAssignments(personId, keys)
  const result = new Map<string, string>()
  for (const id of benefitIds) {
    const a = assignments.get(contentScopeKey(id, 'app_card'))
    if (a) result.set(id, a.variant)
  }
  return result
}
