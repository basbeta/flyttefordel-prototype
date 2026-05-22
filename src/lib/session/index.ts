// CR-003: Anonymous session management.
// Reads anonymousId from x-anon-id request header (set by middleware),
// upserts UserSession in DB, and returns session data with profile preferences.
// Returns null on DB failure — app degrades gracefully without session context.

import { headers } from 'next/headers'
import { prisma } from '@/lib/db/client'
import type { UserMovingStatus } from '@prisma/client'

export const ANON_ID_COOKIE = 'anon_id'
export const ANON_ID_HEADER = 'x-anon-id'

export type SessionData = {
  sessionId: string
  anonymousId: string
  postcode: string | null
  movingStatus: UserMovingStatus
}

export async function getOrCreateSession(): Promise<SessionData | null> {
  const anonymousId = headers().get(ANON_ID_HEADER)
  if (!anonymousId) return null

  try {
    const session = await prisma.userSession.upsert({
      where: { anonymousId },
      update: { lastSeenAt: new Date() },
      create: { anonymousId },
      select: {
        id: true,
        anonymousId: true,
        postcode: true,
        movingStatus: true,
      },
    })
    return {
      sessionId: session.id,
      anonymousId: session.anonymousId,
      postcode: session.postcode,
      movingStatus: session.movingStatus ?? 'unknown',
    }
  } catch {
    // Graceful degradation: Supabase free tier may pause after inactivity.
    return null
  }
}
