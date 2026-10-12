// CR-013: unit tests for the pure link-interception decision logic.
// The hook itself wires window/document event listeners; this project's
// vitest environment is 'node' (no jsdom/happy-dom dependency), so that
// DOM-level wiring is verified manually instead — see CR-013 Required Tests.
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  shouldInterceptClick,
  registerDirty,
  unregisterDirty,
  resetDirtyRegistryForTests,
} from './useUnsavedChangesWarning'

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

// CR-026: shared listeners, so several dirty parts of a page give ONE confirmation.
describe('delte lyttere (registerDirty / unregisterDirty)', () => {
  function stubBrowser(confirmAnswer: boolean) {
    const docListeners: Array<(e: unknown) => void> = []
    const doc = {
      addEventListener: vi.fn((_t: string, fn: (e: unknown) => void) => docListeners.push(fn)),
      removeEventListener: vi.fn(),
    }
    const win = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      confirm: vi.fn(() => confirmAnswer),
    }
    vi.stubGlobal('document', doc)
    vi.stubGlobal('window', win)
    return { doc, win, docListeners }
  }

  function linkClick() {
    return {
      defaultPrevented: false,
      metaKey: false,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      preventDefault: vi.fn(function (this: { defaultPrevented: boolean }) {
        this.defaultPrevented = true
      }),
      target: {
        closest: () => ({
          getAttribute: (name: string) => (name === 'href' ? '/admin/benefits' : null),
        }),
      },
    }
  }

  afterEach(() => {
    resetDirtyRegistryForTests()
    vi.unstubAllGlobals()
  })

  it('registrerer lytterne bare én gang uansett hvor mange deler som er ulagret', () => {
    const { doc, win } = stubBrowser(true)
    registerDirty()
    registerDirty()
    registerDirty()
    expect(doc.addEventListener).toHaveBeenCalledTimes(1)
    expect(win.addEventListener).toHaveBeenCalledTimes(1)
  })

  it('fjerner lytterne først når siste ulagrede del er lagret', () => {
    const { doc, win } = stubBrowser(true)
    registerDirty()
    registerDirty()
    unregisterDirty()
    expect(doc.removeEventListener).not.toHaveBeenCalled()
    unregisterDirty()
    expect(doc.removeEventListener).toHaveBeenCalledTimes(1)
    expect(win.removeEventListener).toHaveBeenCalledTimes(1)
  })

  it('viser bare ÉN bekreftelsesdialog ved lenkeklikk, selv med flere ulagrede deler', () => {
    const { win, docListeners } = stubBrowser(true)
    registerDirty()
    registerDirty()
    registerDirty()
    expect(docListeners).toHaveLength(1)
    for (const listener of docListeners) listener(linkClick())
    expect(win.confirm).toHaveBeenCalledTimes(1)
  })

  it('avbryter navigasjonen når brukeren velger å bli', () => {
    const { docListeners } = stubBrowser(false)
    registerDirty()
    const event = linkClick()
    docListeners[0](event)
    expect(event.preventDefault).toHaveBeenCalled()
  })

  it('en ekstra unregister uten registrering gjør ingenting', () => {
    const { doc } = stubBrowser(true)
    expect(() => unregisterDirty()).not.toThrow()
    expect(doc.removeEventListener).not.toHaveBeenCalled()
  })
})
