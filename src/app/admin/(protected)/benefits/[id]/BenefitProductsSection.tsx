'use client'
// CR-025: Products on a benefit (the choices on the card in the web flow).
// CR-026: save controls follow the shared rule: no button until there are changes, then
// "Lagre", then "Lagret" (InlineSaveActions + useDirtyTracking).
// NOT part of the main benefit form: each product is saved on its own, independent of
// "Lagre endringer" for the benefit above. Delete is soft (orders refer to products, CR-024).

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminProductRow } from '@/types/admin'
import adminStyles from '@/components/admin/AdminTable.module.css'
import { InlineSaveActions } from '@/components/admin/InlineSaveActions'
import styles from '@/components/admin/BenefitSections.module.css'
import { useDirtyTracking } from '@/lib/admin/useDirtyTracking'
import { useUnsavedChangesWarning } from '@/lib/admin/useUnsavedChangesWarning'

type Props = { benefitId: string; products: AdminProductRow[] }

async function readMessage(res: Response): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as { message?: string }
  return data.message ?? 'Noe gikk galt'
}

function ProductRow({ benefitId, product }: { benefitId: string; product: AdminProductRow }) {
  const router = useRouter()
  const [name, setName] = useState(product.name)
  const [text, setText] = useState(product.text ?? '')
  const [priceText, setPriceText] = useState(product.priceText ?? '')
  const [sortOrder, setSortOrder] = useState(product.sortOrder)
  const [isActive, setIsActive] = useState(product.isActive)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const payload = useMemo(
    () => ({ name, text, priceText, sortOrder, isActive }),
    [name, text, priceText, sortOrder, isActive],
  )
  const { isDirty, showSaved, markSaved } = useDirtyTracking(payload)

  const base = `/api/admin/benefits/${benefitId}/products/${product.id}`
  const idp = `product-${product.id}`

  async function save() {
    const sent = payload // what is actually sent, not whatever the row holds when the reply arrives
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(base, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sent.name,
          text: sent.text || null,
          priceText: sent.priceText || null,
          sortOrder: sent.sortOrder,
          isActive: sent.isActive,
        }),
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

  async function remove() {
    if (!confirm(`Slette «${product.name}»? Tidligere bestillinger beholder navnet.`)) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(base, { method: 'DELETE' })
      if (res.ok) {
        router.refresh()
        return
      }
      setDeleteError(await readMessage(res))
    } catch {
      setDeleteError('Nettverksfeil, prøv igjen')
    }
    setDeleting(false)
  }

  return (
    <li className={`${styles.row} ${isActive ? '' : styles.rowInactive}`}>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor={`${idp}-name`}>Navn *</label>
        <input id={`${idp}-name`} className={adminStyles.input} value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor={`${idp}-text`}>Tekst</label>
        <input id={`${idp}-text`} className={adminStyles.input} value={text} maxLength={500} onChange={(e) => setText(e.target.value)} />
      </div>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor={`${idp}-price`}>Pris (tekst)</label>
        <input id={`${idp}-price`} className={adminStyles.input} value={priceText} maxLength={80} onChange={(e) => setPriceText(e.target.value)} placeholder="f.eks. 149 kr/mnd" />
      </div>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor={`${idp}-sort`}>Rekkefølge</label>
        <input id={`${idp}-sort`} className={adminStyles.input} type="number" step={1} value={sortOrder} onChange={(e) => setSortOrder(Math.trunc(Number(e.target.value)))} />
      </div>
      <div className={styles.actions}>
        <label className={styles.check}>
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Aktiv
        </label>
        <InlineSaveActions
          isDirty={isDirty}
          saving={saving}
          saved={showSaved}
          error={error}
          onSave={save}
          disabled={name.trim() === ''}
        />
        <button type="button" className={adminStyles.dangerBtn} onClick={remove} disabled={deleting || saving}>
          {deleting ? '…' : 'Slett'}
        </button>
        {deleteError && <span role="alert" className={styles.statusError}>{deleteError}</span>}
      </div>
    </li>
  )
}

function NewProductForm({ benefitId, nextSortOrder }: { benefitId: string; nextSortOrder: number }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [priceText, setPriceText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justAdded, setJustAdded] = useState(false)

  // The button first appears when a name is filled in. Anything typed and not yet added
  // warns before the page is left, like unsaved changes elsewhere.
  const canAdd = name.trim() !== ''
  useUnsavedChangesWarning(name !== '' || text !== '' || priceText !== '')

  function edit(setter: (v: string) => void) {
    return (value: string) => {
      setJustAdded(false)
      setter(value)
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!canAdd || saving) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/benefits/${benefitId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, text: text || null, priceText: priceText || null, sortOrder: nextSortOrder }),
      })
      if (res.ok) {
        setName('')
        setText('')
        setPriceText('')
        setJustAdded(true)
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
    <form onSubmit={add} className={styles.group} aria-label="Legg til produkt">
      <h3 className={styles.groupTitle}>Legg til produkt</h3>
      <div className={styles.inline}>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="new-product-name">Navn *</label>
          <input id="new-product-name" className={adminStyles.input} value={name} maxLength={120} onChange={(e) => edit(setName)(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="new-product-text">Tekst</label>
          <input id="new-product-text" className={adminStyles.input} value={text} maxLength={500} onChange={(e) => edit(setText)(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="new-product-price">Pris (tekst)</label>
          <input id="new-product-price" className={adminStyles.input} value={priceText} maxLength={80} onChange={(e) => edit(setPriceText)(e.target.value)} placeholder="f.eks. 149 kr/mnd" />
        </div>
        <InlineSaveActions
          type="submit"
          label="Legg til"
          savedLabel="Lagt til"
          isDirty={canAdd}
          saving={saving}
          saved={justAdded}
          error={error}
        />
      </div>
    </form>
  )
}

export function BenefitProductsSection({ benefitId, products }: Props) {
  const nextSortOrder = products.reduce((max, p) => Math.max(max, p.sortOrder), 0) + 1

  return (
    <section className={styles.section} aria-labelledby="products-title">
      <h2 id="products-title" className={styles.title}>Produkter</h2>
      <p className={styles.help}>
        Valgene på fordelskortet i web-løpet. Hvert produkt lagres for seg, uavhengig av «Lagre
        endringer» for fordelen over. En fordel uten aktive produkter vises som ren informasjon.
      </p>
      {products.length === 0 ? (
        <p className={styles.empty}>Ingen produkter ennå.</p>
      ) : (
        <ul className={styles.list}>
          {products.map((p) => (
            <ProductRow key={p.id} benefitId={benefitId} product={p} />
          ))}
        </ul>
      )}
      <NewProductForm benefitId={benefitId} nextSortOrder={nextSortOrder} />
    </section>
  )
}
