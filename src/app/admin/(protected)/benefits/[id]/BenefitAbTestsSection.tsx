'use client'
// CR-030: A/B tests of a benefit ("A/B-test"). This is the shell for the `content` test kind: two
// views of the same format on this benefit. The admin API under /api/admin/ab-tests is generic,
// so other test kinds get their own shell later without any change to the API.
// Flow: create (draft) -> fill in the content of variant B -> start -> end. Variants and weights
// are locked while the test runs. Variant `standard` is always the control group.
// Save controls follow CR-026.

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import adminStyles from '@/components/admin/AdminTable.module.css'
import { ImageUploadField } from '@/components/admin/ImageUploadField'
import { InlineSaveActions } from '@/components/admin/InlineSaveActions'
import { ViewPreview } from '@/components/admin/ViewPreview'
import styles from '@/components/admin/BenefitSections.module.css'
import {
  VIEW_OVERRIDE_LIMITS,
  fieldsFromRow,
  toOverrideBody,
  type ViewOverrideFields,
} from '@/lib/admin/viewOverrides'
import { useDirtyTracking } from '@/lib/admin/useDirtyTracking'
import { resolveBenefitView, type BenefitCoreContent, type ViewFormat } from '@/lib/views'

type TestRow = {
  id: string
  name: string
  status: string
  format: string
  variants: { key: string; weight: number }[]
  primaryGoal: string | null
}

type VariantViewRow = {
  format: string
  variant: string
  title: string | null
  text: string | null
  imageUrl: string | null
  imageAlt: string | null
  badgeText: string | null
}

type Props = {
  benefitId: string
  core: BenefitCoreContent
  tests: TestRow[]
  variantViews: VariantViewRow[]
}

const FORMATS: { format: ViewFormat; label: string }[] = [
  { format: 'app_card', label: 'App-kort' },
  { format: 'web_card', label: 'Web-kort' },
]

const STATUS_LABEL: Record<string, string> = { draft: 'Kladd', running: 'Kjører', ended: 'Avsluttet' }

async function readMessage(res: Response): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as { message?: string }
  return data.message ?? 'Noe gikk galt'
}

function formatLabel(format: string): string {
  return FORMATS.find((f) => f.format === format)?.label ?? format
}

function share(variants: { key: string; weight: number }[], key: string): number {
  const total = variants.reduce((sum, v) => sum + v.weight, 0)
  const weight = variants.find((v) => v.key === key)?.weight ?? 0
  return total > 0 ? Math.round((weight / total) * 100) : 0
}

// Content of one non-standard variant, saved to the views route with `variant` in the body.
function VariantEditor({
  benefitId,
  format,
  variant,
  core,
  initial,
  editable,
}: {
  benefitId: string
  format: ViewFormat
  variant: string
  core: BenefitCoreContent
  initial: ViewOverrideFields
  editable: boolean
}) {
  const router = useRouter()
  const [fields, setFields] = useState<ViewOverrideFields>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { isDirty, showSaved, markSaved } = useDirtyTracking(fields)
  const idp = `ab-${format}-${variant}`

  const preview = useMemo(
    () => resolveBenefitView(core, [{ format, variant, ...toOverrideBody(fields) }], format, variant),
    [core, format, variant, fields],
  )

  function set<K extends keyof ViewOverrideFields>(key: K, value: string) {
    setFields((f) => ({ ...f, [key]: value }))
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/benefits/${benefitId}/views/${format}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...toOverrideBody(fields), variant }),
      })
      if (res.ok) {
        markSaved(fields)
        router.refresh()
      } else {
        setError(await readMessage(res))
      }
    } catch {
      setError('Nettverksfeil, prøv igjen')
    }
    setSaving(false)
  }

  return (
    <div className={styles.viewGrid}>
      <div className={styles.viewForm}>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor={`${idp}-title`}>Tittel</label>
          <input
            id={`${idp}-title`}
            className={adminStyles.input}
            value={fields.title}
            disabled={!editable}
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
            disabled={!editable}
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
            disabled={!editable}
            maxLength={VIEW_OVERRIDE_LIMITS.badgeText}
            onChange={(e) => set('badgeText', e.target.value)}
            placeholder={`Arves: ${core.badgeText ?? '(ingen)'}`}
          />
        </div>
        {editable && (
          <ImageUploadField
            label="Bilde"
            value={fields.imageUrl || null}
            onChange={(url) => set('imageUrl', url)}
            altLabel="Bilde-alt"
            altValue={fields.imageAlt}
            onAltChange={(alt) => set('imageAlt', alt)}
          />
        )}
        {editable && (
          <div className={styles.actions}>
            <InlineSaveActions isDirty={isDirty} saving={saving} saved={showSaved} error={error} onSave={save} />
          </div>
        )}
      </div>
      <ViewPreview content={preview} label={`Variant ${variant}`} />
    </div>
  )
}

