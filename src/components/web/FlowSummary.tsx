'use client'

// CR-023: Summary of the choices made in the flow.
// CR-024: followed by the order form (contact details, consents, "Send inn").
// Selection is cleaned against the current flow before it is shown.

import Link from 'next/link'
import { useMemo } from 'react'
import { Button } from '@/components/shared/Button'
import { buildSummary, type SummaryItem } from '@/lib/flow'
import type { WebFlowPage } from '@/types/app'
import { OrderForm } from './OrderForm'
import { useFlowSelection } from './useFlowSelection'
import styles from './FlowSummary.module.css'

type Props = {
  pages: WebFlowPage[]
  firstPageId: string
  defaultPostcode: string | null
  defaultName?: string | null
  defaultEmail?: string | null
}

type Group = { pageId: string; pageName: string; items: SummaryItem[] }

export function FlowSummary({ pages, firstPageId, defaultPostcode, defaultName, defaultEmail }: Props) {
  const { selection, toggle } = useFlowSelection()
  // buildSummary sanitizes the selection against the flow, so stale choices never show.
  const items = useMemo(() => buildSummary(selection, pages), [selection, pages])

  const groups = useMemo(() => {
    const map = new Map<string, Group>()
    for (const item of items) {
      const group = map.get(item.pageId) ?? { pageId: item.pageId, pageName: item.pageName, items: [] }
      group.items.push(item)
      map.set(item.pageId, group)
    }
    return [...map.values()]
  }, [items])

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>Oppsummering</h1>

      {items.length === 0 ? (
        <div className={styles.empty} role="status">
          <p>Du har ikke valgt noen fordeler ennå.</p>
          <Link href={`/flytting/${firstPageId}`} className={styles.link}>
            Gå til løpet
          </Link>
        </div>
      ) : (
        <>
          <p className={styles.count} role="status">
            Du har valgt {items.length} {items.length === 1 ? 'fordel' : 'fordeler'}.
          </p>
          {groups.map((group) => (
            <section key={group.pageId} className={styles.group}>
              <h2 className={styles.groupTitle}>{group.pageName}</h2>
              <ul className={styles.list}>
                {group.items.map((item) => (
                  <li key={item.benefitId} className={styles.item}>
                    <div className={styles.itemInfo}>
                      <span className={styles.itemTitle}>{item.title}</span>
                      <span className={styles.itemMeta}>
                        {item.advertiserName} · {item.productName}
                        {item.priceText ? ` · ${item.priceText}` : ''}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      aria-label={`Fjern ${item.title} fra valgene`}
                      onClick={() => toggle(item.benefitId, item.productId)}
                    >
                      Fjern
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <OrderForm
            items={items}
            defaultPostcode={defaultPostcode}
            defaultName={defaultName}
            defaultEmail={defaultEmail}
          />

          <Link href={`/flytting/${firstPageId}`} className={styles.secondaryLink}>
            Tilbake til løpet
          </Link>
        </>
      )}

      <p className={styles.notice} role="note">
        Valgene sendes først når du trykker «Send inn». Frem til da huskes de bare i denne
        nettleseren.
      </p>
    </div>
  )
}
