// ============================================================
// FORDELSKLUBBEN — Admin Backoffice-typer
//
// TILHØRIGHET: Admin Backoffice — fordelsklubben-admin
//   Moduler som bruker disse typene:
//   - src/app/admin/
//   - src/components/admin/
//   - src/app/api/admin/ (fremtidige admin-API-ruter, auth-beskyttet)
//
// IKKE IMPORTER FRA src/types/app.ts her.
//
// VED PROSJEKT-SPLIT:
//   Kopier denne filen til fordelsklubben-admin prosjektet.
//   Ingen endringer er nødvendige.
//
// NAVNEKONVENSJON:
//   Alle typer i denne filen har prefiks "Admin".
//   Dette gjør det umiddelbart synlig i kode hvilke typer som
//   tilhører admin-prosjektet og aldri skal havne i consumer-app-bundles.
// ============================================================

// ---- Dashboard ----

export type AdminDashboardStats = {
  activeBenefitsCount: number
  scheduledBenefitsCount: number
  expiringSoonCount: number
  newLeadsCount: number
  lowCodePools: Array<{ id: string; name: string; availableCodes: number }>
}

// ---- Fordeler (admin-visning) ----
// Skilles fra BenefitCard i app.ts: admin-visningen inneholder
// interne felter (status, priority, deletedAt) som aldri eksponeres i app.

export type AdminBenefitRow = {
  id: string
  title: string
  slug: string
  status: import('@prisma/client').BenefitStatus
  advertiserName: string
  categoryName: string
  priority: number
  startsAt: string | null
  endsAt: string | null
  createdAt: string
  // CR-016: felter for beregnet visningsstatus (se /lib/benefits/displayStatus.ts)
  redemptionType: import('@prisma/client').BenefitRedemptionType
  redemption: {
    genericCode: string | null
    externalUrl: string | null
    qrValue: string | null
    codePoolId: string | null
    leadFormId: string | null
    codePool: { availableCodes: number } | null
  } | null
}

export type AdminBenefitDetail = AdminBenefitRow & {
  shortDescription: string
  longDescription: string
  redemptionType: import('@prisma/client').BenefitRedemptionType
  visibility: import('@prisma/client').BenefitVisibility
  isFeatured: boolean
  isTimeLimited: boolean
  termsText: string | null
  usageInstruction: string | null
  consentText: string | null
  imageUrl: string | null
  // CR-010: Økonomifelter
  campaignFee: number | null
  pricePerView: number | null
  pricePerLead: number | null
  pricePerRedemption: number | null
}

// CR-010: Lønnsomhetsanalyse

export type AdminBenefitProfitability = {
  id: string
  title: string
  slug: string
  advertiserName: string
  redemptionType: string
  views: number
  leads: number
  redemptions: number
  campaignFee: number | null
  pricePerView: number | null
  pricePerLead: number | null
  pricePerRedemption: number | null
  revenue: number
  hasPricing: boolean
}

export type AdminAdvertiserProfitability = {
  id: string
  name: string
  campaignCount: number
  totalViews: number
  totalLeads: number
  totalRedemptions: number
  totalRevenue: number
  avgCPL: number | null
  avgCPV: number | null
}

export type AdminTypeProfitability = {
  redemptionType: string
  campaignCount: number
  totalViews: number
  totalLeads: number
  totalRedemptions: number
  totalRevenue: number
  avgConversionRate: number
}

export type AdminSessionLTV = {
  bucket: string
  sessionCount: number
  avgRevenue: number
}

export type AdminProfitabilityData = {
  benefits: AdminBenefitProfitability[]
  advertisers: AdminAdvertiserProfitability[]
  byType: AdminTypeProfitability[]
  totalRevenue: number
  pricedCampaigns: number
  totalCampaigns: number
}

// ---- Annonsører (admin-visning) ----

export type AdminAdvertiserRow = {
  id: string
  name: string
  slug: string
  isActive: boolean
  contactEmail: string | null
  benefitCount: number
  createdAt: string
}

// ---- Koder (admin-visning) ----

export type AdminCodePoolRow = {
  id: string
  name: string
  benefitTitle: string
  totalCodes: number
  availableCodes: number
  lowStockThreshold: number
  isActive: boolean
}

// CR-009: Detaljvisning av én pool — inkluderer alle koder.
export type AdminCodeRow = {
  id: string
  codeValue: string
  status: import('@prisma/client').CodeStatus
  assignedSessionId: string | null
  assignedAt: string | null
  createdAt: string
}

export type AdminCodePoolDetail = AdminCodePoolRow & {
  benefitId: string
  description: string | null
  codes: AdminCodeRow[]
}

// ---- Analytics ----

export type AdminAnalyticsRow = {
  id: string
  title: string
  slug: string
  views: number
  codeRevealed: number
  codeCopied: number
  leads: number
  saved: number
  conversionRate: number
}

export type AdminAnalyticsData = {
  rows: AdminAnalyticsRow[]
  totalViews: number
  totalRedemptions: number
  totalLeads: number
}

// ---- Kategorier (admin-visning) ----

export type AdminCategoryRow = {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  sortOrder: number
  isActive: boolean
  benefitCount: number
  createdAt: string
}

// ---- Leads (admin-visning) ----
// formData er aldri loggført i klartekst (NFR-003).

export type AdminLeadRow = {
  id: string
  benefitTitle: string
  advertiserName: string
  status: import('@prisma/client').LeadStatus
  consentAcceptedAt: string
  createdAt: string
}

// ---- Web-løpet (CR-025) ----

export type AdminFlowPageRow = {
  id: string
  name: string
  text: string | null
  imageUrl: string | null
  imageAlt: string | null
  sortOrder: number
  isActive: boolean
  // Number of benefits placed on the page (web_card/standard rows).
  placedCount: number
  createdAt: string
}

export type AdminFlowPageOption = {
  id: string
  name: string
  isActive: boolean
}

export type AdminProductRow = {
  id: string
  name: string
  text: string | null
  priceText: string | null
  sortOrder: number
  isActive: boolean
}

export type AdminWebPlacement = {
  pageId: string | null
  sortOrder: number
}
