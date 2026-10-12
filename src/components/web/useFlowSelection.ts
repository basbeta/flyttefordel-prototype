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
} {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const selection = useMemo(() => parseSelection(raw), [raw])
  const toggle = useCallback((benefitId: string, productId: string) => {
    // Read the latest stored value, not the render-time one, so fast taps never lose a choice.
    writeRaw(serializeSelection(toggleProduct(parseSelection(getSnapshot()), benefitId, productId)))
  }, [])
  return { selection, toggle }
}
