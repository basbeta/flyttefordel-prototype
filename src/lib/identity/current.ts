// CR-028: The logged-in person for Server Components and route handlers. Middleware has already
// verified the token and sets x-person-id (a client-sent value is removed there), so this only
// reads the header and loads the person. null = not logged in (or the person no longer exists).

import { headers } from 'next/headers'
import { getIdentityProvider } from './index'
import { PERSON_ID_HEADER } from './token'
import type { Person } from './types'

export { getPersonIdFromRequest } from './token'

export async function getCurrentPersonId(): Promise<string | null> {
  return (await headers()).get(PERSON_ID_HEADER)
}

export async function getCurrentPerson(): Promise<Person | null> {
  const personId = await getCurrentPersonId()
  if (!personId) return null
  try {
    return await getIdentityProvider().getPerson(personId)
  } catch {
    return null
  }
}
