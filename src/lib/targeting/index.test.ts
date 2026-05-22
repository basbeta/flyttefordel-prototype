// CR-005: Unit tests for matchesSession targeting logic.
import { describe, it, expect } from 'vitest'
import { matchesSession } from './index'

const noPostcode = { postcode: null, movingStatus: 'unknown' }
const withPostcode = (postcode: string, movingStatus = 'unknown') => ({ postcode, movingStatus })

describe('matchesSession', () => {
  it('returns true when rule is null (no targeting)', () => {
    expect(matchesSession(null, noPostcode)).toBe(true)
  })

  it('returns true when rule is undefined', () => {
    expect(matchesSession(undefined, noPostcode)).toBe(true)
  })

  it('returns true when appliesNationally is true, regardless of session', () => {
    const rule = { appliesNationally: true, includeUnknownLocation: false, postcodes: ['0150'], postcodeRanges: [], movingStatuses: ['recently_moved'] }
    expect(matchesSession(rule, noPostcode)).toBe(true)
    expect(matchesSession(rule, withPostcode('9999'))).toBe(true)
  })

  it('returns true when rule has no criteria (empty arrays)', () => {
    const rule = { appliesNationally: false, includeUnknownLocation: true, postcodes: [], postcodeRanges: [], movingStatuses: [] }
    expect(matchesSession(rule, noPostcode)).toBe(true)
    expect(matchesSession(rule, withPostcode('0150'))).toBe(true)
  })

  describe('unknown location', () => {
    const postcodeRule = { appliesNationally: false, includeUnknownLocation: true, postcodes: ['0150'], postcodeRanges: [], movingStatuses: [] }

    it('returns includeUnknownLocation when user has no postcode', () => {
      expect(matchesSession({ ...postcodeRule, includeUnknownLocation: true }, noPostcode)).toBe(true)
      expect(matchesSession({ ...postcodeRule, includeUnknownLocation: false }, noPostcode)).toBe(false)
    })
  })

  describe('postcode matching', () => {
    const base = { appliesNationally: false, includeUnknownLocation: true, postcodeRanges: [], movingStatuses: [] }

    it('matches when postcode is in list', () => {
      const rule = { ...base, postcodes: ['0150', '0151'] }
      expect(matchesSession(rule, withPostcode('0150'))).toBe(true)
    })

    it('does not match when postcode is not in list', () => {
      const rule = { ...base, postcodes: ['0150', '0151'] }
      expect(matchesSession(rule, withPostcode('9999'))).toBe(false)
    })

    it('matches when postcode is within a range', () => {
      const rule = { ...base, postcodes: [], postcodeRanges: [{ from: '0100', to: '0299' }] }
      expect(matchesSession(rule, withPostcode('0150'))).toBe(true)
      expect(matchesSession(rule, withPostcode('0100'))).toBe(true)
      expect(matchesSession(rule, withPostcode('0299'))).toBe(true)
    })

    it('does not match when postcode is outside range', () => {
      const rule = { ...base, postcodes: [], postcodeRanges: [{ from: '0100', to: '0299' }] }
      expect(matchesSession(rule, withPostcode('0099'))).toBe(false)
      expect(matchesSession(rule, withPostcode('0300'))).toBe(false)
    })

    it('matches when postcode is in list OR in range', () => {
      const rule = { ...base, postcodes: ['5000'], postcodeRanges: [{ from: '0100', to: '0299' }] }
      expect(matchesSession(rule, withPostcode('5000'))).toBe(true)
      expect(matchesSession(rule, withPostcode('0150'))).toBe(true)
      expect(matchesSession(rule, withPostcode('9000'))).toBe(false)
    })
  })

  describe('segment matching', () => {
    const base = { appliesNationally: false, includeUnknownLocation: true, postcodes: [], postcodeRanges: [] }

    it('matches when movingStatus is in segments list', () => {
      const rule = { ...base, movingStatuses: ['recently_moved', 'moved_past'] }
      expect(matchesSession(rule, withPostcode('0150', 'recently_moved'))).toBe(true)
    })

    it('does not match when movingStatus is not in segments list', () => {
      const rule = { ...base, movingStatuses: ['recently_moved'] }
      expect(matchesSession(rule, withPostcode('0150', 'not_moving'))).toBe(false)
    })

    it('applies segment rule to user with no postcode when includeUnknownLocation is true', () => {
      const rule = { ...base, movingStatuses: ['recently_moved'] }
      // No postcode → returns includeUnknownLocation regardless of segment
      expect(matchesSession({ ...rule, includeUnknownLocation: true }, noPostcode)).toBe(true)
    })
  })

  describe('AND logic — postcode AND segment', () => {
    const rule = {
      appliesNationally: false,
      includeUnknownLocation: false,
      postcodes: ['0150'],
      postcodeRanges: [],
      movingStatuses: ['recently_moved'],
    }

    it('matches when both postcode and segment match', () => {
      expect(matchesSession(rule, withPostcode('0150', 'recently_moved'))).toBe(true)
    })

    it('does not match when postcode matches but segment does not', () => {
      expect(matchesSession(rule, withPostcode('0150', 'not_moving'))).toBe(false)
    })

    it('does not match when segment matches but postcode does not', () => {
      expect(matchesSession(rule, withPostcode('9999', 'recently_moved'))).toBe(false)
    })

    it('does not match when neither matches', () => {
      expect(matchesSession(rule, withPostcode('9999', 'not_moving'))).toBe(false)
    })
  })

  describe('null/non-array JSON fields', () => {
    it('treats null postcodes and movingStatuses as empty arrays', () => {
      const rule = { appliesNationally: false, includeUnknownLocation: true, postcodes: null, postcodeRanges: null, movingStatuses: null }
      // No criteria → visible for all
      expect(matchesSession(rule, noPostcode)).toBe(true)
      expect(matchesSession(rule, withPostcode('0150'))).toBe(true)
    })
  })
})
