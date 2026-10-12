// CR-026: Which state the save controls of a row or group are in (pure, no I/O).
// Rule: never show a save button when there is nothing to save.
//   hidden: nothing changed and nothing to report
//   dirty:  there are unsaved changes, show the save button
//   saving: a save is in progress, the button is locked
//   error:  the last save failed and the changes are still unsaved, show the error and "Prøv igjen"
//   saved:  just saved, show "Lagret" for a short while (the window comes from useDirtyTracking)

export type SaveActionsState = 'hidden' | 'dirty' | 'saving' | 'error' | 'saved'

export type SaveActionsInput = {
  isDirty: boolean
  saving: boolean
  // Shown only while the form still matches what was last saved (useDirtyTracking).
  saved: boolean
  error: string | null
}

export function getSaveActionsState({ isDirty, saving, saved, error }: SaveActionsInput): SaveActionsState {
  if (saving) return 'saving'
  // An error only matters while the changes it is about are still there.
  if (isDirty && error) return 'error'
  if (isDirty) return 'dirty'
  if (saved) return 'saved'
  return 'hidden'
}
