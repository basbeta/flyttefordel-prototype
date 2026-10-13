// CR-029: The selection function. Pure, no I/O. Given a rule, a person and a time: does the
// person qualify?
//
// Superset of the old matchesSession (CR-005). A rule is qualified when
//   1. the OLD part passes: postcode, postcode ranges, moving status, appliesNationally and
//      includeUnknownLocation, exactly as before, AND
//   2. every NEW criterion passes: days since move, housing type, cross-sell and hide-if-chosen.
// A rule without any new fields gives the same answer as before. The new criteria are
// independent of appliesNationally (that flag is about location only).
//
// Missing person data is strict: a rule that needs a moved date or a housing type does not
// qualify a person who has none. Postcode keeps its own includeUnknownLocation rule.

import type {
  SelectionCriterion,
  SelectionExplanation,
  SelectionPerson,
  SelectionRule,
} from './types'

type PostcodeRange = { from: string; to: string }

function inPostcodeList(postcodes: string[], ranges: PostcodeRange[], code: string): boolean {
  if (postcodes.includes(code)) return true
  return ranges.some((r) => code >= r.from && code <= r.to)
}

function asStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}

// Whole calendar days in UTC from one date to another (the time of day is ignored).
export function daysBetweenUtc(from: Date, to: Date): number {
  const a = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())
  const b = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate())
  return Math.round((b - a) / 86_400_000)
}

function toSet(value: SelectionPerson['chosenBenefitIds']): ReadonlySet<string> {
  if (!value) return new Set()
  return value instanceof Set ? value : new Set(value as readonly string[])
}

// The old part (CR-005), unchanged in behaviour. Reports which criteria failed.
function legacyFailures(rule: SelectionRule, person: SelectionPerson): SelectionCriterion[] {
  if (rule.appliesNationally) return []

  const postcodes = Array.isArray(rule.postcodes) ? (rule.postcodes as string[]) : []
  const ranges = Array.isArray(rule.postcodeRanges) ? (rule.postcodeRanges as PostcodeRange[]) : []
  const segments = Array.isArray(rule.movingStatuses) ? (rule.movingStatuses as string[]) : []

  const hasPostcodeRule = postcodes.length > 0 || ranges.length > 0
  const hasSegmentRule = segments.length > 0

  // Rule exists but has no criteria: visible to all.
  if (!hasPostcodeRule && !hasSegmentRule) return []

  // The person has no location data: respect includeUnknownLocation (and, as before, the moving
  // status is not checked for them).
  if (!person.postcode) return rule.includeUnknownLocation ? [] : ['unknownLocation']

  const failed: SelectionCriterion[] = []
  if (hasPostcodeRule && !inPostcodeList(postcodes, ranges, person.postcode)) failed.push('postcode')
  if (hasSegmentRule && !segments.includes(person.movingStatus)) failed.push('movingStatus')
  return failed
}

// The new part (CR-029).
function newFailures(rule: SelectionRule, person: SelectionPerson, now: Date): SelectionCriterion[] {
  const failed: SelectionCriterion[] = []

  const min = typeof rule.daysSinceMoveMin === 'number' ? rule.daysSinceMoveMin : null
  const max = typeof rule.daysSinceMoveMax === 'number' ? rule.daysSinceMoveMax : null
  if (min !== null || max !== null) {
    if (!person.movedAt) {
      failed.push('daysSinceMove')
    } else {
      const days = daysBetweenUtc(person.movedAt, now)
      if ((min !== null && days < min) || (max !== null && days > max)) failed.push('daysSinceMove')
    }
  }

  const housingTypes = asStrings(rule.housingTypes)
  if (housingTypes.length > 0 && !(person.housingType && housingTypes.includes(person.housingType))) {
    failed.push('housingType')
  }

  const chosen = toSet(person.chosenBenefitIds)

  const required = asStrings(rule.requiresChosenBenefitIds)
  if (required.length > 0 && !required.some((id) => chosen.has(id))) failed.push('requiresChosen')

  if (rule.hideIfChosen && rule.benefitId && chosen.has(rule.benefitId)) failed.push('hideIfChosen')

  return failed
}

// Why (or why not): every criterion that failed. Used by tests and troubleshooting, never sent to
// the client.
export function explainSelection(
  rule: SelectionRule | null | undefined,
  person: SelectionPerson,
  now: Date,
): SelectionExplanation {
  // null/undefined rule means no targeting: visible to all.
  if (!rule) return { qualified: true, failed: [] }
  const failed = [...legacyFailures(rule, person), ...newFailures(rule, person, now)]
  return { qualified: failed.length === 0, failed }
}

export function isQualified(
  rule: SelectionRule | null | undefined,
  person: SelectionPerson,
  now: Date,
): boolean {
  return explainSelection(rule, person, now).qualified
}
