// CR-003: Anonymous session management.
// Reads anonymousId from x-anon-id request header (set by middleware),
// upserts UserSession in DB, and returns session data with profile preferences.
// Returns null on DB failure — app degrades gracefully without session context.

import { headers } from 'next/headers'
import { prisma } from '@/lib/db/client'
import { getIdentityProvider } from '@/lib/identity'
import { linkSessionToPerson } from '@/lib/identity/linkSession'
import { PERSON_ID_HEADER } from '@/lib/identity/token'
import type { UserMovingStatus } from '@prisma/client'

export const ANON_ID_COOKIE = 'anon_id'
export const ANON_ID_HEADER = 'x-anon-id'

export type SessionData = {
  sessionId: string
  anonymousId: string
  postcode: string | null
  movingStatus: UserMovingStatus
}

// CR-020: Read-only session lookup for route handlers that only need the id
// (event tracking). Never creates a session, returns null on any failure.
export async function getSessionIdFromRequest(request: Request): Promise<string | null> {
  const anonymousId = request.headers.get(ANON_ID_HEADER)
  if (!anonymousId) return null
  try {
    const session = await prisma.userSession.findUnique({
      where: { anonymousId },
      select: { id: true },
    })
    return session?.id ?? null
  } catch {
    return null
  }
}

export async function getOrCreateSession(): Promise<SessionData | null> {
  const requestHeaders = await headers()
  const anonymousId = requestHeaders.get(ANON_ID_HEADER)
  if (!anonymousId) return null
  // CR-028: set by middleware from the verified person_token (null = not logged in).
  const personId = requestHeaders.get(PERSON_ID_HEADER)

  try {
    const session = await prisma.userSession.upsert({
      where: { anonymousId },
      update: { lastSeenAt: new Date() },
      create: { anonymousId },
      select: {
        id: true,
        userId: true,
        anonymousId: true,
        postcode: true,
        movingStatus: true,
      },
    })

    // CR-028: a logged-in person whose session is not linked to them (e.g. the anon_id cookie
    // was cleared while the login is still valid): fill the session from the person again, so
    // targeting keeps following the person and not an empty session.
    if (personId && session.userId !== personId) {
      const person = await getIdentityProvider().getPerson(personId)
      if (person) {
        await linkSessionToPerson(anonymousId, person)
        return {
          sessionId: session.id,
          anonymousId: session.anonymousId,
          postcode: person.postcode,
          movingStatus: person.movingStatus,
        }
      }
    }

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
