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

type Props = {
  id: string
  currentStatus: BenefitStatus
  // CR-017: reasons fra getBenefitConfigProblems(status: 'active') — når
  // ikke-tom, deaktiveres knapper som ville aktivert en «Feilet» fordel.
  // Serveren er den autoritative sperren; dette er kun for å unngå en
  // unødvendig tur-retur for det vanligste tilfellet.
  activationProblems?: string[]
}

export function BenefitStatusActions({ id, currentStatus, activationProblems = [] }: Props) {
  const router = useRouter()
  const actions = TRANSITIONS[currentStatus] ?? []

  async function changeStatus(next: BenefitStatus) {
    try {
      const res = await fetch(`/api/admin/benefits/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (res.ok) router.refresh()
    } catch {
      // Network error — do nothing, user can retry
    }
  }

  return (
    <div className={styles.actionMenu}>
      {actions.map((a) => {
        const blocked = a.next === 'active' && activationProblems.length > 0
        return (
          <button
            key={a.next}
            className={styles.secondaryBtn}
            onClick={() => changeStatus(a.next)}
            disabled={blocked}
            title={blocked ? activationProblems.join('; ') : undefined}
          >
            {a.label}
          </button>
        )
      })}
      <Link href={`/admin/benefits/${id}`} className={styles.secondaryBtn}>Rediger</Link>
    </div>
  )
}
