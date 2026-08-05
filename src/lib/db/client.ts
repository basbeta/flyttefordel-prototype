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
// CR-011 (Hetzner/Coolify): on a long-running container, a stalled DB
// connection or query hangs the request forever instead of being killed by
// a platform-level function timeout (as Vercel did). `connect_timeout` and
// `socket_timeout` are appended to DATABASE_URL below if not already set, so
// this is enforced regardless of what the Coolify env var value contains.
// ============================================================

import { PrismaClient } from '@prisma/client'

declare global {
  // Allow the global to persist across hot reloads in development.
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

export function withConnectionTimeouts(url: string): string {
  try {
    const parsed = new URL(url)
    if (!parsed.searchParams.has('connect_timeout')) {
      parsed.searchParams.set('connect_timeout', '10')
    }
    if (!parsed.searchParams.has('socket_timeout')) {
      parsed.searchParams.set('socket_timeout', '10')
    }
    return parsed.toString()
  } catch {
    return url
  }
}

// Next.js evaluates this module during `next build`'s page-data collection,
// when DATABASE_URL may not be set (e.g. it's build-unavailable in Coolify,
// or absent in a local build). Prisma rejects `{ datasources: { db: { url:
// undefined } } }` outright, so the whole `datasources` key is omitted
// rather than passed with an undefined url — module load must never crash;
// Prisma itself surfaces a clear error at actual query time instead.
const databaseUrl = process.env.DATABASE_URL

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    ...(databaseUrl
      ? { datasources: { db: { url: withConnectionTimeouts(databaseUrl) } } }
      : {}),
  })

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma
}
