// CR-016: unit tests for beregnet visningsstatus (bucket/label/reasons).
import { describe, expect, it } from 'vitest'
import { getBenefitDisplayStatus, type BenefitStatusInput } from './displayStatus'

const NOW = new Date('2026-08-11T12:00:00Z')
const PAST = new Date('2026-01-01T00:00:00Z')
const FUTURE = new Date('2026-12-01T00:00:00Z')

function base(overrides: Partial<BenefitStatusInput> = {}): BenefitStatusInput {
  return {
    status: 'active',
    redemptionType: 'info_only',
    startsAt: null,
    endsAt: null,
    redemption: null,
    ...overrides,
  }
}

describe('getBenefitDisplayStatus — status-bøtter', () => {
  it.each(['draft', 'paused', 'archived', 'deleted'] as const)(
    'grupperer %s som draft (grå), uten reasons',
    (status) => {
      const result = getBenefitDisplayStatus(base({ status }), NOW)
      expect(result.bucket).toBe('draft')
      expect(result.reasons).toEqual([])
    },
  )

  it('grupperer expired som failed (rød), men beholder etiketten "Utløpt"', () => {
    const result = getBenefitDisplayStatus(base({ status: 'expired' }), NOW)
    expect(result).toEqual({ bucket: 'failed', label: 'Utløpt', reasons: [] })
  })

  it('active uten problemer gir bucket active, label Aktiv', () => {
    const result = getBenefitDisplayStatus(base({ status: 'active' }), NOW)
    expect(result).toEqual({ bucket: 'active', label: 'Aktiv', reasons: [] })
  })

  it('scheduled uten problemer gir bucket scheduled, label Planlagt', () => {
    const result = getBenefitDisplayStatus(
      base({ status: 'scheduled', startsAt: FUTURE }),
      NOW,
    )
    expect(result).toEqual({ bucket: 'scheduled', label: 'Planlagt', reasons: [] })
  })
})

describe('getBenefitDisplayStatus — dato-problemer', () => {
  it('active med utløpt endsAt gir failed', () => {
    const result = getBenefitDisplayStatus(base({ status: 'active', endsAt: PAST }), NOW)
    expect(result.bucket).toBe('failed')
    expect(result.reasons).toContain('Sluttdato har passert, men status er ikke oppdatert')
  })

  it('scheduled med utløpt endsAt gir også failed', () => {
    const result = getBenefitDisplayStatus(
      base({ status: 'scheduled', startsAt: FUTURE, endsAt: PAST }),
      NOW,
    )
    expect(result.bucket).toBe('failed')
  })

  it('active med startsAt i fremtiden gir failed (datainkonsistens)', () => {
    const result = getBenefitDisplayStatus(base({ status: 'active', startsAt: FUTURE }), NOW)
    expect(result.bucket).toBe('failed')
    expect(result.reasons).toContain('Startdato er i fremtiden — bør være «Planlagt»')
  })

  it('scheduled med startsAt i fremtiden er IKKE et problem (det er hele poenget med scheduled)', () => {
    const result = getBenefitDisplayStatus(base({ status: 'scheduled', startsAt: FUTURE }), NOW)
    expect(result.bucket).toBe('scheduled')
  })

  it('endsAt nøyaktig lik now regnes ikke som utløpt', () => {
    const result = getBenefitDisplayStatus(base({ status: 'active', endsAt: NOW }), NOW)
    expect(result.bucket).toBe('active')
  })
})

