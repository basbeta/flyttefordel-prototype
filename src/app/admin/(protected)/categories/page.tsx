// CR-004: Admin kategorier — lesevisning.

import type { Metadata } from 'next'
import { requireAdminAuth } from '@/lib/admin/auth'
import { getAdminCategories } from '@/lib/queries/adminQueries'
import styles from '@/components/admin/AdminTable.module.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Kategorier' }

export default async function AdminCategoriesPage() {
  await requireAdminAuth()
  const categories = await getAdminCategories()

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Kategorier</h1>
      </div>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr><th>Navn</th><th>Slug</th></tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-xs)' }}>{c.slug}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
