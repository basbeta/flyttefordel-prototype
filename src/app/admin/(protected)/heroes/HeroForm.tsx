'use client'
// CR-004: Shared create/edit form for heroes.

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CTAType, HeroStatus } from '@prisma/client'
import styles from '@/components/admin/AdminTable.module.css'
import { ImageUploadField } from '@/components/admin/ImageUploadField'
import { FormSaveBar } from '@/components/admin/FormSaveBar'
import { useDirtyTracking } from '@/lib/admin/useDirtyTracking'
import { SelectionFields, type BenefitOption } from '@/components/admin/SelectionFields'
import {
  selectionFieldsFromRule,
  selectionFieldsProblem,
  selectionFieldsToPayload,
} from '@/lib/admin/selectionFields'

type TargetingData = {
  appliesNationally: boolean
  includeUnknownLocation: boolean
  postcodes: unknown
  postcodeRanges: unknown
  movingStatuses: unknown
  // CR-029
  daysSinceMoveMin?: number | null
  daysSinceMoveMax?: number | null
  housingTypes?: unknown
  requiresChosenBenefitIds?: unknown
  hideIfChosen?: boolean | null
}

type HeroData = {
  id: string
  title: string
  description: string | null
  imageUrl: string | null
  imageAlt: string | null
  ctaLabel: string | null
  ctaType: CTAType
  ctaTarget: string | null
  status: HeroStatus
  priority: number
  isFallback: boolean
  startsAt: Date | null
  endsAt: Date | null
  targeting?: TargetingData | null
}

// CR-029: benefitOptions = the benefits, for the cross-sell condition.
type Props = { hero?: HeroData; benefitOptions?: BenefitOption[] }

const CTA_TYPES = [
  { value: 'benefit', label: 'Fordel' },
  { value: 'category', label: 'Kategori' },
  { value: 'external_url', label: 'Ekstern URL' },
  { value: 'internal_page', label: 'Intern side' },
  { value: 'none', label: 'Ingen' },
]

