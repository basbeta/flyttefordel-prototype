'use client'
// CR-004: Inline status-toggle for benefits table.

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { BenefitStatus } from '@prisma/client'
import styles from '@/components/admin/AdminTable.module.css'

const TRANSITIONS: Partial<Record<BenefitStatus, { label: string; next: BenefitStatus }[]>> = {
  draft:     [{ label: 'Publiser', next: 'active' }],
  scheduled: [{ label: 'Aktiver nå', next: 'active' }],
  active:    [{ label: 'Pause', next: 'paused' }],
  paused:    [{ label: 'Aktiver', next: 'active' }, { label: 'Arkiver', next: 'archived' }],
  expired:   [{ label: 'Arkiver', next: 'archived' }],
}

export function BenefitStatusActions({ id, currentStatus }: { id: string; currentStatus: BenefitStatus }) {
  const router = useRouter()
  const actions = TRANSITIONS[currentStatus] ?? []

  async function changeStatus(next: BenefitStatus) {
    await fetch(`/api/admin/benefits/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    router.refresh()
  }

  return (
    <div className={styles.actionMenu}>
      {actions.map((a) => (
        <button key={a.next} className={styles.secondaryBtn} onClick={() => changeStatus(a.next)}>
          {a.label}
        </button>
      ))}
      <Link href={`/admin/benefits/${id}`} className={styles.secondaryBtn}>Rediger</Link>
    </div>
  )
}
