// CR-022: live check for a benefit.
import { describe, it, expect } from 'vitest'
import { isBenefitLive } from './isBenefitLive'

const NOW = new Date('2026-10-12T12:00:00Z')

function b(overrides: Partial<Parameters<typeof isBenefitLive>[0]> = {}) {
  return { status: 'active' as const, deletedAt: null, startsAt: null, endsAt: null, ...overrides }
}

describe('isBenefitLive', () => {
  it('aktiv uten datoer er live', () => {
    expect(isBenefitLive(b(), NOW)).toBe(true)
  })

  it('andre statuser enn active er ikke live', () => {
    for (const status of ['draft', 'scheduled', 'paused', 'expired', 'archived', 'deleted'] as const) {
      expect(isBenefitLive(b({ status }), NOW)).toBe(false)
    }
  })

  it('slettet er ikke live selv om status er active', () => {
    expect(isBenefitLive(b({ deletedAt: new Date('2026-01-01') }), NOW)).toBe(false)
  })

  it('ikke live før startsAt, live på startsAt (grensen er inklusiv)', () => {
    expect(isBenefitLive(b({ startsAt: new Date('2026-10-12T12:00:01Z') }), NOW)).toBe(false)
    expect(isBenefitLive(b({ startsAt: NOW }), NOW)).toBe(true)
  })

  it('live på endsAt (inklusiv), ikke live etter endsAt', () => {
    expect(isBenefitLive(b({ endsAt: NOW }), NOW)).toBe(true)
    expect(isBenefitLive(b({ endsAt: new Date('2026-10-12T11:59:59Z') }), NOW)).toBe(false)
  })
})
