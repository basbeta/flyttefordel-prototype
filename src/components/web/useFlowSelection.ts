'use client'

// CR-023: React binding for the browser-side flow selection.
// useSyncExternalStore keeps server and first client render identical (empty)
// and then reflects sessionStorage without setState-in-effect.

import { useCallback, useMemo, useSyncExternalStore } from 'react'
import {
  parseSelection,
  serializeSelection,
  toggleProduct,
  type FlowSelection,
} from '@/lib/flow'
import {
  getServerSnapshot,
  getSnapshot,
  subscribe,
  writeRaw,
} from '@/lib/flow/selectionStore'

export function useFlowSelection(): {
  selection: FlowSelection
  toggle: (benefitId: string, productId: string) => void
  // CR-024: drop choices (for example benefits the server says are no longer available).
  remove: (benefitIds: readonly string[]) => void
  // CR-024: clear everything after a successful order.
  clear: () => void
} {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const selection = useMemo(() => parseSelection(raw), [raw])
  const toggle = useCallback((benefitId: string, productId: string) => {
    // Read the latest stored value, not the render-time one, so fast taps never lose a choice.
    writeRaw(serializeSelection(toggleProduct(parseSelection(getSnapshot()), benefitId, productId)))
  }, [])
  const remove = useCallback((benefitIds: readonly string[]) => {
    const next = { ...parseSelection(getSnapshot()) }
    for (const id of benefitIds) delete next[id]
    writeRaw(serializeSelection(next))
  }, [])
  const clear = useCallback(() => writeRaw(serializeSelection({})), [])
  return { selection, toggle, remove, clear }
}
