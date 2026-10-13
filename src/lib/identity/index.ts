// CR-028: Public API for the identity module.
// The provider is chosen by IDENTITY_PROVIDER (default "simulated"). An unknown value throws
// instead of silently falling back, so a typo can never pick the wrong login.

import { simulatedVipps } from './simulatedVipps'
import type { IdentityProvider } from './types'

export function getIdentityProvider(): IdentityProvider {
  const name = process.env.IDENTITY_PROVIDER ?? 'simulated'
  if (name === 'simulated') return simulatedVipps
  throw new Error(`Unknown IDENTITY_PROVIDER: ${name}`)
}

export type { IdentityProvider, Person, PersonSummary, NewPersonInput, HousingType } from './types'
export { HOUSING_TYPES } from './types'
export { PERSON_TOKEN_COOKIE, PERSON_COOKIE_MAX_AGE, signPersonToken, verifyPersonToken } from './token'
export { safeNext, LOGIN_PATH } from './safeNext'
export { loginSchema, newPersonSchema } from './schemas'
