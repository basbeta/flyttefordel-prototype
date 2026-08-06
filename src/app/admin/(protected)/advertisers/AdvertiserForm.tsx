'use client'
// CR-004: Shared create/edit form for advertisers.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from '@/components/admin/AdminTable.module.css'
import { ImageUploadField } from '@/components/admin/ImageUploadField'
import { FormSaveBar } from '@/components/admin/FormSaveBar'
import { useUnsavedChangesWarning } from '@/lib/admin/useUnsavedChangesWarning'

type AdvertiserData = {
  id: string
  name: string
  slug: string
  orgNumber: string | null
  websiteUrl: string | null
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
  internalNotes: string | null
  isActive: boolean
  logoUrl?: string | null
}

type Props = { advertiser?: AdvertiserData }

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function AdvertiserForm({ advertiser }: Props) {
  const router = useRouter()
  const isEdit = !!advertiser

  const [name, setName] = useState(advertiser?.name ?? '')
  const [slug, setSlug] = useState(advertiser?.slug ?? '')
  const [orgNumber, setOrgNumber] = useState(advertiser?.orgNumber ?? '')
  const [websiteUrl, setWebsiteUrl] = useState(advertiser?.websiteUrl ?? '')
  const [contactName, setContactName] = useState(advertiser?.contactName ?? '')
  const [contactEmail, setContactEmail] = useState(advertiser?.contactEmail ?? '')
  const [contactPhone, setContactPhone] = useState(advertiser?.contactPhone ?? '')
  const [internalNotes, setInternalNotes] = useState(advertiser?.internalNotes ?? '')
  const [isActive, setIsActive] = useState(advertiser?.isActive ?? true)
  const [logoUrl, setLogoUrl] = useState(advertiser?.logoUrl ?? '')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const payload = useMemo(
    () => ({
      name, slug,
      orgNumber: orgNumber || null,
      websiteUrl: websiteUrl || null,
      contactName: contactName || null,
      contactEmail: contactEmail || null,
      contactPhone: contactPhone || null,
      internalNotes: internalNotes || null,
      isActive,
      logoUrl: logoUrl || null,
    }),
    [name, slug, orgNumber, websiteUrl, contactName, contactEmail, contactPhone, internalNotes, isActive, logoUrl],
  )
  const baselineRef = useRef(JSON.stringify(payload))
  const isDirty = JSON.stringify(payload) !== baselineRef.current
  useUnsavedChangesWarning(isDirty)

  const [justSaved, setJustSaved] = useState(false)
  useEffect(() => {
    if (isDirty) setJustSaved(false)
  }, [isDirty])

  function handleNameChange(val: string) {
    setName(val)
    if (!isEdit) setSlug(slugify(val))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(
        isEdit ? `/api/admin/advertisers/${advertiser.id}` : '/api/admin/advertisers',
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )

      if (res.ok) {
        baselineRef.current = JSON.stringify(payload)
        setSaving(false)
        if (isEdit) {
          setJustSaved(true)
          router.refresh()
        } else {
          const data = (await res.json()) as { id: string }
          router.push(`/admin/advertisers/${data.id}`)
        }
      } else {
        const data = (await res.json()) as { message?: string }
        setError(data.message ?? 'Noe gikk galt')
        setSaving(false)
      }
    } catch {
      setError('Nettverksfeil — prøv igjen')
      setSaving(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.formRow}>
        <div className={styles.field}>
          <label className={styles.label}>Navn *</label>
          <input className={styles.input} required value={name} onChange={(e) => handleNameChange(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Slug *</label>
          <input className={styles.input} required value={slug} onChange={(e) => setSlug(e.target.value)} />
          <p className={styles.hint}>Genereres automatisk fra navn</p>
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.field}>
          <label className={styles.label}>Org.nummer</label>
          <input className={styles.input} value={orgNumber} onChange={(e) => setOrgNumber(e.target.value)} placeholder="123456789" />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Nettside</label>
          <input className={styles.input} type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://" />
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.field}>
          <label className={styles.label}>Kontaktnavn</label>
          <input className={styles.input} value={contactName} onChange={(e) => setContactName(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Kontakt-e-post</label>
          <input className={styles.input} type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.field}>
          <label className={styles.label}>Kontakttelefon</label>
          <input className={styles.input} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Status</label>
          <select className={styles.select} value={isActive ? 'active' : 'inactive'} onChange={(e) => setIsActive(e.target.value === 'active')}>
            <option value="active">Aktiv</option>
            <option value="inactive">Inaktiv</option>
          </select>
        </div>
      </div>

      <ImageUploadField label="Logo" value={logoUrl || null} onChange={setLogoUrl} />

      <div className={styles.field}>
        <label className={styles.label}>Interne notater</label>
        <textarea className={styles.textarea} rows={3} value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} placeholder="Kun synlig for admin" />
      </div>

      <FormSaveBar
        label={isEdit ? 'Lagre endringer' : 'Opprett annonsør'}
        saving={saving}
        isDirty={isDirty}
        saved={justSaved}
        error={error}
      />
    </form>
  )
}
