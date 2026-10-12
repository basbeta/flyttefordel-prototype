'use client'
// CR-025: Create/edit form for a page in the web flow. Same pattern as CategoryForm
// (dirty tracking and the floating save bar, CR-013 and CR-019).

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from '@/components/admin/AdminTable.module.css'
import { FormSaveBar } from '@/components/admin/FormSaveBar'
import { ImageUploadField } from '@/components/admin/ImageUploadField'
import { useDirtyTracking } from '@/lib/admin/useDirtyTracking'

type PageData = {
  id: string
  name: string
  text: string | null
  imageUrl: string | null
  imageAlt: string | null
  sortOrder: number
  isActive: boolean
}

type Props = { page?: PageData }

export function FlowPageForm({ page }: Props) {
  const router = useRouter()
  const isEdit = !!page

  const [name, setName] = useState(page?.name ?? '')
  const [text, setText] = useState(page?.text ?? '')
  const [imageUrl, setImageUrl] = useState(page?.imageUrl ?? '')
  const [imageAlt, setImageAlt] = useState(page?.imageAlt ?? '')
  const [sortOrder, setSortOrder] = useState(page?.sortOrder ?? 0)
  const [isActive, setIsActive] = useState(page?.isActive ?? true)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const payload = useMemo(
    () => ({
      name,
      text: text || null,
      imageUrl: imageUrl || null,
      imageAlt: imageAlt || null,
      sortOrder,
      isActive,
    }),
    [name, text, imageUrl, imageAlt, sortOrder, isActive],
  )
  const { isDirty, showSaved, markSaved } = useDirtyTracking(payload)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(isEdit ? `/api/admin/flow-pages/${page.id}` : '/api/admin/flow-pages', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        markSaved(payload, isEdit)
        setSaving(false)
        if (isEdit) {
          router.refresh()
        } else {
          const data = (await res.json()) as { id: string }
          router.push(`/admin/flow-pages/${data.id}`)
        }
      } else {
        const data = (await res.json()) as { message?: string }
        setError(data.message ?? 'Noe gikk galt')
        setSaving(false)
      }
    } catch {
      setError('Nettverksfeil, prøv igjen')
      setSaving(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.formRow}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="flowpage-name">Navn *</label>
          <input
            id="flowpage-name"
            className={styles.input}
            required
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <p className={styles.hint}>Vises som sidetittel i web-løpet, og i «Neste: …».</p>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="flowpage-sort">Rekkefølge</label>
          <input
            id="flowpage-sort"
            className={styles.input}
            type="number"
            step={1}
            value={sortOrder}
            onChange={(e) => setSortOrder(Math.trunc(Number(e.target.value)))}
          />
          <p className={styles.hint}>Lavere tall vises først i løpet.</p>
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="flowpage-text">Tekst</label>
        <textarea
          id="flowpage-text"
          className={styles.textarea}
          rows={3}
          maxLength={1000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Valgfri innledning under sidetittelen"
        />
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

      <div className={styles.field}>
        <label className={styles.label} htmlFor="flowpage-status">Status</label>
        <select
          id="flowpage-status"
          className={styles.select}
          value={isActive ? 'active' : 'inactive'}
          onChange={(e) => setIsActive(e.target.value === 'active')}
        >
          <option value="active">Aktiv</option>
          <option value="inactive">Inaktiv (utelates fra løpet)</option>
        </select>
      </div>

      <FormSaveBar
        label={isEdit ? 'Lagre endringer' : 'Opprett side'}
        saving={saving}
        isDirty={isDirty}
        saved={showSaved}
        error={error}
      />
    </form>
  )
}
