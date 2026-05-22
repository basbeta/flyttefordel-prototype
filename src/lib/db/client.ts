// ============================================================
// FORDELSKLUBBEN — Prisma Client
// CR-001: Fase 1 Grunnmur
//
// MIGRATION NOTE:
//   This is the single point of database access in the application.
//   When migrating to a different PostgreSQL provider:
//     1. Update DATABASE_URL (and DIRECT_URL) in your environment variables.
//     2. Run: npx prisma migrate deploy
//     3. No changes required in this file or anywhere else in the codebase.
//
// FREE TIER NOTE (Supabase):
//   Supabase pauses free-tier projects after 1 week of inactivity.
//   The global singleton pattern below prevents connection pool exhaustion
//   during local development hot reloads. It does not solve the pause issue.
//   To prevent the pause in production: upgrade to Supabase Pro, or set up
//   a scheduled ping. Remove this comment when migrating to a paid tier.
// ============================================================

import { PrismaClient } from '@prisma/client'

declare global {
  // Allow the global to persist across hot reloads in development.
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma
}
