// CR-004: Opprett ny fordel.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdminAuth } from '@/lib/admin/auth'
import { getAdminAdvertisers, getAdminCategories, getBenefitOptions } from '@/lib/queries/adminQueries'
import { BenefitForm } from '../BenefitForm'
import styles from '@/components/admin/AdminTable.module.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Ny fordel' }

export default async function NewBenefitPage() {
  await requireAdminAuth()
  const [advertisers, categories, benefitOptions] = await Promise.all([
    getAdminAdvertisers(),
    getAdminCategories(),
    getBenefitOptions(),
  ])

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Ny fordel</h1>
        <Link href="/admin/benefits" className={styles.secondaryBtn}>← Tilbake</Link>
      </div>
      <BenefitForm advertisers={advertisers} categories={categories} benefitOptions={benefitOptions} />
    </div>
  )
}
