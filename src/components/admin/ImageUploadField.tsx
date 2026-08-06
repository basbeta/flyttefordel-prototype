'use client'
// CR-012: Delt bildeopplastingsfelt for admin-formene (Benefit/Advertiser/Hero).
// Erstatter ren tekst-URL-input — laster opp direkte til S3-kompatibel storage
// via /api/admin/upload og setter resultat-URL-en via onChange.

import { useRef, useState } from 'react'
import styles from '@/components/admin/AdminTable.module.css'

type Props = {
  label: string
  value: string | null
  onChange: (url: string) => void
  altLabel?: string
  altValue?: string
  onAltChange?: (alt: string) => void
  /** Vises som anbefalt-format-hint. Sett kun der bildet faktisk rendres et sted med et kjent aspect ratio. */
  recommendedRatio?: string
}

export function ImageUploadField({
  label,
  value,
  onChange,
  altLabel,
  altValue,
  onAltChange,
  recommendedRatio,
}: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    const formData = new FormData()
    formData.set('file', file)

    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
      if (res.ok) {
        const data = (await res.json()) as { url: string }
        onChange(data.url)
      } else {
        const data = (await res.json().catch(() => null)) as { message?: string } | null
        setError(data?.message ?? 'Opplasting feilet')
      }
    } catch {
      setError('Nettverksfeil — prøv igjen')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function handleRemove() {
    onChange('')
    onAltChange?.('')
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className={styles.formRow}>
      <div className={styles.field}>
        <label className={styles.label}>{label}</label>

        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          {value && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt=""
              style={{
                width: '56px',
                height: '56px',
                flexShrink: 0,
                objectFit: 'cover',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
              }}
            />
          )}
          <input
            ref={inputRef}
            className={styles.input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            disabled={uploading}
            style={{ flex: 1 }}
          />
        </div>

        <p className={styles.hint}>
          {uploading
            ? 'Laster opp…'
            : `JPG, PNG eller WebP, maks 5 MB${recommendedRatio ? ` — anbefalt format ${recommendedRatio}` : ''}`}
        </p>

        {value && !uploading && (
          <button
            type="button"
            className={styles.secondaryBtn}
            style={{ alignSelf: 'flex-start' }}
            onClick={handleRemove}
          >
            Fjern bilde
          </button>
        )}

        {error && <p style={{ color: 'var(--color-error)', fontSize: 'var(--font-xs)' }}>{error}</p>}
      </div>

      {altLabel !== undefined && onAltChange && (
        <div className={styles.field}>
          <label className={styles.label}>{altLabel}</label>
          <input className={styles.input} value={altValue ?? ''} onChange={(e) => onAltChange(e.target.value)} />
        </div>
      )}
    </div>
  )
}
