// CR-004: Rediger annonsør.

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdminAuth } from '@/lib/admin/auth'
import { getAdminAdvertiserById } from '@/lib/queries/adminQueries'
import { AdvertiserForm } from '../AdvertiserForm'
import styles from '@/components/admin/AdminTable.module.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Rediger annonsør' }

type Props = { params: { id: string } }

export default async function EditAdvertiserPage({ params }: Props) {
  await requireAdminAuth()
  const advertiser = await getAdminAdvertiserById(params.id)
  if (!advertiser) notFound()

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Rediger annonsør</h1>
        <Link href="/admin/advertisers" className={styles.secondaryBtn}>← Tilbake</Link>
      </div>
      <AdvertiserForm advertiser={advertiser} />
    </div>
  )
}
