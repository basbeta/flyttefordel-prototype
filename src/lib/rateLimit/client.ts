// CR-014: Lazy Redis-klient for rate limiting.
//
// MIGRATION NOTE: konstruksjonen er lazy (kun kjørt når getRedisClient()
// faktisk kalles), av samme grunn som src/lib/db/client.ts og
// src/lib/storage/client.ts: Next.js evaluerer moduler under `next build`
// sin page-data-collection, og modulet må aldri kunne krasje bygget bare
// fordi REDIS_URL mangler der.

import Redis from 'ioredis'

export function getRedisUrl(): string | null {
  return process.env.REDIS_URL ?? null
}

let cachedClient: Redis | null = null

export function getRedisClient(): Redis {
  if (cachedClient) return cachedClient

  const url = getRedisUrl()
  if (!url) {
    throw new Error('Redis er ikke konfigurert — REDIS_URL må være satt')
  }

  // maxRetriesPerRequest: 1 — kommandoer skal feile raskt (ikke henge/
  // køe) slik at checkRateLimit sin fail-open-logikk faktisk trer i
  // kraft innen rimelig tid, i stedet for å blokkere requesten mens
  // ioredis prøver på nytt i bakgrunnen.
  cachedClient = new Redis(url, {
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
  })
  cachedClient.on('error', (err) => {
    console.error('[rateLimit] Redis-tilkoblingsfeil:', err)
  })
  return cachedClient
}
