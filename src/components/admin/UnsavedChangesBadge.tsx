'use client'
// CR-013: Alltid synlig indikator når et admin-form har ulagrede endringer.

import styles from './UnsavedChangesBadge.module.css'

type Props = { isDirty: boolean }

export function UnsavedChangesBadge({ isDirty }: Props) {
  if (!isDirty) return null

  return (
    <div className={styles.badge} role="status">
      <span className={styles.dot} />
      Ulagrede endringer
    </div>
  )
}
