'use client'
// CR-007: Deaktiver-knapp for kategorier.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from '@/components/admin/AdminTable.module.css'

type Props = { id: string; name: string; benefitCount: number }

export function DeactivateCategoryButton({ id, name, benefitCount }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDeactivate() {
    const warning = benefitCount > 0
      ? `«${name}» har ${benefitCount} fordel(er). Disse beholder kategorien, men den vises ikke lenger i filterchips. Fortsett?`
      : `Deaktiver «${name}»?`

    if (!confirm(warning)) return

    setLoading(true)
    const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
    if (res.ok) {
      router.refresh()
    } else {
      const data = (await res.json()) as { message?: string }
      alert(data.message ?? 'Noe gikk galt')
      setLoading(false)
    }
  }

  return (
    <button className={styles.dangerBtn} onClick={handleDeactivate} disabled={loading}>
      {loading ? '…' : 'Deaktiver'}
    </button>
  )
}
