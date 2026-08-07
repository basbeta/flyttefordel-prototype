// CR-014: Fixed-window rate limiting via Redis INCR + EXPIRE.
//
// Fail-open (bevisst, se change-requests/CR-014-rate-limiting.md punkt 4):
// hvis Redis er utilgjengelig, logges feilen og allowed=true returneres i
// stedet for å blokkere login/claim-code helt.

import { getRedisClient } from './client'

export type RateLimitResult = {
  allowed: boolean
  retryAfterSeconds: number
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  try {
    const redis = getRedisClient()
    const count = await redis.incr(key)
    if (count === 1) {
      await redis.expire(key, windowSeconds)
    }
    if (count <= limit) {
      return { allowed: true, retryAfterSeconds: 0 }
    }

    const ttl = await redis.ttl(key)
    return { allowed: false, retryAfterSeconds: ttl > 0 ? ttl : windowSeconds }
  } catch (err) {
    console.error('[rateLimit] checkRateLimit feilet, slipper forespørselen gjennom (fail-open):', err)
    return { allowed: true, retryAfterSeconds: 0 }
  }
}
