'use client'

// CR-024: Confirmation after a successful order. It is a transition, not a dead end:
// "Last ned appen her" opens the web app (docs/10 section 7.1 and decision 11).
// Shows what was ordered from the browser-only "last order" (no personal data).
// No confirmation e-mail is sent (not built), and the page says so.

import Link from 'next/link'
import { useMemo, useSyncExternalStore } from 'react'
import { lastOrderStore, parseLastOrder } from '@/lib/flow'
import styles from './FlowConfirmation.module.css'

export function FlowConfirmation() {
  const raw = useSyncExternalStore(
    lastOrderStore.subscribe,
    lastOrderStore.getSnapshot,
    lastOrderStore.getServerSnapshot
  )
  const order = useMemo(() => parseLastOrder(raw), [raw])

  if (!order) {
    return (
      <div className={styles.wrapper}>
        <h1 className={styles.title}>Ingen bestilling å vise</h1>
        <p className={styles.text}>
          Vi finner ingen nylig bestilling i denne nettleseren. Har du allerede bestilt, er den
          registrert.
        </p>
        <Link href="/flytting" className={styles.secondary}>
          Til flyttefordel
        </Link>
      </div>
    )
  }

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>Takk, bestillingen er registrert</h1>
      <p className={styles.text} role="status">
        Kundene du har valgt tar kontakt med deg. Vi har ikke sendt noen bekreftelse på e-post
        ennå.
      </p>

      <section aria-labelledby="ordered-title" className={styles.section}>
        <h2 id="ordered-title" className={styles.sectionTitle}>
          Du har bestilt
        </h2>
        <ul className={styles.list}>
          {order.items.map((item) => (
            <li key={`${item.title}-${item.productName}`} className={styles.item}>
              <span className={styles.itemTitle}>{item.title}</span>
              <span className={styles.itemMeta}>
                {item.advertiserName} · {item.productName}
                {item.priceText ? ` · ${item.priceText}` : ''}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="app-title" className={styles.appBox}>
        <h2 id="app-title" className={styles.sectionTitle}>
          Flere fordeler i appen
        </h2>
        <p className={styles.text}>Fortsett å få fordeler tilpasset deg, også etter flyttingen.</p>
        <Link href="/" className={styles.primary}>
          Last ned appen her
        </Link>
      </section>
    </div>
  )
}
