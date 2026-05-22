// ============================================================
// FORDELSKLUBBEN — Delte API-typer
//
// TILHØRIGHET: Delt lag — brukes av begge prosjekter
//   - Consumer app (fordelsklubben-app)
//   - Admin backoffice (fordelsklubben-admin)
//
// VED PROSJEKT-SPLIT:
//   Disse typene hører til API-laget / backend-kontrakten.
//   Publiser som intern npm-pakke (@fordelsklubben/types) eller
//   kopier til begge prosjekter og hold dem i sync manuelt.
//
// NAVNEKONVENSJON:
//   Prefix "Api" brukes på alle delte API-kontrakttyper.
// ============================================================

// Prisma-enums re-eksporteres her for bruk i applikasjonskode
// uten direkte avhengighet til @prisma/client i UI-lag.
export {
  UserMovingStatus,
  BenefitStatus,
  BenefitRedemptionType,
  BenefitVisibility,
  LeadStatus,
  CodeStatus,
  HeroStatus,
  CTAType,
  AdminRole,
} from '@prisma/client'

// ---- API-feilkoder — brukes av alle Route Handlers ----

export const ApiError = {
  BENEFIT_NOT_FOUND: 'BENEFIT_NOT_FOUND',
  BENEFIT_NOT_ACTIVE: 'BENEFIT_NOT_ACTIVE',
  NOT_ELIGIBLE: 'NOT_ELIGIBLE',
  CODE_POOL_EMPTY: 'CODE_POOL_EMPTY',
  CODE_ALREADY_ASSIGNED: 'CODE_ALREADY_ASSIGNED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONSENT_REQUIRED: 'CONSENT_REQUIRED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const

export type ApiErrorCode = (typeof ApiError)[keyof typeof ApiError]

export type ApiErrorResponse = {
  error: ApiErrorCode
  message: string
  details?: unknown
}
