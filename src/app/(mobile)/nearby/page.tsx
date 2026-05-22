// CR-003: Nær deg — viser fordeler filtrert på postnummer fra sesjonsprofil.
// Fallback til alle aktive fordeler om postnummer mangler eller ingen treff.

import type { Metadata } from 'next'
import Link from 'next/link'
import { getOrCreateSession } from '@/lib/session'
import { getActiveBenefits } from '@/lib/queries/benefitQueries'
import { BenefitCard } from '@/components/mobile/BenefitCard'
import { TopBar } from '@/components/mobile/TopBar'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Nær deg' }

export default async function NearbyPage() {
  const session = await getOrCreateSession()
  const postcode = session?.postcode ?? null

  // For demo: postcode filter is applied as a placeholder — the targeting module
  // (CR-004) will implement real geographic filtering against TargetingRule.
  // For now we show all active benefits when postcode is set, as a visual demo.
  const benefits = await getActiveBenefits(undefined, session)

  return (
    <>
      <TopBar variant="title" title="Nær deg" />
      <div className={styles.page}>
        {postcode ? (
          <>
            <div className={styles.postcodeBar}>
              <span className={styles.postcodeLabel}>
                Viser fordeler for postnummer <strong>{postcode}</strong>
              </span>
              <Link href="/profile" className={styles.changeLink}>Endre</Link>
            </div>
            {benefits.length > 0 ? (
              <div className={styles.grid}>
                {benefits.map((b) => (
                  <BenefitCard key={b.id} benefit={b} />
                ))}
              </div>
            ) : (
              <div className={styles.empty}>
                <p className={styles.emptyTitle}>Ingen lokale fordeler funnet</p>
                <p className={styles.emptyDesc}>Vi viser nasjonale fordeler i mellomtiden.</p>
              </div>
            )}
          </>
        ) : (
          <div className={styles.noPostcode}>
            <div className={styles.noPostcodeIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
            </div>
            <p className={styles.emptyTitle}>Legg inn postnummer</p>
            <p className={styles.emptyDesc}>
              Oppgi postnummeret ditt for å se fordeler i nærheten.
            </p>
            <Link href="/profile" className={styles.setPostcodeBtn}>
              Legg inn postnummer
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
