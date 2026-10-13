// CR-030: assignVariant is pure and deterministic.
import { describe, it, expect } from 'vitest'
import { assignVariant } from './assign'

const AB = [
  { key: 'standard', weight: 1 },
  { key: 'b', weight: 1 },
]

function ids(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`)
}

describe('assignVariant', () => {
  it('gir samme variant hver gang for samme person og test', () => {
    const first = assignVariant('person-1', 'test-1', AB)
    for (let i = 0; i < 20; i++) expect(assignVariant('person-1', 'test-1', AB)).toBe(first)
  })

  it('er uavhengig av rekkefølgen i variantlisten', () => {
    const reversed = [...AB].reverse()
    for (const id of ids(200)) {
      expect(assignVariant(id, 't', reversed)).toBe(assignVariant(id, 't', AB))
    }
  })

  it('følger vektene med rimelig toleranse (50/50 og 80/20)', () => {
    const people = ids(4000)
    const half = people.filter((id) => assignVariant(id, 't-half', AB) === 'b').length
    expect(half / people.length).toBeGreaterThan(0.46)
    expect(half / people.length).toBeLessThan(0.54)

    const skewed = [
      { key: 'standard', weight: 8 },
      { key: 'b', weight: 2 },
    ]
    const b = people.filter((id) => assignVariant(id, 't-skew', skewed) === 'b').length
    expect(b / people.length).toBeGreaterThan(0.17)
    expect(b / people.length).toBeLessThan(0.23)
  })

  it('gir uavhengig fordeling mellom ulike tester (test-ID i hashen)', () => {
    const people = ids(4000)
    const both = people.filter(
      (id) => assignVariant(id, 'test-a', AB) === 'b' && assignVariant(id, 'test-b', AB) === 'b'
    ).length
    // Uavhengig: ca. 25 %. Helt korrelert ville gitt ca. 50 %.
    expect(both / people.length).toBeGreaterThan(0.21)
    expect(both / people.length).toBeLessThan(0.29)
  })

  it('en variant med vekt som ikke er et positivt heltall brukes aldri', () => {
    const variants = [
      { key: 'standard', weight: 1 },
      { key: 'null-vekt', weight: 0 },
      { key: 'minus', weight: -3 },
      { key: 'desimal', weight: 1.5 },
    ]
    for (const id of ids(100)) expect(assignVariant(id, 't', variants)).toBe('standard')
  })

  it('gir null når ingen variant er brukbar', () => {
    expect(assignVariant('p', 't', [])).toBeNull()
    expect(assignVariant('p', 't', [{ key: 'x', weight: 0 }])).toBeNull()
  })

  // Kontrakt: hashen er frosset. Endres disse, flyttes alle personer til en annen variant
  // midt i kjørende tester. Ikke oppdater verdiene uten å vite hva det betyr.
  it('hashen er frosset (snapshot)', () => {
    const snapshot = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((p) =>
      assignVariant(`person-${p}`, 'frozen-test', AB)
    )
    expect(snapshot).toEqual(FROZEN)
  })
})

const FROZEN = ['b', 'standard', 'b', 'standard', 'standard', 'b', 'standard', 'b']
