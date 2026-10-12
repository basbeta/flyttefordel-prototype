// ============================================================
// FORDELSKLUBBEN — Consumer App-typer
//
// TILHØRIGHET: Consumer PWA — fordelsklubben-app
//   Moduler som bruker disse typene:
//   - src/app/(mobile)/
//   - src/components/mobile/
//   - src/lib/queries/  (public-facing queries)
//   - src/lib/tracking/
//   - src/app/api/benefits/ (consumer-facing API routes)
//   - src/app/api/track/
//
// IKKE IMPORTER FRA src/types/admin.ts her.
//
// VED PROSJEKT-SPLIT:
//   Kopier denne filen til fordelsklubben-app prosjektet.
//   Ingen endringer er nødvendige — alle referanser er selvstendige.
//
// NAVNEKONVENSJON:
//   App-typer har ikke prefiks. Kategorien fremgår av filnavnet (app.ts).
//   Admin-typer er alltid prefixet "Admin" (se admin.ts).
// ============================================================

import type { BenefitRedemptionType, CTAType, UserMovingStatus } from '@prisma/client'

// ---- Navigasjon ----

export type NavTab = 'home' | 'benefits' | 'nearby' | 'saved' | 'profile'

// ---- Sammendragstyper — brukes på kortvisninger ----

export type CategorySummary = {
  id: string
  name: string
  slug: string
  icon: string | null
  sortOrder: number
}

export type AdvertiserSummary = {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  websiteUrl: string | null
}

// ---- Fordelstyper — API-responsformer ----
// Disse er aldri rå Prisma-objekter. API-laget mapper alltid til disse typene
// slik at vi kontrollerer hvilke felter som eksponeres til klienten.

export type BenefitCard = {
  id: string
  title: string
  slug: string
  shortDescription: string
  imageUrl: string | null
  imageAlt: string | null
  badgeText: string | null
  redemptionType: BenefitRedemptionType
  endsAt: string | null
  isTimeLimited: boolean
  isFeatured: boolean
  isSaved: boolean
  advertiser: AdvertiserSummary
  category: CategorySummary
}

export type BenefitDetail = BenefitCard & {
  longDescription: string
  termsText: string | null
  usageInstruction: string | null
  consentText: string | null
  redemption: BenefitRedemptionConfig | null
}

export type BenefitRedemptionConfig = {
  type: BenefitRedemptionType
  genericCode?: string
  externalUrl?: string
  qrValue?: string
  qrImageUrl?: string
  ctaLabel: string | null
  opensInNewTab: boolean
  codePoolAvailable?: boolean
  leadFormFields?: LeadFormField[]
}

export type LeadFormField = {
  name: string
  label: string
  type: 'text' | 'email' | 'tel' | 'textarea' | 'checkbox'
  required: boolean
}

// ---- Heroer ----

export type HeroCard = {
  id: string
  title: string
  description: string | null
  imageUrl: string | null
  imageAlt: string | null
  ctaLabel: string | null
  ctaType: CTAType
  ctaTarget: string | null
  isFallback: boolean
}

// ---- Bruker / sesjon ----

export type UserProfile = {
  id?: string
  anonymousId: string
  postcode: string | null
  movingStatus: UserMovingStatus
}

// ---- Web-løpet (CR-022) — smale visningsmodeller, aldri rå Prisma-objekter ----

export type WebFlowProduct = {
  id: string
  name: string
  text: string | null
  priceText: string | null
}

export type WebFlowCard = {
  benefitId: string
  slug: string
  title: string
  text: string
  imageUrl: string | null
  imageAlt: string | null
  badgeText: string | null
  termsText: string | null
  advertiser: { name: string; logoUrl: string | null }
  products: WebFlowProduct[]
}

export type WebFlowPage = {
  id: string
  name: string
  text: string | null
  imageUrl: string | null
  imageAlt: string | null
  cards: WebFlowCard[]
}
