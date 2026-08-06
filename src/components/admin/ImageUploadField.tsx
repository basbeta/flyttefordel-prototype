'use client'
// CR-012: Delt bildeopplastingsfelt for admin-formene (Benefit/Advertiser/Hero).
// Erstatter ren tekst-URL-input — laster opp direkte til S3-kompatibel storage
// via /api/admin/upload og setter resultat-URL-en via onChange.

import { useEffect, useRef, useState } from 'react'
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
  const [fileName, setFileName] = useState<string | null>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!lightboxOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightboxOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxOpen])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
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
    setFileName(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className={styles.formRow}>
      <div className={styles.field}>
        <label className={styles.label}>{label}</label>

        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          {value && (
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              title="Se bilde i full størrelse"
              style={{ padding: 0, border: 'none', background: 'none', flexShrink: 0, lineHeight: 0 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value}
                alt=""
                style={{
                  width: '56px',
                  height: '56px',
                  objectFit: 'cover',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  cursor: 'zoom-in',
                }}
              />
            </button>
          )}
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Laster opp…' : 'Velg fil'}
          </button>
          <span className={styles.hint} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {fileName ?? 'Ingen fil valgt'}
          </span>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            disabled={uploading}
            style={{ display: 'none' }}
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

      {lightboxOpen && value && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={label}
          onClick={() => setLightboxOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-6)',
            cursor: 'zoom-out',
            zIndex: 1000,
          }}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Lukk"
            style={{
              position: 'absolute',
              top: 'var(--space-4)',
              right: 'var(--space-4)',
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-full)',
              border: 'none',
              background: 'rgba(255, 255, 255, 0.15)',
              color: '#fff',
              fontSize: 'var(--font-lg)',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt=""
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: 'var(--radius-md)',
              cursor: 'default',
            }}
          />
        </div>
      )}
    </div>
  )
}
