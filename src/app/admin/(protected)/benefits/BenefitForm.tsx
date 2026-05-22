'use client'
// CR-004: Shared create/edit form for benefits.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminAdvertiserRow, AdminCodePoolRow } from '@/types/admin'
import styles from '@/components/admin/AdminTable.module.css'

type Category = { id: string; name: string; slug: string }

type BenefitData = {
  id: string
  title: string
  slug: string
  shortDescription: string
  longDescription: string
  status: string
  advertiserId: string
  categoryId: string
  redemptionType: string
  priority: number
  isFeatured: boolean
  isTimeLimited: boolean
  badgeText: string | null
  termsText: string | null
  usageInstruction: string | null
  startsAt: Date | null
  endsAt: Date | null
  redemption: {
    genericCode: string | null
    externalUrl: string | null
    qrValue: string | null
    ctaLabel: string | null
    opensInNewTab: boolean
  } | null
}

type Props = {
  advertisers: AdminAdvertiserRow[]
  categories: Category[]
  benefit?: BenefitData
}

const REDEMPTION_TYPES = [
  { value: 'generic_code', label: 'Generell kode' },
  { value: 'unique_code', label: 'Unik kode' },
  { value: 'qr_code', label: 'QR-kode' },
  { value: 'external_link', label: 'Ekstern lenke' },
  { value: 'lead_form', label: 'Leadskjema' },
  { value: 'info_only', label: 'Kun info' },
]

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function BenefitForm({ advertisers, categories, benefit }: Props) {
  const router = useRouter()
  const isEdit = !!benefit

  const [title, setTitle] = useState(benefit?.title ?? '')
  const [slug, setSlug] = useState(benefit?.slug ?? '')
  const [shortDescription, setShortDescription] = useState(benefit?.shortDescription ?? '')
  const [longDescription, setLongDescription] = useState(benefit?.longDescription ?? '')
  const [advertiserId, setAdvertiserId] = useState(benefit?.advertiserId ?? advertisers[0]?.id ?? '')
  const [categoryId, setCategoryId] = useState(benefit?.categoryId ?? categories[0]?.id ?? '')
  const [redemptionType, setRedemptionType] = useState(benefit?.redemptionType ?? 'generic_code')
  const [status, setStatus] = useState(benefit?.status ?? 'draft')
  const [priority, setPriority] = useState(benefit?.priority ?? 0)
  const [isFeatured, setIsFeatured] = useState(benefit?.isFeatured ?? false)
  const [isTimeLimited, setIsTimeLimited] = useState(benefit?.isTimeLimited ?? false)
  const [badgeText, setBadgeText] = useState(benefit?.badgeText ?? '')
  const [termsText, setTermsText] = useState(benefit?.termsText ?? '')
  const [usageInstruction, setUsageInstruction] = useState(benefit?.usageInstruction ?? '')
  const [startsAt, setStartsAt] = useState(benefit?.startsAt ? new Date(benefit.startsAt).toISOString().slice(0, 16) : '')
  const [endsAt, setEndsAt] = useState(benefit?.endsAt ? new Date(benefit.endsAt).toISOString().slice(0, 16) : '')
  // Redemption fields
  const [genericCode, setGenericCode] = useState(benefit?.redemption?.genericCode ?? '')
  const [externalUrl, setExternalUrl] = useState(benefit?.redemption?.externalUrl ?? '')
  const [qrValue, setQrValue] = useState(benefit?.redemption?.qrValue ?? '')
  const [ctaLabel, setCtaLabel] = useState(benefit?.redemption?.ctaLabel ?? '')
  const [opensInNewTab, setOpensInNewTab] = useState(benefit?.redemption?.opensInNewTab ?? true)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleTitleChange(val: string) {
    setTitle(val)
    if (!isEdit) setSlug(slugify(val))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const payload = {
      title, slug, shortDescription, longDescription,
      advertiserId, categoryId, redemptionType, status,
      priority: Number(priority), isFeatured, isTimeLimited,
      badgeText: badgeText || null, termsText: termsText || null,
      usageInstruction: usageInstruction || null,
      startsAt: startsAt || null, endsAt: endsAt || null,
      redemption: {
        genericCode: genericCode || null,
        externalUrl: externalUrl || null,
        qrValue: qrValue || null,
        ctaLabel: ctaLabel || null,
        opensInNewTab,
      },
    }

    const res = await fetch(
      isEdit ? `/api/admin/benefits/${benefit.id}` : '/api/admin/benefits',
      {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    )

    if (res.ok) {
      router.push('/admin/benefits')
      router.refresh()
    } else {
      const data = (await res.json()) as { message?: string }
      setError(data.message ?? 'Noe gikk galt')
      setSaving(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.formRow}>
        <div className={styles.field}>
          <label className={styles.label}>Tittel *</label>
          <input className={styles.input} required value={title} onChange={(e) => handleTitleChange(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Slug *</label>
          <input className={styles.input} required value={slug} onChange={(e) => setSlug(e.target.value)} />
          <p className={styles.hint}>Genereres automatisk fra tittel</p>
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Kort beskrivelse *</label>
        <input className={styles.input} required value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Lang beskrivelse *</label>
        <textarea className={styles.textarea} required rows={4} value={longDescription} onChange={(e) => setLongDescription(e.target.value)} />
      </div>

      <div className={styles.formRow}>
        <div className={styles.field}>
          <label className={styles.label}>Annonsør *</label>
          <select className={styles.select} required value={advertiserId} onChange={(e) => setAdvertiserId(e.target.value)}>
            {advertisers.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Kategori *</label>
          <select className={styles.select} required value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.field}>
          <label className={styles.label}>Redemption-type *</label>
          <select className={styles.select} value={redemptionType} onChange={(e) => setRedemptionType(e.target.value)}>
            {REDEMPTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Status</label>
          <select className={styles.select} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="draft">Utkast</option>
            <option value="active">Aktiv</option>
            <option value="scheduled">Planlagt</option>
          </select>
        </div>
      </div>

      {redemptionType === 'generic_code' && (
        <div className={styles.field}>
          <label className={styles.label}>Rabattkode</label>
          <input className={styles.input} value={genericCode} onChange={(e) => setGenericCode(e.target.value)} placeholder="f.eks. FLYTT20" />
        </div>
      )}
      {redemptionType === 'external_link' && (
        <div className={styles.formRow}>
          <div className={styles.field}>
            <label className={styles.label}>URL</label>
            <input className={styles.input} type="url" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://" />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Åpne i ny fane</label>
            <select className={styles.select} value={opensInNewTab ? 'yes' : 'no'} onChange={(e) => setOpensInNewTab(e.target.value === 'yes')}>
              <option value="yes">Ja</option><option value="no">Nei</option>
            </select>
          </div>
        </div>
      )}
      {redemptionType === 'qr_code' && (
        <div className={styles.field}>
          <label className={styles.label}>QR-innhold (URL eller tekst)</label>
          <input className={styles.input} value={qrValue} onChange={(e) => setQrValue(e.target.value)} />
        </div>
      )}
      {redemptionType !== 'info_only' && (
        <div className={styles.field}>
          <label className={styles.label}>CTA-knapp tekst</label>
          <input className={styles.input} value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="f.eks. Hent rabattkode" />
        </div>
      )}

      <div className={styles.formRow}>
        <div className={styles.field}>
          <label className={styles.label}>Starter</label>
          <input className={styles.input} type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Utløper</label>
          <input className={styles.input} type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.field}>
          <label className={styles.label}>Prioritet</label>
          <input className={styles.input} type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Badge-tekst</label>
          <input className={styles.input} value={badgeText} onChange={(e) => setBadgeText(e.target.value)} placeholder="f.eks. Populær" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-6)' }}>
        <label style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', fontSize: 'var(--font-sm)', cursor: 'pointer' }}>
          <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
          Fremhevet
        </label>
        <label style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', fontSize: 'var(--font-sm)', cursor: 'pointer' }}>
          <input type="checkbox" checked={isTimeLimited} onChange={(e) => setIsTimeLimited(e.target.checked)} />
          Tidsbegrenset
        </label>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Bruksanvisning</label>
        <textarea className={styles.textarea} rows={2} value={usageInstruction} onChange={(e) => setUsageInstruction(e.target.value)} />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Vilkår</label>
        <textarea className={styles.textarea} rows={2} value={termsText} onChange={(e) => setTermsText(e.target.value)} />
      </div>

      {error && <p style={{ color: 'var(--color-error)', fontSize: 'var(--font-sm)' }}>{error}</p>}

      <div className={styles.formActions}>
        <button type="submit" className={styles.primaryBtn} disabled={saving}>
          {saving ? 'Lagrer…' : isEdit ? 'Lagre endringer' : 'Opprett fordel'}
        </button>
      </div>
    </form>
  )
}
