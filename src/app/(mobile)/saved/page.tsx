// CR-003: Lagrede fordeler.

import type { Metadata } from 'next'
import { getOrCreateSession } from '@/lib/session'
import { getSavedBenefits } from '@/lib/queries/savedQueries'
import { BenefitCard } from '@/components/mobile/BenefitCard'
import { TopBar } from '@/components/mobile/TopBar'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Mine fordeler' }

export default async function SavedPage() {
  const session = await getOrCreateSession()
  const benefits = session ? await getSavedBenefits(session.sessionId) : []

  return (
    <>
      <TopBar variant="title" title="Mine fordeler" />
      <div className={styles.page}>
        {benefits.length > 0 ? (
          <div className={styles.grid}>
            {benefits.map((b) => (
              <BenefitCard key={b.id} benefit={b} />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <div className={styles.emptyIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3z" />
              </svg>
            </div>
            <p className={styles.emptyTitle}>Ingen lagrede fordeler ennå</p>
            <p className={styles.emptyDesc}>
              Trykk på hjertet på en fordel for å lagre den her.
            </p>
          </div>
        )}
      </div>
    </>
  )
}
