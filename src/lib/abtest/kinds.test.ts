// CR-030: the kind register and the shared validation path.
import { describe, it, expect } from 'vitest'
import { TEST_KINDS, contentScopeKey, isTestKind, parseTestDefinition, viewIdFor } from './kinds'

const BENEFIT = '11111111-1111-4111-8111-111111111111'
const OK_VARIANTS = [
  { key: 'standard', weight: 1 },
  { key: 'b', weight: 1 },
]

describe('kinds-registeret', () => {
  it('kjenner content og avviser ukjente typer', () => {
    expect(isTestKind('content')).toBe(true)
    expect(isTestKind('placement')).toBe(false)
    expect(isTestKind('toString')).toBe(false)
    expect(Object.keys(TEST_KINDS)).toEqual(['content'])
  })

  it('scopeKey for content er stabil', () => {
    expect(contentScopeKey(BENEFIT, 'app_card')).toBe(`content:${BENEFIT}:app_card`)
  })

  it('viewId er format:variant', () => {
    expect(viewIdFor('content', { benefitId: BENEFIT, format: 'web_card' }, 'b')).toBe('web_card:b')
    expect(viewIdFor('ukjent', {}, 'b')).toBeNull()
    expect(viewIdFor('content', { benefitId: 'ikke-uuid', format: 'web_card' }, 'b')).toBeNull()
  })
})

describe('parseTestDefinition', () => {
  const base = { kind: 'content', scope: { benefitId: BENEFIT, format: 'app_card' }, variants: OK_VARIANTS }

  it('godtar en gyldig content-test og utleder scopeKey', () => {
    const r = parseTestDefinition(base)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.scopeKey).toBe(`content:${BENEFIT}:app_card`)
  })

  it.each([
    ['ukjent kind', { ...base, kind: 'format' }],
    ['ukjent format', { ...base, scope: { benefitId: BENEFIT, format: 'plakat' } }],
    ['benefitId er ikke uuid', { ...base, scope: { benefitId: 'x', format: 'app_card' } }],
    ['bare én variant', { ...base, variants: [{ key: 'standard', weight: 1 }] }],
    ['standard mangler', { ...base, variants: [{ key: 'a', weight: 1 }, { key: 'b', weight: 1 }] }],
    ['dupliserte nøkler', { ...base, variants: [{ key: 'standard', weight: 1 }, { key: 'standard', weight: 1 }] }],
    ['vekt 0', { ...base, variants: [{ key: 'standard', weight: 0 }, { key: 'b', weight: 1 }] }],
    ['ugyldig nøkkel', { ...base, variants: [{ key: 'standard', weight: 1 }, { key: 'Stor Bokstav', weight: 1 }] }],
    ['for mange varianter', { ...base, variants: Array.from({ length: 7 }, (_, i) => ({ key: i === 0 ? 'standard' : `v${i}`, weight: 1 })) }],
  ])('avviser: %s', (_name, input) => {
    expect(parseTestDefinition(input).ok).toBe(false)
  })
})
