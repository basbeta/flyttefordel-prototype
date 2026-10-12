// CR-025: Opprett ny side i web-løpet.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdminAuth } from '@/lib/admin/auth'
import { FlowPageForm } from '../FlowPageForm'
import styles from '@/components/admin/AdminTable.module.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Ny side' }

export default async function NewFlowPagePage() {
  await requireAdminAuth()
  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Ny side</h1>
        <Link href="/admin/flow-pages" className={styles.secondaryBtn}>← Tilbake</Link>
      </div>
      <FlowPageForm />
    </div>
  )
}
