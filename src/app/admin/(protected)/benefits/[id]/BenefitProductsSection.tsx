'use client'
// CR-025: Products on a benefit (the choices on the card in the web flow).
// NOT part of the main benefit form: each product is saved on its own with its own
// button, independent of "Lagre" for the benefit above. Delete is soft (orders refer to
// products, CR-024).

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminProductRow } from '@/types/admin'
import adminStyles from '@/components/admin/AdminTable.module.css'
import styles from '@/components/admin/BenefitSections.module.css'

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
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const dirty =
    name !== product.name ||
    text !== (product.text ?? '') ||
    priceText !== (product.priceText ?? '') ||
    sortOrder !== product.sortOrder ||
    isActive !== product.isActive

  const base = `/api/admin/benefits/${benefitId}/products/${product.id}`
  const idp = `product-${product.id}`

  async function save() {
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch(base, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, text: text || null, priceText: priceText || null, sortOrder, isActive }),
      })
      if (res.ok) {
        setMessage({ kind: 'ok', text: 'Lagret' })
        router.refresh()
      } else {
        setMessage({ kind: 'error', text: await readMessage(res) })
      }
    } catch {
      setMessage({ kind: 'error', text: 'Nettverksfeil, prøv igjen' })
    }
    setBusy(false)
  }

  async function remove() {
    if (!confirm(`Slette «${product.name}»? Tidligere bestillinger beholder navnet.`)) return
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch(base, { method: 'DELETE' })
      if (res.ok) {
        router.refresh()
        return
      }
      setMessage({ kind: 'error', text: await readMessage(res) })
    } catch {
      setMessage({ kind: 'error', text: 'Nettverksfeil, prøv igjen' })
    }
    setBusy(false)
  }

  return (
    <li className={`${styles.row} ${product.isActive ? '' : styles.rowInactive}`}>
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
        <button type="button" className={adminStyles.primaryBtn} onClick={save} disabled={busy || !dirty || name.trim() === ''}>
          {busy ? '…' : 'Lagre'}
        </button>
        <button type="button" className={adminStyles.dangerBtn} onClick={remove} disabled={busy}>
          Slett
        </button>
        {dirty && !message && <span className={styles.statusDirty}>Ulagret</span>}
        {message && (
          <span role={message.kind === 'error' ? 'alert' : 'status'} className={message.kind === 'error' ? styles.statusError : styles.status}>
            {message.text}
          </span>
        )}
      </div>
    </li>
  )
}

function NewProductForm({ benefitId, nextSortOrder }: { benefitId: string; nextSortOrder: number }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [priceText, setPriceText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function add(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
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
    <form onSubmit={add} className={styles.group} aria-label="Legg til produkt">
      <h3 className={styles.groupTitle}>Legg til produkt</h3>
      <div className={styles.inline}>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="new-product-name">Navn *</label>
          <input id="new-product-name" className={adminStyles.input} value={name} maxLength={120} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="new-product-text">Tekst</label>
          <input id="new-product-text" className={adminStyles.input} value={text} maxLength={500} onChange={(e) => setText(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="new-product-price">Pris (tekst)</label>
          <input id="new-product-price" className={adminStyles.input} value={priceText} maxLength={80} onChange={(e) => setPriceText(e.target.value)} placeholder="f.eks. 149 kr/mnd" />
        </div>
        <button type="submit" className={adminStyles.primaryBtn} disabled={busy || name.trim() === ''}>
          {busy ? '…' : 'Legg til'}
        </button>
      </div>
      {error && <p role="alert" className={styles.statusError}>{error}</p>}
    </form>
  )
}

export function BenefitProductsSection({ benefitId, products }: Props) {
  const nextSortOrder = products.reduce((max, p) => Math.max(max, p.sortOrder), 0) + 1

  return (
    <section className={styles.section} aria-labelledby="products-title">
      <h2 id="products-title" className={styles.title}>Produkter</h2>
      <p className={styles.help}>
        Valgene på fordelskortet i web-løpet. Hvert produkt lagres for seg med egen knapp, uavhengig
        av «Lagre» for fordelen over. En fordel uten aktive produkter vises som ren informasjon.
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
