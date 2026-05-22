// CR-002: Benefit card — used in list and grid views.

import Link from 'next/link'
import type { BenefitCard as BenefitCardData } from '@/types/app'
import type { BenefitRedemptionType } from '@prisma/client'
import styles from './BenefitCard.module.css'

type Props = { benefit: BenefitCardData }

export function BenefitCard({ benefit }: Props) {
  return (
    <Link href={`/benefits/${benefit.slug}`} className={styles.card}>
      <div className={styles.imageWrapper}>
        {benefit.imageUrl ? (
          <img
            src={benefit.imageUrl}
            alt={benefit.imageAlt ?? benefit.title}
            className={styles.image}
          />
        ) : (
          <div className={styles.imageFallback} />
        )}
        {benefit.badgeText && <span className={styles.badge}>{benefit.badgeText}</span>}
      </div>
      <div className={styles.body}>
        <div className={styles.meta}>
          <span className={styles.category}>{benefit.category.name}</span>
          {benefit.isTimeLimited && <span className={styles.timeLimited}>Tidsbegrenset</span>}
        </div>
        <h3 className={styles.title}>{benefit.title}</h3>
        <p className={styles.desc}>{benefit.shortDescription}</p>
        <div className={styles.footer}>
          <span className={styles.advertiser}>{benefit.advertiser.name}</span>
          <span className={styles.ctaChip}>{ctaLabel(benefit.redemptionType)}</span>
        </div>
      </div>
    </Link>
  )
}

function ctaLabel(type: BenefitRedemptionType): string {
  switch (type) {
    case 'generic_code': return 'Kode'
    case 'unique_code': return 'Unik kode'
    case 'qr_code': return 'QR-kode'
    case 'external_link': return 'Ekstern lenke'
    case 'lead_form': return 'Kontaktskjema'
    case 'info_only': return 'Info'
    case 'mixed': return 'Se mer'
  }
}
