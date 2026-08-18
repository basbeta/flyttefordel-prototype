// CR-004: Admin leads — read-only liste med CSV-eksport.

import type { Metadata } from 'next'
import { requireAdminAuth } from '@/lib/admin/auth'
import { getAdminLeads } from '@/lib/queries/adminQueries'
import { LeadsTable } from './LeadsTable'
import styles from '@/components/admin/AdminTable.module.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Leads' }

const STATUS_LABELS: Record<string, string> = {
  new: 'Ny', exported: 'Eksportert', failed: 'Feilet', deleted: 'Slettet',
}

type Props = { searchParams: Promise<{ status?: string }> }

export default async function AdminLeadsPage({ searchParams }: Props) {
  await requireAdminAuth()
  const { status: rawStatus } = await searchParams
  const status = rawStatus as 'new' | 'exported' | 'failed' | undefined
  const leads = await getAdminLeads(status ? { status } : undefined)

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Leads</h1>
      </div>

      <LeadsTable leads={leads} statusLabels={STATUS_LABELS} />
    </div>
  )
}