export function HeroForm({ hero, benefitOptions = [] }: Props) {
  const router = useRouter()
  const isEdit = !!hero

  const [title, setTitle] = useState(hero?.title ?? '')
  const [description, setDescription] = useState(hero?.description ?? '')
  const [imageUrl, setImageUrl] = useState(hero?.imageUrl ?? '')
  const [imageAlt, setImageAlt] = useState(hero?.imageAlt ?? '')
  const [ctaLabel, setCtaLabel] = useState(hero?.ctaLabel ?? '')
  const [ctaType, setCtaType] = useState<string>(hero?.ctaType ?? 'none')
  const [ctaTarget, setCtaTarget] = useState(hero?.ctaTarget ?? '')
  const [status, setStatus] = useState<string>(hero?.status ?? 'draft')
  const [priority, setPriority] = useState(hero?.priority ?? 0)
  const [isFallback, setIsFallback] = useState(hero?.isFallback ?? false)
  const [startsAt, setStartsAt] = useState(hero?.startsAt ? new Date(hero.startsAt).toISOString().slice(0, 16) : '')
  const [endsAt, setEndsAt] = useState(hero?.endsAt ? new Date(hero.endsAt).toISOString().slice(0, 16) : '')

  // Targeting state
  const [appliesNationally, setAppliesNationally] = useState(hero?.targeting?.appliesNationally ?? false)
  const [includeUnknownLocation, setIncludeUnknownLocation] = useState(hero?.targeting?.includeUnknownLocation ?? true)
  const [postcodeInput, setPostcodeInput] = useState(() => {
    const val = hero?.targeting?.postcodes
    return Array.isArray(val) ? (val as string[]).join(', ') : ''
  })
  const [selectedSegments, setSelectedSegments] = useState<string[]>(() => {
    const val = hero?.targeting?.movingStatuses
    return Array.isArray(val) ? (val as string[]) : []
  })

  // CR-029: selection fields (a hero has no benefit of its own, so no "hide if chosen")
  const [selection, setSelection] = useState(() => selectionFieldsFromRule(hero?.targeting))

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const payload = useMemo(
    () => ({
      title, description: description || null,
      imageUrl: imageUrl || null, imageAlt: imageAlt || null,
      ctaLabel: ctaLabel || null, ctaType, ctaTarget: ctaTarget || null,
      status, priority: Number(priority), isFallback,
      startsAt: startsAt || null, endsAt: endsAt || null,
      targeting: {
        appliesNationally,
        includeUnknownLocation,
        postcodes: postcodeInput.split(',').map((s) => s.trim()).filter(Boolean),
        postcodeRanges: [],
        movingStatuses: selectedSegments,
        ...selectionFieldsToPayload({ ...selection, hideIfChosen: false }),
      },
    }),
    [
      title, description, imageUrl, imageAlt, ctaLabel, ctaType, ctaTarget,
      status, priority, isFallback, startsAt, endsAt,
      appliesNationally, includeUnknownLocation, postcodeInput, selectedSegments, selection,
    ],
  )
  const { isDirty, showSaved, markSaved } = useDirtyTracking(payload)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // CR-029: do not send a rule the server would reject (from > to, not whole numbers).
    const selectionProblem = selectionFieldsProblem(selection)
    if (selectionProblem) {
      setError(selectionProblem)
      return
    }
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(
        isEdit ? `/api/admin/heroes/${hero.id}` : '/api/admin/heroes',
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )

      if (res.ok) {
        markSaved(payload, isEdit)
        setSaving(false)
        if (isEdit) {
          router.refresh()
        } else {
          const data = (await res.json()) as { id: string }
          router.push(`/admin/heroes/${data.id}`)
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
      <div className={styles.field}>
        <label className={styles.label}>Tittel *</label>
        <input className={styles.input} required value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Beskrivelse</label>
        <textarea className={styles.textarea} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <ImageUploadField
        label="Bilde"
        value={imageUrl || null}
        onChange={setImageUrl}
        altLabel="Bilde-alt"
        altValue={imageAlt}
        onAltChange={setImageAlt}
        recommendedRatio="16:9 (landskap)"
      />

      <div className={styles.formRow}>
        <div className={styles.field}>
          <label className={styles.label}>CTA-type</label>
          <select className={styles.select} value={ctaType} onChange={(e) => setCtaType(e.target.value)}>
            {CTA_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>CTA-knapp tekst</label>
          <input className={styles.input} value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="f.eks. Se fordel" />
        </div>
      </div>

      {ctaType !== 'none' && (
        <div className={styles.field}>
          <label className={styles.label}>CTA-mål (slug, sti eller URL)</label>
          <input className={styles.input} value={ctaTarget} onChange={(e) => setCtaTarget(e.target.value)} />
        </div>
      )}

      <div className={styles.formRow}>
        <div className={styles.field}>
          <label className={styles.label}>Status</label>
          <select className={styles.select} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="draft">Utkast</option>
            <option value="active">Aktiv</option>
            <option value="scheduled">Planlagt</option>
            <option value="paused">Pauset</option>
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Prioritet</label>
          <input className={styles.input} type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} />
        </div>
      </div>

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

      <label style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', fontSize: 'var(--font-sm)', cursor: 'pointer' }}>
        <input type="checkbox" checked={isFallback} onChange={(e) => setIsFallback(e.target.checked)} />
        Fallback (vis når ingen targetede heroer matcher)
      </label>

      <hr style={{ margin: 'var(--space-4) 0', border: 'none', borderTop: '1px solid var(--color-border)' }} />
      <h3 style={{ fontSize: 'var(--font-sm)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>Targeting</h3>

      <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
        <label style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', fontSize: 'var(--font-sm)', cursor: 'pointer' }}>
          <input type="checkbox" checked={appliesNationally} onChange={(e) => setAppliesNationally(e.target.checked)} />
          Nasjonalt (vis for alle)
        </label>
        <label style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', fontSize: 'var(--font-sm)', cursor: 'pointer' }}>
          <input type="checkbox" checked={includeUnknownLocation} onChange={(e) => setIncludeUnknownLocation(e.target.checked)} />
          Inkluder ukjent lokasjon
        </label>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Segment</label>
        <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
          {[
            { value: 'recently_moved', label: 'Nylig flyttet' },
            { value: 'moved_past', label: 'Tidligere flyttet' },
            { value: 'not_moving', label: 'Ikke-flytter' },
          ].map(({ value, label }) => (
            <label key={value} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', fontSize: 'var(--font-sm)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selectedSegments.includes(value)}
                onChange={(e) => setSelectedSegments(
                  e.target.checked
                    ? [...selectedSegments, value]
                    : selectedSegments.filter((s) => s !== value),
                )}
              />
              {label}
            </label>
          ))}
        </div>
        <p className={styles.hint}>Tom = alle segmenter</p>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Postnummer (kommaseparert)</label>
        <input
          className={styles.input}
          value={postcodeInput}
          onChange={(e) => setPostcodeInput(e.target.value)}
          placeholder="f.eks. 0150, 0151, 0152"
          disabled={appliesNationally}
        />
        <p className={styles.hint}>Tom = alle postnummer. Overstyres av &laquo;Nasjonalt&raquo;.</p>
      </div>

      <SelectionFields
        value={selection}
        onChange={setSelection}
        benefitOptions={benefitOptions}
        showHideIfChosen={false}
      />

      <FormSaveBar
        label={isEdit ? 'Lagre endringer' : 'Opprett hero'}
        saving={saving}
        isDirty={isDirty}
        saved={showSaved}
        error={error}
      />
    </form>
  )
}
