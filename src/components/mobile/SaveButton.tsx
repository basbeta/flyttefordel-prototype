'use client'
// CR-003: Heart-toggle button for saving/unsaving a benefit.
// Optimistic update — toggles instantly, reverts on API error.
// Works in both BenefitCard (list) and benefit detail page.

import { useState } from 'react'
import styles from './SaveButton.module.css'

type Props = {
  slug: string
  initialSaved: boolean
  size?: 'sm' | 'md'
}

export function SaveButton({ slug, initialSaved, size = 'md' }: Props) {
  const [saved, setSaved] = useState(initialSaved)
  const [pending, setPending] = useState(false)

  async function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (pending) return

    const next = !saved
    setSaved(next)
    setPending(true)

    try {
      const res = await fetch(`/api/benefits/${slug}/save`, {
        method: next ? 'POST' : 'DELETE',
      })
      if (!res.ok && res.status !== 204) throw new Error()
    } catch {
      setSaved(!next) // revert
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      className={`${styles.btn} ${styles[size]} ${saved ? styles.saved : ''}`}
      onClick={toggle}
      aria-label={saved ? 'Fjern fra lagrede fordeler' : 'Lagre fordel'}
      aria-pressed={saved}
      disabled={pending}
    >
      <svg viewBox="0 0 24 24" className={styles.icon} aria-hidden="true" focusable="false">
        {saved ? (
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        ) : (
          <path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z" />
        )}
      </svg>
    </button>
  )
}
