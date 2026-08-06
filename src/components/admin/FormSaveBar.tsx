'use client'
// CR-013: Flytende lagre-knapp — erstatter den statiske "formActions"
// -knappen nederst i lange former. Vises kun når formet har ulagrede
// endringer (isDirty), sammen med en pulserende "Ulagrede endringer"
// -indikator.

import adminStyles from '@/components/admin/AdminTable.module.css'
import styles from './FormSaveBar.module.css'

type Props = {
  label: string
  saving: boolean
  isDirty: boolean
  error?: string | null
}

export function FormSaveBar({ label, saving, isDirty, error }: Props) {
  if (!isDirty && !error) return null

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
