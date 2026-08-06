'use client'
// CR-013: Flytende lagre-knapp — erstatter den statiske "formActions"
// -knappen nederst i lange former. Vises når formet har ulagrede
// endringer (isDirty, rød, pulserende), og som en grønn "Lagret"-pille
// (ingen knapp) i det korte vinduet etter en vellykket lagring, til
// neste endring gjør formet dirty igjen.

import adminStyles from '@/components/admin/AdminTable.module.css'
import styles from './FormSaveBar.module.css'

type Props = {
  label: string
  saving: boolean
  isDirty: boolean
  saved?: boolean
  error?: string | null
}

export function FormSaveBar({ label, saving, isDirty, saved, error }: Props) {
  if (!isDirty && !error && !saved) return null

  if (saved && !isDirty && !error) {
    return (
      <div className={`${styles.bar} ${styles.saved}`}>
        <span className={styles.savedText}>
          <span className={styles.savedDot} />
          Lagret
        </span>
      </div>
    )
  }

  return (
    <div className={`${styles.bar} ${isDirty ? styles.dirty : ''}`}>
      {error ? (
        <span className={styles.errorText}>{error}</span>
      ) : (
        <span className={styles.dirtyText}>
          <span className={styles.dot} />
          Ulagrede endringer
        </span>
      )}
      <button type="submit" className={adminStyles.primaryBtn} disabled={saving}>
        {saving ? 'Lagrer…' : label}
      </button>
    </div>
  )
}
