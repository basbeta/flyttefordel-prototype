// CR-004: Admin innstillinger — placeholder.

import type { Metadata } from 'next'
import { requireAdminAuth } from '@/lib/admin/auth'
import styles from '@/components/admin/AdminTable.module.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Innstillinger' }

export default async function AdminSettingsPage() {
  await requireAdminAuth()

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Innstillinger</h1>
      </div>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-sm)' }}>
        Innstillinger kommer i en fremtidig fase.
      </p>
    </div>
  )
}
