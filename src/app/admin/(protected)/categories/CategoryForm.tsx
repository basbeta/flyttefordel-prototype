'use client'
// CR-007: Shared create/edit form for categories.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from '@/components/admin/AdminTable.module.css'

type CategoryData = {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  sortOrder: number
  isActive: boolean
}

type Props = { category?: CategoryData }

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function CategoryForm({ category }: Props) {
  const router = useRouter()
  const isEdit = !!category

  const [name, setName] = useState(category?.name ?? '')
  const [slug, setSlug] = useState(category?.slug ?? '')
  const [description, setDescription] = useState(category?.description ?? '')
  const [icon, setIcon] = useState(category?.icon ?? '')
  const [sortOrder, setSortOrder] = useState(category?.sortOrder ?? 0)
  const [isActive, setIsActive] = useState(category?.isActive ?? true)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleNameChange(val: string) {
    setName(val)
    if (!isEdit) setSlug(slugify(val))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const payload = {
      name,
      slug,
      description: description || null,
      icon: icon || null,
      sortOrder,
      isActive,
    }

    try {
      const res = await fetch(
        isEdit ? `/api/admin/categories/${category.id}` : '/api/admin/categories',
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )

      if (res.ok) {
        router.push('/admin/categories')
        router.refresh()
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
          <input
            className={styles.input}
            required
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Slug *</label>
          <input
            className={styles.input}
            required
            pattern="[a-z0-9-]+"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
          <p className={styles.hint}>Kun a-z, 0-9 og bindestrek. Genereres automatisk fra navn.</p>
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.field}>
          <label className={styles.label}>Ikon</label>
          <input
            className={styles.input}
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="f.eks. 🏠 eller icon-home"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Sorteringsrekkefølge</label>
          <input
            className={styles.input}
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
          />
          <p className={styles.hint}>Lavere tall vises først</p>
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Beskrivelse</label>
        <textarea
          className={styles.textarea}
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Valgfri intern beskrivelse"
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Status</label>
        <select
          className={styles.select}
          value={isActive ? 'active' : 'inactive'}
          onChange={(e) => setIsActive(e.target.value === 'active')}
        >
          <option value="active">Aktiv</option>
          <option value="inactive">Inaktiv</option>
        </select>
      </div>

      {error && <p style={{ color: 'var(--color-error)', fontSize: 'var(--font-sm)' }}>{error}</p>}

      <div className={styles.formActions}>
        <button type="submit" className={styles.primaryBtn} disabled={saving}>
          {saving ? 'Lagrer…' : isEdit ? 'Lagre endringer' : 'Opprett kategori'}
        </button>
      </div>
    </form>
  )
}
