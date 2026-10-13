// CR-028: ?next= must never become an open redirect.
import { describe, it, expect } from 'vitest'
import { safeNext } from './safeNext'

describe('safeNext', () => {
  it('slipper gjennom relative stier, også med query', () => {
    expect(safeNext('/flytting')).toBe('/flytting')
    expect(safeNext('/flytting/oppsummering?x=1')).toBe('/flytting/oppsummering?x=1')
    expect(safeNext('/benefits/gratis-kaffe')).toBe('/benefits/gratis-kaffe')
  })

  it('faller tilbake til / for tom eller manglende verdi', () => {
    expect(safeNext(undefined)).toBe('/')
    expect(safeNext(null)).toBe('/')
    expect(safeNext('')).toBe('/')
  })

  it.each([
    'https://evil.example',
    'http://evil.example/x',
    '//evil.example',
    '/\\evil.example',
    '\\\\evil.example',
    'javascript:alert(1)',
    'evil.example',
    '/ok\nLocation: https://evil.example',
    '/a\\b',
  ])('avviser %j', (value) => {
    expect(safeNext(value)).toBe('/')
  })

  it('sender aldri tilbake til innloggingssiden eller til et API', () => {
    expect(safeNext('/logg-inn')).toBe('/')
    expect(safeNext('/logg-inn?next=/x')).toBe('/')
    expect(safeNext('/logg-inn/x')).toBe('/')
    expect(safeNext('/api/track')).toBe('/')
  })
})
