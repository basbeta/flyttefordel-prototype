// CR-002: Fordelsliste med kategorifilterkort.
// CR-003: Session-aware isSaved state.

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getActiveBenefits, getActiveCategories } from '@/lib/queries/benefitQueries'
import { getOrCreateSession } from '@/lib/session'
import { BenefitCard } from '@/components/mobile/BenefitCard'
import { CategoryFilter } from '@/components/mobile/CategoryFilter'
import { TopBar } from '@/components/mobile/TopBar'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Fordeler' }

type Props = {
  searchParams: Promise<{ category?: string }>
}

export default async function BenefitsPage({ searchParams }: Props) {
  const { category } = await searchParams
  const activeCategory = category ?? null
  const session = await getOrCreateSession()
  const [categories, benefits] = await Promise.all([
    getActiveCategories(),
    getActiveBenefits(activeCategory ?? undefined, session),
  ])

  return (
    <>
      <TopBar variant="title" title="Fordeler" />
      <div className={styles.page}>
        <Suspense>
          <CategoryFilter categories={categories} activeSlug={activeCategory} />
        </Suspense>
        {benefits.length > 0 ? (
          <div className={styles.grid}>
            {benefits.map((b) => (
              <BenefitCard key={b.id} benefit={b} />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <p>Ingen fordeler i denne kategorien akkurat nå.</p>
          </div>
        )}
      </div>
    </>
  )
}
