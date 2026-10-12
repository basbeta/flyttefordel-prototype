// CR-025: Rediger side i web-løpet.

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdminAuth } from '@/lib/admin/auth'
import { getAdminFlowPageById } from '@/lib/queries/adminQueries'
import { FlowPageForm } from '../FlowPageForm'
import styles from '@/components/admin/AdminTable.module.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Rediger side' }

type Props = { params: Promise<{ id: string }> }

export default async function EditFlowPagePage({ params }: Props) {
  const { id } = await params
  await requireAdminAuth()
  const page = await getAdminFlowPageById(id)
  if (!page) notFound()

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Rediger side</h1>
        <Link href="/admin/flow-pages" className={styles.secondaryBtn}>← Tilbake</Link>
      </div>
      <FlowPageForm page={page} />
    </div>
  )
}
