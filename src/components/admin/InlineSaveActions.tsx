'use client'
// CR-026: Save controls for a row or group inside an admin page (where the floating
// FormSaveBar does not fit). Same behaviour as FormSaveBar: nothing is shown until there is
// something to save; the button then appears, locks while saving, disappears after saving
// and is replaced by "Lagret" for a short while. On error the message stays together with
// "Prøv igjen".
// The status text lives in a live region that is always rendered, so screen readers announce
// changes ("Lagret") even though the button itself comes and goes.

import { getSaveActionsState } from '@/lib/admin/saveActionsState'
import adminStyles from '@/components/admin/AdminTable.module.css'
import styles from './InlineSaveActions.module.css'

type Props = {
  isDirty: boolean
  saving: boolean
  saved: boolean
  error: string | null
  label?: string
  savedLabel?: string
  // 'submit' lets Enter in a form field trigger the save (no onSave needed).
  type?: 'button' | 'submit'
  onSave?: () => void
  // Changes exist but cannot be saved yet (for example a required field is empty).
  disabled?: boolean
}

export function InlineSaveActions({
  isDirty,
  saving,
  saved,
  error,
  label = 'Lagre',
  savedLabel = 'Lagret',
  type = 'button',
  onSave,
  disabled = false,
}: Props) {
  const state = getSaveActionsState({ isDirty, saving, saved, error })
  const showButton = state === 'dirty' || state === 'saving' || state === 'error'

  const statusText =
    state === 'dirty' ? 'Ulagrede endringer' : state === 'saving' ? 'Lagrer…' : state === 'saved' ? `✓ ${savedLabel}` : ''

  return (
    <div className={styles.actions}>
      {showButton && (
        <button
          type={type}
          className={adminStyles.primaryBtn}
          onClick={type === 'button' ? onSave : undefined}
          disabled={saving || disabled}
        >
          {saving ? 'Lagrer…' : state === 'error' ? 'Prøv igjen' : label}
        </button>
      )}
      <span
        role="status"
        aria-live="polite"
        className={state === 'dirty' ? styles.dirty : state === 'saved' ? styles.saved : styles.status}
      >
        {statusText}
      </span>
      {state === 'error' && (
        <span role="alert" className={styles.error}>
          {error}
        </span>
      )}
    </div>
  )
}
