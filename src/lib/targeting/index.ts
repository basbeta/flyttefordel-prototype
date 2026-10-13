// CR-005: Targeting evaluation — pure function, no I/O.
// Determines whether a benefit or hero should be shown to a given session.
// CR-029: The logic now lives in /lib/selection (isQualified). matchesSession is kept as a thin
// wrapper with the same behaviour for rules without the new fields, so older callers and tests
// are unchanged.

import { isQualified } from '@/lib/selection/isQualified'
import type { SelectionPerson, SelectionRule } from '@/lib/selection/types'

// The person/session data targeting reads. postcode and movingStatus are required, the CR-029
// fields (moved date, housing type, earlier choices) are optional.
export type TargetingSession = SelectionPerson

// Returns true if the session matches the targeting rule.
// null/undefined rule means no targeting — visible to all.
export function matchesSession(
  rule: SelectionRule | null | undefined,
  session: TargetingSession,
  now: Date = new Date(),
): boolean {
  return isQualified(rule, session, now)
}
