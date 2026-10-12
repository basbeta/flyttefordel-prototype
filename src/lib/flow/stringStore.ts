// CR-023 / CR-024: A string store backed by sessionStorage, built for useSyncExternalStore.
// sessionStorage can be blocked or throw (private windows, blocked site data), so every
// access is in try/catch and the value is also kept in memory. The page then keeps working,
// and client-side navigation keeps the value even without storage.
// The snapshot is the raw string (stable for React); parsing happens in the caller.

type Listener = () => void

export type SessionStringStore = {
  subscribe: (listener: Listener) => () => void
  getSnapshot: () => string
  getServerSnapshot: () => string
  write: (raw: string) => void
  resetForTests: () => void
}

function getStorage(): Pick<Storage, 'getItem' | 'setItem'> | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage
  } catch {
    return null
  }
}

export function createSessionStringStore(key: string): SessionStringStore {
  let memory: string | null = null
  const listeners = new Set<Listener>()

  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    getSnapshot() {
      if (memory !== null) return memory
      try {
        return getStorage()?.getItem(key) ?? ''
      } catch {
        return ''
      }
    },
    getServerSnapshot() {
      return ''
    },
    write(raw) {
      memory = raw
      try {
        getStorage()?.setItem(key, raw)
      } catch {
        // Storage unavailable or full: the in-memory copy still serves this page load.
      }
      listeners.forEach((l) => l())
    },
    resetForTests() {
      memory = null
      listeners.clear()
    },
  }
}
