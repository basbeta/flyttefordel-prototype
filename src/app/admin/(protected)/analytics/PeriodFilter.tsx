'use client'
// CR-008: Tidsperiode-velger for analytics-siden.

import { useRouter, useSearchParams } from 'next/navigation'
import styles from '@/components/admin/AdminTable.module.css'

const OPTIONS = [
  { value: '7d', label: 'Siste 7 dager' },
  { value: '30d', label: 'Siste 30 dager' },
  { value: 'all', label: 'Totalt' },
]

export function PeriodFilter({ current }: { current: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('period', value)
    router.push(`/admin/analytics?${params.toString()}`)
  }

  return (
    <select
      className={styles.filterSelect}
      value={current}
      onChange={(e) => handleChange(e.target.value)}
      aria-label="Velg tidsperiode"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
