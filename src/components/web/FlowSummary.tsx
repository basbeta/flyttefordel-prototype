'use client'

// CR-023: Read-only summary of the choices made in the flow. Nothing is submitted
// (CR-024). Selection is cleaned against the current flow before it is shown.

import Link from 'next/link'
import { useMemo } from 'react'
import { Button } from '@/components/shared/Button'
import { buildSummary, type SummaryItem } from '@/lib/flow'
import type { WebFlowPage } from '@/types/app'
import { useFlowSelection } from './useFlowSelection'
import styles from './FlowSummary.module.css'

type Props = { pages: WebFlowPage[]; firstPageId: string }

type Group = { pageId: string; pageName: string; items: SummaryItem[] }

export function FlowSummary({ pages, firstPageId }: Props) {
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
        </>
      )}

      <p className={styles.notice} role="note">
        Innsending er ikke bygget ennå. Valgene dine huskes bare i denne nettleseren og er ikke
        sendt noe sted.
      </p>

      {items.length > 0 && (
        <Link href={`/flytting/${firstPageId}`} className={styles.link}>
          Tilbake til løpet
        </Link>
      )}
    </div>
  )
}
