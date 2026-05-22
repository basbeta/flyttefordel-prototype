'use client'
// CR-002: Horizontally scrollable category filter chips.
// activeSlug is passed from the server component — no useSearchParams needed here.

import { useRouter, usePathname } from 'next/navigation'
import type { CategorySummary } from '@/types/app'
import styles from './CategoryFilter.module.css'

type Props = {
  categories: CategorySummary[]
  activeSlug: string | null
}

export function CategoryFilter({ categories, activeSlug }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  function select(slug: string | null) {
    const params = new URLSearchParams()
    if (slug) params.set('category', slug)
    router.push(slug ? `${pathname}?${params}` : pathname)
  }

  return (
    <div className={styles.wrapper} role="group" aria-label="Filtrer på kategori">
      <button
        className={`${styles.chip} ${!activeSlug ? styles.active : ''}`}
        onClick={() => select(null)}
      >
        Alle
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          className={`${styles.chip} ${activeSlug === cat.slug ? styles.active : ''}`}
          onClick={() => select(cat.slug)}
        >
          {cat.icon ? `${cat.icon} ` : ''}{cat.name}
        </button>
      ))}
    </div>
  )
}
