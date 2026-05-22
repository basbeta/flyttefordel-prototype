'use client'
// CR-004: Legg til koder i en pool via textarea-dialog.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from '@/components/admin/AdminTable.module.css'

type Props = { poolId: string; poolName: string }

export function AddCodesButton({ poolId, poolName }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [codesText, setCodesText] = useState('')
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function handleAdd() {
    const codes = codesText.split('\n').map((c) => c.trim()).filter(Boolean)
    if (codes.length === 0) return

    setSaving(true)
    setResult(null)
    try {
      const res = await fetch(`/api/admin/codes/${poolId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codes }),
      })
      if (res.ok) {
        const data = (await res.json()) as { added: number; skipped: number }
        const msg = data.skipped > 0
          ? `${data.added} koder lagt til. ${data.skipped} duplikat(er) hoppet over.`
          : `${data.added} koder lagt til.`
        setResult(msg)
        setCodesText('')
        router.refresh()
      } else {
        const data = (await res.json()) as { message?: string }
        setResult(data.message ?? 'Feil ved lagring')
      }
    } catch {
      setResult('Nettverksfeil — prøv igjen')
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button className={styles.secondaryBtn} onClick={() => setOpen(true)}>
        + Legg til koder
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', minWidth: 260 }}>
      <p style={{ fontSize: 'var(--font-xs)', color: 'var(--color-text-muted)' }}>
        {poolName} — én kode per linje
      </p>
      <textarea
        className={styles.input}
        rows={6}
        value={codesText}
        onChange={(e) => setCodesText(e.target.value)}
        placeholder={'KODE1\nKODE2\nKODE3'}
        style={{ fontFamily: 'monospace', resize: 'vertical' }}
      />
      {result && (
        <p style={{ fontSize: 'var(--font-xs)', color: result.includes('Feil') ? 'var(--color-error)' : 'var(--color-success)' }}>
          {result}
        </p>
      )}
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <button className={styles.primaryBtn} onClick={handleAdd} disabled={saving}>
          {saving ? 'Lagrer…' : 'Legg til'}
        </button>
        <button className={styles.secondaryBtn} onClick={() => { setOpen(false); setResult(null) }}>
          Avbryt
        </button>
      </div>
    </div>
  )
}
