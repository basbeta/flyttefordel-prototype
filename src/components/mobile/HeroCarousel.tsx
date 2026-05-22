'use client'
// CR-002: Hero carousel for the home screen — CSS scroll-snap, no external library.

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import type { HeroCard } from '@/types/app'
import styles from './HeroCarousel.module.css'

type Props = { heroes: HeroCard[] }

export function HeroCarousel({ heroes }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)

  const handleScroll = useCallback(() => {
    if (!trackRef.current) return
    const { scrollLeft, offsetWidth } = trackRef.current
    setActiveIndex(Math.round(scrollLeft / offsetWidth))
  }, [])

  if (heroes.length === 0) return null

  return (
    <div className={styles.wrapper}>
      <div ref={trackRef} className={styles.track} onScroll={handleScroll}>
        {heroes.map((hero) => {
          const href = resolveHref(hero)
          const slide = <HeroSlide hero={hero} />
          return href ? (
            <Link key={hero.id} href={href} className={styles.slideLink}>
              {slide}
            </Link>
          ) : (
            <div key={hero.id} className={styles.slideLink}>
              {slide}
            </div>
          )
        })}
      </div>
      {heroes.length > 1 && (
        <div className={styles.dots} aria-hidden="true">
          {heroes.map((_, i) => (
            <span key={i} className={`${styles.dot} ${i === activeIndex ? styles.dotActive : ''}`} />
          ))}
        </div>
      )}
    </div>
  )
}

function HeroSlide({ hero }: { hero: HeroCard }) {
  // Gradient index cycles through 4 preset palette entries for demo (no real images).
  return (
    <div
      className={styles.slide}
      style={hero.imageUrl ? { backgroundImage: `url(${hero.imageUrl})` } : {}}
      aria-label={hero.imageAlt ?? hero.title}
    >
      <div className={styles.overlay}>
        <div className={styles.content}>
          <h2 className={styles.title}>{hero.title}</h2>
          {hero.description && <p className={styles.desc}>{hero.description}</p>}
          {hero.ctaLabel && <span className={styles.cta}>{hero.ctaLabel}</span>}
        </div>
      </div>
    </div>
  )
}

function resolveHref(hero: HeroCard): string | null {
  switch (hero.ctaType) {
    case 'benefit':
      return hero.ctaTarget ? `/benefits/${hero.ctaTarget}` : null
    case 'category':
      return hero.ctaTarget ? `/benefits?category=${hero.ctaTarget}` : null
    case 'external_url':
    case 'internal_page':
      return hero.ctaTarget ?? null
    default:
      return null
  }
}
