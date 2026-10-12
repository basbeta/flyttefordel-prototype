'use client'
// CR-025: Delete (soft) a page in the web flow. Placements on the page stay in the
// database, but the page and its cards drop out of the flow.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from '@/components/admin/AdminTable.module.css'

type Props = { id: string; name: string; placedCount: number }

export function DeleteFlowPageButton({ id, name, placedCount }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    const warning =
      placedCount > 0
        ? `«${name}» har ${placedCount} plassert(e) fordel(er). De forsvinner fra web-løpet, men beholder plasseringen i databasen. Slette siden?`
        : `Slette «${name}»?`
    if (!confirm(warning)) return

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/flow-pages/${id}`, { method: 'DELETE' })
      if (res.ok) {
        router.refresh()
      } else {
        const data = (await res.json().catch(() => ({}))) as { message?: string }
        setError(data.message ?? 'Noe gikk galt')
        setLoading(false)
      }
    } catch {
      setError('Nettverksfeil, prøv igjen')
      setLoading(false)
    }
  }

  return (
    <>
      <button className={styles.dangerBtn} onClick={handleDelete} disabled={loading}>
        {loading ? '…' : 'Slett'}
      </button>
      {error && (
        <span role="alert" style={{ color: 'var(--color-error)', fontSize: 'var(--font-xs)' }}>
          {error}
        </span>
      )}
    </>
  )
}
