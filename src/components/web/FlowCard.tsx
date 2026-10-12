'use client'

// CR-023: A benefit card in the web flow. One button per product: press to choose,
// press again to undo, press another product on the same card to switch.
// A benefit without products is shown as information only.

import { Button } from '@/components/shared/Button'
import type { WebFlowCard } from '@/types/app'
import { useFlowSelection } from './useFlowSelection'
import styles from './FlowCard.module.css'

type Props = { card: WebFlowCard }

export function FlowCard({ card }: Props) {
  const { selection, toggle } = useFlowSelection()
  const chosenId = selection[card.benefitId]
  const titleId = `flow-card-${card.benefitId}`
  const single = card.products.length === 1

  return (
    <article className={styles.card} aria-labelledby={titleId}>
      <div className={styles.imageWrapper}>
        {card.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- plain <img> is the project standard (see BenefitCard)
          <img src={card.imageUrl} alt={card.imageAlt ?? ''} className={styles.image} />
        ) : (
          <div className={styles.imageFallback} aria-hidden="true" />
        )}
        {card.badgeText && <span className={styles.badge}>{card.badgeText}</span>}
      </div>

      <div className={styles.body}>
        <p className={styles.advertiser}>
          {card.advertiser.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- see above
            <img src={card.advertiser.logoUrl} alt="" className={styles.logo} />
          )}
          <span>{card.advertiser.name}</span>
        </p>
        <h2 id={titleId} className={styles.title}>
          {card.title}
        </h2>
        <p className={styles.text}>{card.text}</p>

        {card.products.length > 0 ? (
          <ul className={styles.products} aria-label={`Valg for ${card.title}`}>
            {card.products.map((p) => {
              const chosen = chosenId === p.id
              return (
                <li key={p.id} className={chosen ? styles.productChosen : styles.product}>
                  <div className={styles.productInfo}>
                    <span className={styles.productName}>{p.name}</span>
                    {p.text && <span className={styles.productText}>{p.text}</span>}
                    {p.priceText && <span className={styles.productPrice}>{p.priceText}</span>}
                  </div>
                  <Button
                    variant={chosen ? 'primary' : 'secondary'}
                    aria-pressed={chosen}
                    aria-label={`${single ? 'Ja takk til' : 'Velg'} ${p.name} fra ${card.title}`}
                    onClick={() => toggle(card.benefitId, p.id)}
                  >
                    {/* Visible text stays constant (matches the accessible name); the check mark
                        is a visual extra, the state itself is conveyed by aria-pressed. */}
                    {chosen && <span aria-hidden="true">✓</span>}
                    {single ? 'Ja takk' : 'Velg'}
                  </Button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className={styles.infoOnly}>Kun informasjon, ingenting å velge.</p>
        )}

        {card.termsText && (
          <details className={styles.terms}>
            <summary>Vilkår</summary>
            <p>{card.termsText}</p>
          </details>
        )}
      </div>
    </article>
  )
}
