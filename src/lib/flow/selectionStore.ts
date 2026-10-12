// CR-023: Browser-side store for the flow selection, built for useSyncExternalStore.
// sessionStorage can be blocked or throw (private windows, blocked site data), so
// every access is in try/catch and the raw value is also kept in memory. The page
// then keeps working, and client-side navigation between flow pages keeps the
// selection even without storage.
// The snapshot is the raw string (stable for React); parsing happens in the caller.

import { SELECTION_STORAGE_KEY } from './flowSelection'

type Listener = () => void

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

let memory: string | null = null
const listeners = new Set<Listener>()

function getStorage(): StorageLike | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage
  } catch {
    return null
  }
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getSnapshot(): string {
  if (memory !== null) return memory
  try {
    return getStorage()?.getItem(SELECTION_STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

export function getServerSnapshot(): string {
  return ''
}

export function writeRaw(raw: string): void {
  memory = raw
  try {
    getStorage()?.setItem(SELECTION_STORAGE_KEY, raw)
  } catch {
    // Storage unavailable or full: the in-memory copy still serves this page load.
  }
  listeners.forEach((l) => l())
}

// For tests only.
export function resetSelectionStoreForTests(): void {
  memory = null
  listeners.clear()
}
