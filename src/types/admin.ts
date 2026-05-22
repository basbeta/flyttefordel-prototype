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