function TestCard({
  benefitId,
  core,
  test,
  variantViews,
}: {
  benefitId: string
  core: BenefitCoreContent
  test: TestRow
  variantViews: VariantViewRow[]
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const format = test.format as ViewFormat
  const others = test.variants.filter((v) => v.key !== 'standard')

  async function setStatus(status: 'running' | 'ended') {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/ab-tests/${test.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) router.refresh()
      else setError(await readMessage(res))
    } catch {
      setError('Nettverksfeil, prøv igjen')
    }
    setBusy(false)
  }

  return (
    <div className={styles.group}>
      <h3 className={styles.groupTitle}>
        {test.name} <span>({STATUS_LABEL[test.status] ?? test.status}, {formatLabel(test.format)})</span>
      </h3>
      <p className={styles.help}>
        Fordeling: {test.variants.map((v) => `${v.key} ${share(test.variants, v.key)} %`).join(', ')}.
        {test.primaryGoal ? ` Hovedmål: ${test.primaryGoal}.` : ''} Samme person får alltid samme variant.
        {test.status === 'running' && ' Varianter og fordeling er låst mens testen kjører.'}
      </p>
      {others.map((v) => (
        <div key={v.key}>
          <h4 className={styles.fieldLabel}>Innhold i variant «{v.key}»</h4>
          <VariantEditor
            benefitId={benefitId}
            format={format}
            variant={v.key}
            core={core}
            initial={fieldsFromRow(variantViews.find((r) => r.format === test.format && r.variant === v.key))}
            editable={test.status !== 'ended'}
          />
        </div>
      ))}
      <div className={styles.actions}>
        {test.status === 'draft' && (
          <button type="button" className={adminStyles.primaryBtn} disabled={busy} onClick={() => setStatus('running')}>
            Start test
          </button>
        )}
        {test.status === 'running' && (
          <button type="button" className={adminStyles.secondaryBtn} disabled={busy} onClick={() => setStatus('ended')}>
            Avslutt test
          </button>
        )}
        {error && <span role="alert">{error}</span>}
      </div>
    </div>
  )
}

function CreateTest({ benefitId }: { benefitId: string }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [format, setFormat] = useState<ViewFormat>('app_card')
  const [variantKey, setVariantKey] = useState('b')
  const [percentB, setPercentB] = useState(50)
  const [goal, setGoal] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function create() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/ab-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          kind: 'content',
          scope: { benefitId, format },
          variants: [
            { key: 'standard', weight: 100 - percentB },
            { key: variantKey.trim(), weight: percentB },
          ],
          primaryGoal: goal.trim() || null,
        }),
      })
      if (res.ok) {
        setName('')
        setGoal('')
        router.refresh()
      } else {
        setError(await readMessage(res))
      }
    } catch {
      setError('Nettverksfeil, prøv igjen')
    }
    setBusy(false)
  }

  return (
    <div className={styles.group}>
      <h3 className={styles.groupTitle}>Ny test</h3>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="ab-name">Navn</label>
        <input id="ab-name" className={adminStyles.input} value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="ab-format">Flate</label>
        <select id="ab-format" className={adminStyles.select} value={format} onChange={(e) => setFormat(e.target.value as ViewFormat)}>
          {FORMATS.map((f) => (
            <option key={f.format} value={f.format}>{f.label}</option>
          ))}
        </select>
      </div>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="ab-variant">Nøkkel for variant B</label>
        <input id="ab-variant" className={adminStyles.input} value={variantKey} maxLength={40} onChange={(e) => setVariantKey(e.target.value)} />
      </div>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="ab-percent">Andel som får variant B (%)</label>
        <input
          id="ab-percent"
          className={adminStyles.input}
          type="number"
          min={1}
          max={99}
          value={percentB}
          onChange={(e) => setPercentB(Math.min(99, Math.max(1, Number(e.target.value) || 1)))}
        />
      </div>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="ab-goal">Hovedmål (valgfritt)</label>
        <input id="ab-goal" className={adminStyles.input} value={goal} maxLength={60} onChange={(e) => setGoal(e.target.value)} placeholder="f.eks. innløst" />
      </div>
      <div className={styles.actions}>
        <button type="button" className={adminStyles.primaryBtn} disabled={busy || name.trim() === ''} onClick={create}>
          Opprett test
        </button>
        {error && <span role="alert">{error}</span>}
      </div>
    </div>
  )
}

export function BenefitAbTestsSection({ benefitId, core, tests, variantViews }: Props) {
  return (
    <section className={styles.section} aria-labelledby="ab-title">
      <h2 id="ab-title" className={styles.title}>A/B-test</h2>
      <p className={styles.help}>
        Test to utgaver av kortet mot hverandre. Variant «standard» er alltid kontrollgruppen og viser
        innholdet fra «Visninger». Tildelingen regnes fra person-ID og lagres ikke. Det kan bare
        kjøre én test om gangen per flate, og en avsluttet test kan ikke startes på nytt.
      </p>
      {tests.map((t) => (
        <TestCard key={t.id} benefitId={benefitId} core={core} test={t} variantViews={variantViews} />
      ))}
      <CreateTest benefitId={benefitId} />
    </section>
  )
}
