// CR-028: The identity contract. The rest of the app only knows this file, never how login is
// done. Real Vipps becomes a new implementation of IdentityProvider (docs/10 §3.3).

import type { UserMovingStatus } from '@prisma/client'

export const HOUSING_TYPES = ['enebolig', 'leilighet', 'rekkehus', 'annet'] as const
export type HousingType = (typeof HOUSING_TYPES)[number]

// Shown on the (public) login page. Deliberately has NO e-mail: the QA person types it in.
export type PersonSummary = {
  id: string
  name: string
  postcode: string | null
  movingStatus: UserMovingStatus
  movedAt: string | null // YYYY-MM-DD
  fromAddress: string | null
  toAddress: string | null
  housingType: string | null
  isTest: boolean
  seeded: boolean
}

// The logged-in person. Carries the e-mail (personal data), only for the person themselves.
export type Person = PersonSummary & { email: string | null }

export type NewPersonInput = {
  name: string
  postcode: string | null
  movingStatus: UserMovingStatus
  movedAt: string | null
  fromAddress: string | null
  toAddress: string | null
  housingType: HousingType | null
}

export interface IdentityProvider {
  // The persons that can be chosen on the login page.
  listPersons(): Promise<PersonSummary[]>
  // Complete the login for a chosen person. Stores the test e-mail on the person.
  // null = unknown person.
  login(input: { personId: string; email: string }): Promise<Person | null>
  createPerson(input: NewPersonInput): Promise<PersonSummary>
  getPerson(personId: string): Promise<Person | null>
}
