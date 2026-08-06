'use client'
// CR-013: Flytende lagre-knapp, alltid synlig — erstatter den statiske
// "formActions"-knappen nederst i lange former. Viser en pulserende
// "Ulagrede endringer"-indikator sammen med knappen når formet er dirty.

import adminStyles from '@/components/admin/AdminTable.module.css'
import styles from './FormSaveBar.module.css'

type Props = {
  label: string
  saving: boolean
  isDirty: boolean
  error?: string | null
}

export function FormSaveBar({ label, saving, isDirty, error }: Props) {
  return (
    <div className={`${styles.bar} ${isDirty ? styles.dirty : ''}`}>
      {error ? (
        <span className={styles.errorText}>{error}</span>
      ) : (
        isDirty && (
          <span className={styles.dirtyText}>
            <span className={styles.dot} />
            Ulagrede endringer
          </span>
        )
      )}
      <button type="submit" className={adminStyles.primaryBtn} disabled={saving}>
        {saving ? 'Lagrer…' : label}
      </button>
    </div>
  )
}
