// CR-004: Opprett ny annonsør.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdminAuth } from '@/lib/admin/auth'
import { AdvertiserForm } from '../AdvertiserForm'
import styles from '@/components/admin/AdminTable.module.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Ny annonsør' }

export default async function NewAdvertiserPage() {
  await requireAdminAuth()

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Ny annonsør</h1>
        <Link href="/admin/advertisers" className={styles.secondaryBtn}>← Tilbake</Link>
      </div>
      <AdvertiserForm />
    </div>
  )
}
