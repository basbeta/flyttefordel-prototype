'use client'
// CR-019: Shared dirty/saved tracking for admin forms (replaces the copy-pasted
// baselineRef + justSaved/useEffect pattern from CR-013). Baseline and saved
// snapshot live in state, so nothing reads a ref during render and no effect
// calls setState.

import { useCallback, useState } from 'react'
import { useUnsavedChangesWarning } from './useUnsavedChangesWarning'

export function deriveDirtyState(
  current: string,
  baseline: string,
  savedSnapshot: string | null,
) {
  return {
    isDirty: current !== baseline,
    // "Lagret" shows only while the form still matches what was last saved.
    showSaved: savedSnapshot !== null && savedSnapshot === current,
  }
}

export function useDirtyTracking(payload: unknown) {
  const current = JSON.stringify(payload)
  const [baseline, setBaseline] = useState(current)
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null)

  const { isDirty, showSaved } = deriveDirtyState(current, baseline, savedSnapshot)
  useUnsavedChangesWarning(isDirty)

  // Pass the payload that was actually sent, not whatever the form holds when
  // the response arrives. showBadge=false for create flows that navigate away.
  const markSaved = useCallback((savedPayload: unknown, showBadge = true) => {
    const snapshot = JSON.stringify(savedPayload)
    setBaseline(snapshot)
    if (showBadge) setSavedSnapshot(snapshot)
  }, [])

  return { isDirty, showSaved, markSaved }
}
