// CR-028: labels shown on the login and profile pages.
import { describe, it, expect } from 'vitest'
import { describePerson, formatDateNo } from './labels'

describe('formatDateNo', () => {
  it('formaterer ISO-dato som dd.mm.åååå', () => {
    expect(formatDateNo('2026-10-03')).toBe('03.10.2026')
  })
  it('gir null for tom dato og returnerer ukjent format uendret', () => {
    expect(formatDateNo(null)).toBeNull()
    expect(formatDateNo('i går')).toBe('i går')
  })
})

describe('describePerson', () => {
  const base = {
    id: 'p',
    name: 'Test',
    postcode: null,
    movingStatus: 'unknown' as const,
    movedAt: null,
    fromAddress: null,
    toAddress: null,
    housingType: null,
    isTest: true,
    seeded: true,
  }

  it('viser "Ingen" for tomme verdier slik at QA ser hva personen dekker', () => {
    const d = Object.fromEntries(describePerson(base).map((x) => [x.label, x.value]))
    expect(d['Postnummer']).toBe('Ingen')
    expect(d['Flyttedato']).toBe('Ingen')
    expect(d['Boligtype']).toBe('Ingen')
    expect(d['Flyttestatus']).toBe('Ukjent')
  })

  it('viser verdiene når de finnes', () => {
    const d = Object.fromEntries(
      describePerson({
        ...base,
        postcode: '0150',
        movingStatus: 'recently_moved',
        movedAt: '2026-10-03',
        housingType: 'leilighet',
      }).map((x) => [x.label, x.value])
    )
    expect(d['Postnummer']).toBe('0150')
    expect(d['Flyttedato']).toBe('03.10.2026')
    expect(d['Boligtype']).toBe('Leilighet')
    expect(d['Flyttestatus']).toContain('Nylig flyttet')
  })
})
