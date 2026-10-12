// CR-025: Sider i web-løpet, liste.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdminAuth } from '@/lib/admin/auth'
import { getAdminFlowPages } from '@/lib/queries/adminQueries'
import { DeleteFlowPageButton } from './DeleteFlowPageButton'
import styles from '@/components/admin/AdminTable.module.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Sider' }

export default async function AdminFlowPagesPage() {
  await requireAdminAuth()
  const pages = await getAdminFlowPages()

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Sider i web-løpet</h1>
        <Link href="/admin/flow-pages/new" className={styles.primaryBtn}>+ Ny side</Link>
      </div>
      <p className={styles.hint} style={{ marginBottom: 'var(--space-4)' }}>
        Sidene vises i rekkefølge i web-løpet. En side uten synlige fordeler utelates. Plasser
        fordeler på en side under «Kanaler» på rediger fordel.
      </p>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Navn</th>
              <th>Rekkefølge</th>
              <th>Plasserte fordeler</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pages.length === 0 && (
              <tr><td colSpan={5} className={styles.empty}>Ingen sider ennå</td></tr>
            )}
            {pages.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td style={{ color: 'var(--color-text-muted)' }}>{p.sortOrder}</td>
                <td style={{ color: 'var(--color-text-muted)' }}>
                  {p.placedCount}
                  {p.placedCount === 0 && ' (tom side utelates fra løpet)'}
                </td>
                <td>
                  <span className={`${styles.statusBadge} ${p.isActive ? styles['status-active'] : styles['status-archived']}`}>
                    {p.isActive ? 'Aktiv' : 'Inaktiv'}
                  </span>
                </td>
                <td>
                  <div className={styles.actionMenu}>
                    <Link href={`/admin/flow-pages/${p.id}`} className={styles.secondaryBtn}>Rediger</Link>
                    <DeleteFlowPageButton id={p.id} name={p.name} placedCount={p.placedCount} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
