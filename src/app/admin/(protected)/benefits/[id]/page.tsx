// CR-004: Rediger fordel.

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdminAuth } from '@/lib/admin/auth'
import { getAdminBenefitById, getAdminAdvertisers, getAdminCategories } from '@/lib/queries/adminQueries'
import { BenefitForm } from '../BenefitForm'
import styles from '@/components/admin/AdminTable.module.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Rediger fordel' }

type Props = { params: { id: string } }

export default async function EditBenefitPage({ params }: Props) {
  await requireAdminAuth()
  const [benefit, advertisers, categories] = await Promise.all([
    getAdminBenefitById(params.id),
    getAdminAdvertisers(),
    getAdminCategories(),
  ])
  if (!benefit) notFound()

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Rediger fordel</h1>
        <Link href="/admin/benefits" className={styles.secondaryBtn}>← Tilbake</Link>
      </div>
      <BenefitForm advertisers={advertisers} categories={categories} benefit={benefit} />
    </div>
  )
}
