// CR-004: Rediger fordel.

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdminAuth } from '@/lib/admin/auth'
import { getAdminBenefitById, getAdminAdvertisers, getAdminCategories } from '@/lib/queries/adminQueries'
import { getBenefitDisplayStatus } from '@/lib/benefits/displayStatus'
import { BenefitForm } from '../BenefitForm'
import { BenefitStatusBadge } from '@/components/admin/BenefitStatusBadge'
import styles from '@/components/admin/AdminTable.module.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Rediger fordel' }

type Props = { params: Promise<{ id: string }> }

export default async function EditBenefitPage({ params }: Props) {
  const { id } = await params
  await requireAdminAuth()
  const [benefit, advertisers, categories] = await Promise.all([
    getAdminBenefitById(id),
    getAdminAdvertisers(),
    getAdminCategories(),
  ])
  if (!benefit) notFound()

  // CR-016: Beregnet visningsstatus (aktiv/planlagt/kladd/feilet)
  const displayStatus = getBenefitDisplayStatus(benefit)

  // CR-010: Convert Prisma Decimal → number for BenefitForm
  const benefitForForm = {
    ...benefit,
    campaignFee: benefit.campaignFee?.toNumber() ?? null,
    pricePerView: benefit.pricePerView?.toNumber() ?? null,
    pricePerLead: benefit.pricePerLead?.toNumber() ?? null,
    pricePerRedemption: benefit.pricePerRedemption?.toNumber() ?? null,
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Rediger fordel</h1>
        <Link href="/admin/benefits" className={styles.secondaryBtn}>← Tilbake</Link>
      </div>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <BenefitStatusBadge status={displayStatus} showReasons />
      </div>
      <BenefitForm advertisers={advertisers} categories={categories} benefit={benefitForForm} />
    </div>
  )
}
