'use client'
// CR-027: Content overrides of a benefit per surface ("Visninger"): title, text, image and
// badge on the app card and on the web card. An empty field means "inherit from the benefit",
// and the field shows the inherited value as a placeholder. The preview resolves the draft
// with the same resolveBenefitView the app uses, so the content is exact.
// Save controls follow CR-026 (no button until there are changes, then "Lagret").
// Only the standard variant has UI here; variants and A/B come later.

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import adminStyles from '@/components/admin/AdminTable.module.css'
import { ImageUploadField } from '@/components/admin/ImageUploadField'
import { InlineSaveActions } from '@/components/admin/InlineSaveActions'
import { ViewPreview } from '@/components/admin/ViewPreview'
import styles from '@/components/admin/BenefitSections.module.css'
import {
  EMPTY_OVERRIDES,
  VIEW_OVERRIDE_LIMITS,
  fieldsFromRow,
  hasOverrides,
  toOverrideBody,
  type ViewOverrideFields,
} from '@/lib/admin/viewOverrides'
import { useDirtyTracking } from '@/lib/admin/useDirtyTracking'
import { resolveBenefitView, type BenefitCoreContent, type ViewFormat } from '@/lib/views'

type Row = {
  format: string
  title: string | null
  text: string | null
  imageUrl: string | null
  imageAlt: string | null
  badgeText: string | null
}

type Props = { benefitId: string; core: BenefitCoreContent; rows: Row[] }

const FORMATS: { format: ViewFormat; label: string; help: string }[] = [
  { format: 'app_card', label: 'App-kort', help: 'Kortet i appens lister, «I nærheten» og «Lagret».' },
  { format: 'web_card', label: 'Web-kort', help: 'Kortet i web-løpet (/flytting).' },
]

async function readMessage(res: Response): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as { message?: string }
  return data.message ?? 'Noe gikk galt'
}

function ViewGroup({
  benefitId,
  format,
  label,
  help,
  core,
  initial,
}: {
  benefitId: string
  format: ViewFormat
  label: string
  help: string
  core: BenefitCoreContent
  initial: ViewOverrideFields
}) {
  const router = useRouter()
  const [fields, setFields] = useState<ViewOverrideFields>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { isDirty, showSaved, markSaved } = useDirtyTracking(fields)

  const idp = `view-${format}`

  // Exactly what the app would show with this draft.
  const preview = useMemo(
    () => resolveBenefitView(core, [{ format, variant: 'standard', ...toOverrideBody(fields) }], format),
    [core, format, fields],
  )

  function set<K extends keyof ViewOverrideFields>(key: K, value: string) {
    setFields((f) => ({ ...f, [key]: value }))
  }

  async function saveWith(sent: ViewOverrideFields) {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/benefits/${benefitId}/views/${format}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toOverrideBody(sent)),
      })
      if (res.ok) {
        markSaved(sent)
        router.refresh()
      } else {
        setError(await readMessage(res))
      }
    } catch {
      setError('Nettverksfeil, prøv igjen')
    }
    setSaving(false)
  }

  async function reset() {
    setFields(EMPTY_OVERRIDES)
    await saveWith(EMPTY_OVERRIDES)
  }

  return (
    <div className={styles.group}>
      <h3 className={styles.groupTitle}>{label}</h3>
      <p className={styles.help}>{help}</p>
      <div className={styles.viewGrid}>
        <div className={styles.viewForm}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor={`${idp}-title`}>Tittel</label>
            <input
              id={`${idp}-title`}
              className={adminStyles.input}
              value={fields.title}
              maxLength={VIEW_OVERRIDE_LIMITS.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder={`Arves: ${core.title}`}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor={`${idp}-text`}>Tekst</label>
            <textarea
              id={`${idp}-text`}
              className={adminStyles.textarea}
              rows={3}
              value={fields.text}
              maxLength={VIEW_OVERRIDE_LIMITS.text}
              onChange={(e) => set('text', e.target.value)}
              placeholder={`Arves: ${core.shortDescription}`}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor={`${idp}-badge`}>Merketekst</label>
            <input
              id={`${idp}-badge`}
              className={adminStyles.input}
              value={fields.badgeText}
              maxLength={VIEW_OVERRIDE_LIMITS.badgeText}
              onChange={(e) => set('badgeText', e.target.value)}
              placeholder={`Arves: ${core.badgeText ?? '(ingen)'}`}
            />
          </div>
          <ImageUploadField
            label="Bilde"
            value={fields.imageUrl || null}
            onChange={(url) => set('imageUrl', url)}
            altLabel="Bilde-alt"
            altValue={fields.imageAlt}
            onAltChange={(alt) => set('imageAlt', alt)}
          />
          <p className={styles.help}>
            Tomt bilde arver fordelens bilde. Et eget bilde bruker sin egen alt-tekst, aldri
            fordelens.
          </p>
          <div className={styles.actions}>
            <InlineSaveActions
              isDirty={isDirty}
              saving={saving}
              saved={showSaved}
              error={error}
              onSave={() => saveWith(fields)}
            />
            {hasOverrides(fields) && (
              <button type="button" className={adminStyles.secondaryBtn} onClick={reset} disabled={saving}>
                Tilbakestill til fordelens innhold
              </button>
            )}
          </div>
        </div>
        <ViewPreview content={preview} label={label} />
      </div>
    </div>
  )
}

export function BenefitViewsSection({ benefitId, core, rows }: Props) {
  return (
    <section className={styles.section} aria-labelledby="views-title">
      <h2 id="views-title" className={styles.title}>Visninger</h2>
      <p className={styles.help}>
        Fordelens eget innhold brukes overalt. Fyll bare inn det som skal være annerledes på en
        flate, og la resten stå tomt så det arves. Hver flate lagres for seg, uavhengig av «Lagre
        endringer» for fordelen over. Plassholderne og forhåndsvisningen bygger på fordelen slik den
        er lagret.
      </p>
      {FORMATS.map((f) => (
        <ViewGroup
          key={f.format}
          benefitId={benefitId}
          format={f.format}
          label={f.label}
          help={f.help}
          core={core}
          initial={fieldsFromRow(rows.find((r) => r.format === f.format))}
        />
      ))}
    </section>
  )
}
