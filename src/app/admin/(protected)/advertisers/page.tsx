// CR-004: Admin annonsørliste.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdminAuth } from '@/lib/admin/auth'
import { getAdminAdvertisers } from '@/lib/queries/adminQueries'
import styles from '@/components/admin/AdminTable.module.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Annonsører' }

export default async function AdminAdvertisersPage() {
  await requireAdminAuth()
  const advertisers = await getAdminAdvertisers()

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Annonsører</h1>
        <Link href="/admin/advertisers/new" className={styles.primaryBtn}>+ Ny annonsør</Link>
      </div>

      {advertisers.length === 0 ? (
        <div className={styles.empty}>Ingen annonsører registrert.</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Navn</th>
                <th>Slug</th>
                <th>Kontakt</th>
                <th>Fordeler</th>
                <th>Status</th>
                <th>Handlinger</th>
              </tr>
            </thead>
            <tbody>
              {advertisers.map((a) => (
                <tr key={a.id}>
                  <td>
                    <Link href={`/admin/advertisers/${a.id}`} style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 500 }}>
                      {a.name}
                    </Link>
                  </td>
                  <td style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-xs)' }}>{a.slug}</td>
                  <td style={{ color: 'var(--color-text-muted)' }}>{a.contactEmail ?? '—'}</td>
                  <td>{a.benefitCount}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${a.isActive ? styles['status-active'] : styles['status-archived']}`}>
                      {a.isActive ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actionMenu}>
                      <Link href={`/admin/advertisers/${a.id}`} className={styles.secondaryBtn}>Rediger</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
