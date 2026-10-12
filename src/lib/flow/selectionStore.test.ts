// CR-023: the selection store must work without sessionStorage.
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  getServerSnapshot,
  getSnapshot,
  resetSelectionStoreForTests,
  subscribe,
  writeRaw,
} from './selectionStore'
import { SELECTION_STORAGE_KEY } from './flowSelection'

function fakeStorage(initial: Record<string, string> = {}) {
  const data = { ...initial }
  return {
    data,
    getItem: vi.fn((k: string) => (k in data ? data[k] : null)),
    setItem: vi.fn((k: string, v: string) => {
      data[k] = v
    }),
  }
}

beforeEach(() => resetSelectionStoreForTests())
afterEach(() => vi.unstubAllGlobals())

describe('selectionStore', () => {
  it('server-snapshot er alltid tom streng', () => {
    expect(getServerSnapshot()).toBe('')
  })

  it('leser fra sessionStorage når minnet er tomt', () => {
    const storage = fakeStorage({ [SELECTION_STORAGE_KEY]: '{"b1":"p1"}' })
    vi.stubGlobal('window', { sessionStorage: storage })
    expect(getSnapshot()).toBe('{"b1":"p1"}')
  })

  it('skriver til både minne og sessionStorage og varsler lyttere', () => {
    const storage = fakeStorage()
    vi.stubGlobal('window', { sessionStorage: storage })
    const listener = vi.fn()
    const unsubscribe = subscribe(listener)
    writeRaw('{"b1":"p1"}')
    expect(storage.data[SELECTION_STORAGE_KEY]).toBe('{"b1":"p1"}')
    expect(getSnapshot()).toBe('{"b1":"p1"}')
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    writeRaw('{}')
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('virker når sessionStorage kaster ved lesing og skriving (minne tar over)', () => {
    const broken = {
      getItem: vi.fn(() => {
        throw new Error('blokkert')
      }),
      setItem: vi.fn(() => {
        throw new Error('blokkert')
      }),
    }
    vi.stubGlobal('window', { sessionStorage: broken })
    expect(getSnapshot()).toBe('')
    expect(() => writeRaw('{"b1":"p1"}')).not.toThrow()
    expect(getSnapshot()).toBe('{"b1":"p1"}')
  })

  it('virker når tilgang til window.sessionStorage selv kaster', () => {
    vi.stubGlobal('window', {
      get sessionStorage() {
        throw new Error('blokkert')
      },
    })
    expect(getSnapshot()).toBe('')
    expect(() => writeRaw('{"b1":"p1"}')).not.toThrow()
    expect(getSnapshot()).toBe('{"b1":"p1"}')
  })

  it('virker uten window (server)', () => {
    vi.stubGlobal('window', undefined)
    expect(getSnapshot()).toBe('')
    expect(() => writeRaw('{}')).not.toThrow()
  })
})
