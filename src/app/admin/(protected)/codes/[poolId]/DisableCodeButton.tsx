'use client'
// CR-009: Deaktiver enkelt-kode fra pool-detaljsiden.

import { useState } from 'react'
import styles from '@/components/admin/AdminTable.module.css'

type Props = {
  codeId: string
  poolId: string
  status: string
}

export function DisableCodeButton({ codeId, poolId, status }: Props) {
  const [current, setCurrent] = useState(status)
  const [loading, setLoading] = useState(false)

  if (current === 'disabled') {
    return <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-xs)' }}>Deaktivert</span>
  }
  if (current === 'assigned') {
    return <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-xs)' }}>—</span>
  }

  async function handleDisable() {
    if (!confirm('Deaktiver denne koden? Den kan ikke tildeles igjen.')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/codes/${poolId}/${codeId}`, { method: 'PATCH' })
      if (res.ok) setCurrent('disabled')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      className={styles.actionBtn}
      onClick={handleDisable}
      disabled={loading}
      style={{ color: 'var(--color-error)' }}
    >
      {loading ? '…' : 'Deaktiver'}
    </button>
  )
}