describe('getBenefitDisplayStatus — redemption-innhold per type', () => {
  it('generic_code uten kode gir failed', () => {
    const result = getBenefitDisplayStatus(
      base({ status: 'active', redemptionType: 'generic_code', redemption: { genericCode: null, externalUrl: null, qrValue: null, codePoolId: null, leadFormId: null, codePool: null } }),
      NOW,
    )
    expect(result.bucket).toBe('failed')
    expect(result.reasons).toContain('Mangler rabattkode')
  })

  it('generic_code med kode er ok', () => {
    const result = getBenefitDisplayStatus(
      base({ status: 'active', redemptionType: 'generic_code', redemption: { genericCode: 'FLYTT20', externalUrl: null, qrValue: null, codePoolId: null, leadFormId: null, codePool: null } }),
      NOW,
    )
    expect(result.bucket).toBe('active')
  })

  it('qr_code uten qrValue gir failed', () => {
    const result = getBenefitDisplayStatus(
      base({ status: 'active', redemptionType: 'qr_code', redemption: { genericCode: null, externalUrl: null, qrValue: null, codePoolId: null, leadFormId: null, codePool: null } }),
      NOW,
    )
    expect(result.reasons).toContain('Mangler QR-innhold')
  })

  it('external_link uten URL gir failed', () => {
    const result = getBenefitDisplayStatus(
      base({ status: 'active', redemptionType: 'external_link', redemption: { genericCode: null, externalUrl: null, qrValue: null, codePoolId: null, leadFormId: null, codePool: null } }),
      NOW,
    )
    expect(result.reasons).toContain('Mangler ekstern URL')
  })

  it('unique_code uten koblet kodepool gir failed', () => {
    const result = getBenefitDisplayStatus(
      base({ status: 'active', redemptionType: 'unique_code', redemption: { genericCode: null, externalUrl: null, qrValue: null, codePoolId: null, leadFormId: null, codePool: null } }),
      NOW,
    )
    expect(result.reasons).toContain('Mangler koblet kodepool')
  })

  it('unique_code med tom kodepool gir failed', () => {
    const result = getBenefitDisplayStatus(
      base({ status: 'active', redemptionType: 'unique_code', redemption: { genericCode: null, externalUrl: null, qrValue: null, codePoolId: 'pool-1', leadFormId: null, codePool: { availableCodes: 0 } } }),
      NOW,
    )
    expect(result.reasons).toContain('Kodepool er tom')
  })

  it('unique_code med koder tilgjengelig er ok', () => {
    const result = getBenefitDisplayStatus(
      base({ status: 'active', redemptionType: 'unique_code', redemption: { genericCode: null, externalUrl: null, qrValue: null, codePoolId: 'pool-1', leadFormId: null, codePool: { availableCodes: 5 } } }),
      NOW,
    )
    expect(result.bucket).toBe('active')
  })

  it('lead_form uten koblet skjema gir failed', () => {
    const result = getBenefitDisplayStatus(
      base({ status: 'active', redemptionType: 'lead_form', redemption: { genericCode: null, externalUrl: null, qrValue: null, codePoolId: null, leadFormId: null, codePool: null } }),
      NOW,
    )
    expect(result.reasons).toContain('Mangler koblet leadskjema')
  })

  it('mixed uten noe innhold gir failed', () => {
    const result = getBenefitDisplayStatus(
      base({ status: 'active', redemptionType: 'mixed', redemption: { genericCode: null, externalUrl: null, qrValue: null, codePoolId: null, leadFormId: null, codePool: null } }),
      NOW,
    )
    expect(result.reasons).toContain('Mangler innhold for kombinert redemption-type')
  })

  it('mixed med minst ett felt utfylt er ok', () => {
    const result = getBenefitDisplayStatus(
      base({ status: 'active', redemptionType: 'mixed', redemption: { genericCode: 'ABC', externalUrl: null, qrValue: null, codePoolId: null, leadFormId: null, codePool: null } }),
      NOW,
    )
    expect(result.bucket).toBe('active')
  })

  it('info_only flagges aldri, selv uten redemption-objekt', () => {
    const result = getBenefitDisplayStatus(base({ status: 'active', redemptionType: 'info_only', redemption: null }), NOW)
    expect(result.bucket).toBe('active')
  })
})

describe('getBenefitDisplayStatus — flere problemer samtidig', () => {
  it('samler opp flere reasons når flere ting er feil', () => {
    const result = getBenefitDisplayStatus(
      base({
        status: 'active',
        redemptionType: 'generic_code',
        endsAt: PAST,
        redemption: { genericCode: null, externalUrl: null, qrValue: null, codePoolId: null, leadFormId: null, codePool: null },
      }),
      NOW,
    )
    expect(result.bucket).toBe('failed')
    expect(result.reasons).toHaveLength(2)
  })
})
