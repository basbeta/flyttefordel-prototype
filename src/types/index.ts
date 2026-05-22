// ============================================================
// FORDELSKLUBBEN — Type-barrel
//
// Importér direkte fra underfilene for eksplisitt tilhørighet:
//   import type { BenefitCard }         from '@/types/app'    // Consumer app
//   import type { AdminDashboardStats } from '@/types/admin'  // Admin backoffice
//   import type { ApiErrorResponse }    from '@/types/api'    // Delt API-kontrakt
//
// Denne barrel-filen eksisterer for bakoverkompatibilitet i demo-fasen.
// VED PROSJEKT-SPLIT: slett denne filen og oppdater alle importer til
// å peke direkte på app.ts, admin.ts eller api.ts.
// ============================================================

export * from './app'
export * from './admin'
export * from './api'
