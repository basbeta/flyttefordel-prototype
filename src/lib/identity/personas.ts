// CR-028: The 5 seeded test persons (docs/10 §3.3). Pure and testable. The seed script
// (prisma/seed-test-persons.ts) writes them to the database, where login reads them.
// Everything is obviously fictive. Moved dates are relative to the seed run so "recently moved"
// stays recent when the seed is run again.

import type { UserMovingStatus } from '@prisma/client'
import type { HousingType } from './types'

export type Persona = {
  seedKey: string
  name: string
  postcode: string | null
  movingStatus: UserMovingStatus
  // Days before the seed run. null = no moved date.
  movedDaysAgo: number | null
  fromAddress: string | null
  toAddress: string | null
  housingType: HousingType | null
}

export const PERSONAS: readonly Persona[] = [
  {
    seedKey: 'test-nylig-flyttet',
    name: 'Test Nylig-Flyttet',
    postcode: '0150',
    movingStatus: 'recently_moved',
    movedDaysAgo: 10,
    fromAddress: 'Testveien 1, 0550 Oslo',
    toAddress: 'Testgata 2, 0150 Oslo',
    housingType: 'leilighet',
  },
  {
    seedKey: 'test-flyttet-tidligere',
    name: 'Test Flyttet-Tidligere',
    postcode: '5003',
    movingStatus: 'moved_past',
    movedDaysAgo: 240,
    fromAddress: 'Testveien 3, 5020 Bergen',
    toAddress: 'Testgata 4, 5003 Bergen',
    housingType: 'enebolig',
  },
  {
    seedKey: 'test-ikke-flytter',
    name: 'Test Ikke-Flytter',
    postcode: '7010',
    movingStatus: 'not_moving',
    movedDaysAgo: null,
    fromAddress: null,
    toAddress: null,
    housingType: 'rekkehus',
  },
  {
    seedKey: 'test-ukjent',
    name: 'Test Ukjent',
    postcode: null,
    movingStatus: 'unknown',
    movedDaysAgo: null,
    fromAddress: null,
    toAddress: null,
    housingType: null,
  },
  {
    seedKey: 'test-nord-norge',
    name: 'Test Nord-Norge',
    postcode: '9008',
    movingStatus: 'recently_moved',
    movedDaysAgo: 40,
    fromAddress: 'Testveien 5, 9010 Tromsø',
    toAddress: 'Testgata 6, 9008 Tromsø',
    housingType: 'enebolig',
  },
]

// The moved date (a calendar date at UTC midnight) for a persona on a given run date.
export function movedAtFor(persona: Persona, now: Date): Date | null {
  if (persona.movedDaysAgo === null) return null
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  d.setUTCDate(d.getUTCDate() - persona.movedDaysAgo)
  return d
}

// Fields written on every seed run (create AND update). Never includes email: that belongs to
// whoever logged in last.
export function personaFields(persona: Persona, now: Date) {
  return {
    name: persona.name,
    postcode: persona.postcode,
    movingStatus: persona.movingStatus,
    movedAt: movedAtFor(persona, now),
    fromAddress: persona.fromAddress,
    toAddress: persona.toAddress,
    housingType: persona.housingType,
    isTest: true,
  }
}
