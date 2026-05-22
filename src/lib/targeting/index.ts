// CR-005: Targeting evaluation — pure function, no I/O.
// Determines whether a benefit or hero should be shown to a given session.

type PostcodeRange = { from: string; to: string }

export type TargetingSession = {
  postcode: string | null
  movingStatus: string
}

type TargetingRuleInput = {
  appliesNationally: boolean
  includeUnknownLocation: boolean
  postcodes: unknown
  postcodeRanges: unknown
  movingStatuses: unknown
}

function inPostcodeList(postcodes: string[], ranges: PostcodeRange[], code: string): boolean {
  if (postcodes.includes(code)) return true
  return ranges.some((r) => code >= r.from && code <= r.to)
}

// Returns true if the session matches the targeting rule.
// null/undefined rule means no targeting — visible to all.
export function matchesSession(
  rule: TargetingRuleInput | null | undefined,
  session: TargetingSession,
): boolean {
  if (!rule) return true
  if (rule.appliesNationally) return true

  const postcodes = Array.isArray(rule.postcodes) ? (rule.postcodes as string[]) : []
  const ranges = Array.isArray(rule.postcodeRanges) ? (rule.postcodeRanges as PostcodeRange[]) : []
  const segments = Array.isArray(rule.movingStatuses) ? (rule.movingStatuses as string[]) : []

  const hasPostcodeRule = postcodes.length > 0 || ranges.length > 0
  const hasSegmentRule = segments.length > 0

  // Rule exists but has no criteria — visible to all
  if (!hasPostcodeRule && !hasSegmentRule) return true

  // User has no location data — respect includeUnknownLocation
  if (!session.postcode) return rule.includeUnknownLocation

  if (hasPostcodeRule && !inPostcodeList(postcodes, ranges, session.postcode)) return false
  if (hasSegmentRule && !segments.includes(session.movingStatus)) return false

  return true
}
