'use client'
// CR-003: Profile form — updates postcode and movingStatus via PATCH /api/session/profile.

import { useState } from 'react'
import { Button } from '@/components/shared/Button'
import type { UserMovingStatus } from '@prisma/client'
import styles from './page.module.css'

type Props = {
  initialPostcode: string | null
  initialMovingStatus: UserMovingStatus
}

const MOVING_OPTIONS: { value: UserMovingStatus; label: string }[] = [
  { value: 'recently_moved', label: 'Nylig flyttet (siste 60 dager)' },
  { value: 'moved_past', label: 'Flyttet for mer enn 60 dager siden' },
  { value: 'not_moving', label: 'Ikke planlagt å flytte' },
  { value: 'unknown', label: 'Ønsker ikke å oppgi' },
]

export function ProfileForm({ initialPostcode, initialMovingStatus }: Props) {
  const [postcode, setPostcode] = useState(initialPostcode ?? '')
  const [movingStatus, setMovingStatus] = useState<UserMovingStatus>(initialMovingStatus)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)

    const body: { postcode?: string | null; movingStatus?: UserMovingStatus } = {
      movingStatus,
    }
    if (postcode.length === 0) {
      body.postcode = null
    } else if (/^\d{4}$/.test(postcode)) {
      body.postcode = postcode
    } else {
      setError('Postnummer må være 4 siffer')
      setSaving(false)
      return
    }

    try {
      const res = await fetch('/api/session/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = (await res.json()) as { message?: string }
        throw new Error(data.message ?? 'Noe gikk galt')
      }
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noe gikk galt. Prøv igjen.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="postcode">Postnummer</label>
        <input
          id="postcode"
          type="text"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          placeholder="f.eks. 0150"
          value={postcode}
          onChange={(e) => setPostcode(e.target.value.replace(/\D/g, '').slice(0, 4))}
          className={styles.input}
        />
        <p className={styles.hint}>Brukes for å vise relevante lokale fordeler.</p>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Flyttestatus</label>
        <div className={styles.radioGroup}>
          {MOVING_OPTIONS.map((opt) => (
            <label key={opt.value} className={styles.radioLabel}>
              <input
                type="radio"
                name="movingStatus"
                value={opt.value}
                checked={movingStatus === opt.value}
                onChange={() => setMovingStatus(opt.value)}
                className={styles.radioInput}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {error && <p className={styles.errorMsg}>{error}</p>}
      {saved && <p className={styles.successMsg}>Profil lagret!</p>}

      <Button type="submit" fullWidth loading={saving}>
        Lagre
      </Button>
    </form>
  )
}
