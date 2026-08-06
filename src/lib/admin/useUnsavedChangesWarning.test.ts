// CR-013: unit tests for the pure link-interception decision logic.
// The hook itself wires window/document event listeners; this project's
// vitest environment is 'node' (no jsdom/happy-dom dependency), so that
// DOM-level wiring is verified manually instead — see CR-013 Required Tests.
import { describe, expect, it } from 'vitest'
import { shouldInterceptClick } from './useUnsavedChangesWarning'

const base = {
  href: '/admin/benefits',
  targetAttr: null as string | null,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
}

describe('shouldInterceptClick', () => {
  it('intercepts a plain click on an internal admin link', () => {
    expect(shouldInterceptClick(base)).toBe(true)
  })

  it('does not intercept when href is missing', () => {
    expect(shouldInterceptClick({ ...base, href: null })).toBe(false)
  })

  it('does not intercept links outside /admin', () => {
    expect(shouldInterceptClick({ ...base, href: 'https://example.com' })).toBe(false)
    expect(shouldInterceptClick({ ...base, href: '/benefits' })).toBe(false)
  })

  it('does not intercept links opening in a new tab', () => {
    expect(shouldInterceptClick({ ...base, targetAttr: '_blank' })).toBe(false)
  })

  it('does not intercept modified clicks (ctrl/cmd/shift/alt open in new tab/window)', () => {
    expect(shouldInterceptClick({ ...base, ctrlKey: true })).toBe(false)
    expect(shouldInterceptClick({ ...base, metaKey: true })).toBe(false)
    expect(shouldInterceptClick({ ...base, shiftKey: true })).toBe(false)
    expect(shouldInterceptClick({ ...base, altKey: true })).toBe(false)
  })
})
