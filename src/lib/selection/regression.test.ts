// CR-029: regression. isQualified must give EXACTLY the same answer as the old matchesSession
// (CR-005) for every rule without the new fields. The old function is frozen here as a copy and
// compared over a grid of rules and persons.
import { describe, it, expect } from 'vitest'
import { isQualified } from './isQualified'
import { matchesSession } from '@/lib/targeting'

type Range = { from: string; to: string }
type OldRule = {
  appliesNationally: boolean
  includeUnknownLocation: boolean
  postcodes: unknown
  postcodeRanges: unknown
  movingStatuses: unknown
}
type OldSession = { postcode: string | null; movingStatus: string }

// Frozen copy of the CR-005 implementation.
function oldMatchesSession(rule: OldRule | null | undefined, session: OldSession): boolean {
  if (!rule) return true
  if (rule.appliesNationally) return true
  const postcodes = Array.isArray(rule.postcodes) ? (rule.postcodes as string[]) : []
  const ranges = Array.isArray(rule.postcodeRanges) ? (rule.postcodeRanges as Range[]) : []
  const segments = Array.isArray(rule.movingStatuses) ? (rule.movingStatuses as string[]) : []
  const hasPostcodeRule = postcodes.length > 0 || ranges.length > 0
  const hasSegmentRule = segments.length > 0
  if (!hasPostcodeRule && !hasSegmentRule) return true
  if (!session.postcode) return rule.includeUnknownLocation
  if (hasPostcodeRule) {
    const inList = postcodes.includes(session.postcode) || ranges.some((r) => session.postcode! >= r.from && session.postcode! <= r.to)
    if (!inList) return false
  }
  if (hasSegmentRule && !segments.includes(session.movingStatus)) return false
  return true
}

const NOW = new Date('2026-10-13T08:00:00Z')

const postcodeSets: unknown[] = [[], ['0150'], ['0150', '5003'], null, 'ugyldig']
const rangeSets: unknown[] = [[], [{ from: '0001', to: '1299' }], [{ from: '9000', to: '9999' }], null]
const statusSets: unknown[] = [[], ['recently_moved'], ['recently_moved', 'moved_past'], null, ['unknown']]
const flags = [true, false]

const rules: (OldRule | null | undefined)[] = [null, undefined]
for (const postcodes of postcodeSets)
  for (const postcodeRanges of rangeSets)
    for (const movingStatuses of statusSets)
      for (const includeUnknownLocation of flags)
        for (const appliesNationally of flags)
          rules.push({ postcodes, postcodeRanges, movingStatuses, includeUnknownLocation, appliesNationally })

const sessions: OldSession[] = []
for (const postcode of [null, '0150', '0700', '5003', '9008', '1299', '1300'])
  for (const movingStatus of ['recently_moved', 'moved_past', 'not_moving', 'unknown'])
    sessions.push({ postcode, movingStatus })

describe('isQualified mot den gamle matchesSession', () => {
  it(`gir samme svar for alle ${rules.length} regler × ${sessions.length} personer`, () => {
    let compared = 0
    const mismatches: string[] = []
    for (const r of rules) {
      for (const s of sessions) {
        compared++
        const expected = oldMatchesSession(r, s)
        if (isQualified(r, s, NOW) !== expected) mismatches.push(JSON.stringify({ r, s }))
        if (matchesSession(r, s, NOW) !== expected) mismatches.push(`wrapper ${JSON.stringify({ r, s })}`)
      }
    }
    expect(compared).toBeGreaterThan(5000)
    expect(mismatches.slice(0, 3)).toEqual([])
  })

  it('en regel med de nye feltene satt til null/false oppfører seg som uten dem', () => {
    const base = { appliesNationally: false, includeUnknownLocation: true, postcodes: ['0150'], postcodeRanges: [], movingStatuses: [] }
    const withNulls = {
      ...base,
      daysSinceMoveMin: null,
      daysSinceMoveMax: null,
      housingTypes: null,
      requiresChosenBenefitIds: null,
      hideIfChosen: false,
      benefitId: 'b1',
    }
    for (const s of sessions) expect(isQualified(withNulls, s, NOW)).toBe(isQualified(base, s, NOW))
  })
})
