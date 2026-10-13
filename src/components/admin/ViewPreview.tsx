// CR-027: Approximate preview of a benefit card on a surface, for the admin "Visninger" section.
// The CONTENT is exact (the caller resolves it with the same resolveBenefitView the app uses);
// the LOOK is a simplified card with the same tokens, because admin components must not import
// the mobile or web card components (module boundaries, specs/architecture.md).

import type { ViewContent } from '@/lib/views'
import styles from './ViewPreview.module.css'

type Props = {
  content: ViewContent
  // For example "App-kort".
  label: string
}

export function ViewPreview({ content, label }: Props) {
  return (
    <figure className={styles.figure} aria-label={`Forhåndsvisning: ${label}`}>
      <figcaption className={styles.caption}>Omtrentlig forhåndsvisning: {label}</figcaption>
      <div className={styles.card}>
        <div className={styles.imageWrapper}>
          {content.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- plain <img> is the project standard (see BenefitCard)
            <img src={content.imageUrl} alt={content.imageAlt ?? ''} className={styles.image} />
          ) : (
            <div className={styles.imageFallback} aria-hidden="true" />
          )}
          {content.badgeText && <span className={styles.badge}>{content.badgeText}</span>}
        </div>
        <div className={styles.body}>
          <h4 className={styles.title}>{content.title}</h4>
          <p className={styles.text}>{content.text}</p>
        </div>
      </div>
    </figure>
  )
}
