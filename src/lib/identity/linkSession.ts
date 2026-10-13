// CR-028: Link the anonymous session to the logged-in person. targeting (matchesSession) reads
// postcode and movingStatus from the session, so the session is filled from the person and the
// existing targeting works unchanged for a logged-in person.

import { prisma } from '@/lib/db/client'
import type { PersonSummary } from './types'

export async function linkSessionToPerson(anonymousId: string, person: PersonSummary): Promise<void> {
  const data = {
    userId: person.id,
    postcode: person.postcode,
    movingStatus: person.movingStatus,
    lastSeenAt: new Date(),
  }
  await prisma.userSession.upsert({
    where: { anonymousId },
    update: data,
    create: { anonymousId, ...data },
  })
}
