// CR-002: Fordelsdetaljside.

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getBenefitBySlug } from '@/lib/queries/benefitQueries'
import { TopBar } from '@/components/mobile/TopBar'
import { RedemptionSection } from './RedemptionSection'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

type Props = { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const benefit = await getBenefitBySlug(params.slug)
  if (!benefit) return { title: 'Fordel ikke funnet' }
  return { title: benefit.title, description: benefit.shortDescription }
}

export default async function BenefitDetailPage({ params }: Props) {
  const benefit = await getBenefitBySlug(params.slug)
  if (!benefit) notFound()

  return (
    <>
      <TopBar variant="back" backHref="/benefits" />
      <div className={styles.page}>
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
          <div className={styles.metaRow}>
            <span className={styles.category}>{benefit.category.name}</span>
            <span className={styles.advertiser}>{benefit.advertiser.name}</span>
          </div>
          <h1 className={styles.title}>{benefit.title}</h1>
          <p className={styles.shortDesc}>{benefit.shortDescription}</p>

          <RedemptionSection benefit={benefit} />

          <div className={styles.divider} />

          <section className={styles.section}>
            <h2 className={styles.subTitle}>Om fordelen</h2>
            <p className={styles.bodyText}>{benefit.longDescription}</p>
          </section>

          {benefit.usageInstruction && (
            <section className={styles.section}>
              <h2 className={styles.subTitle}>Slik bruker du fordelen</h2>
              <p className={styles.bodyText}>{benefit.usageInstruction}</p>
            </section>
          )}

          {benefit.termsText && (
            <section className={styles.termsBox}>
              <h2 className={styles.subTitle}>Vilkår</h2>
              <p className={styles.termsText}>{benefit.termsText}</p>
            </section>
          )}
        </div>
      </div>
    </>
  )
}
