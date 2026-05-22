// CR-002: Fase 2 — Hjemskjerm med herokarusell og fordelsgrid.

import type { Metadata } from 'next'
import { getActiveHeroes } from '@/lib/queries/heroQueries'
import { getActiveBenefits } from '@/lib/queries/benefitQueries'
import { HeroCarousel } from '@/components/mobile/HeroCarousel'
import { BenefitCard } from '@/components/mobile/BenefitCard'
import { TopBar } from '@/components/mobile/TopBar'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Hjem' }

export default async function HomePage() {
  const [heroes, benefits] = await Promise.all([getActiveHeroes(), getActiveBenefits()])

  return (
    <>
      <TopBar variant="default" />
      <div className={styles.page}>
        {heroes.length > 0 && <HeroCarousel heroes={heroes} />}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Fordeler for deg</h2>
          {benefits.length > 0 ? (
            <div className={styles.grid}>
              {benefits.map((b) => (
                <BenefitCard key={b.id} benefit={b} />
              ))}
            </div>
          ) : (
            <p className={styles.empty}>Ingen fordeler tilgjengelig akkurat nå.</p>
          )}
        </section>
      </div>
    </>
  )
}
