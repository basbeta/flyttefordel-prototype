// CR-007: Kategori-administrasjon — full CRUD.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdminAuth } from '@/lib/admin/auth'
import { getAdminCategoriesFull } from '@/lib/queries/adminQueries'
import { DeactivateCategoryButton } from './DeactivateCategoryButton'
import styles from '@/components/admin/AdminTable.module.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Kategorier' }

export default async function AdminCategoriesPage() {
  await requireAdminAuth()
  const categories = await getAdminCategoriesFull()

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Kategorier</h1>
        <Link href="/admin/categories/new" className={styles.primaryBtn}>+ Ny kategori</Link>
      </div>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Ikon</th>
              <th>Navn</th>
              <th>Slug</th>
              <th>Rekkefølge</th>
              <th>Fordeler</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 && (
              <tr><td colSpan={7} className={styles.empty}>Ingen kategorier ennå</td></tr>
            )}
            {categories.map((c) => (
              <tr key={c.id}>
                <td style={{ fontSize: '1.4rem', lineHeight: 1 }}>{c.icon ?? '—'}</td>
                <td>{c.name}</td>
                <td style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-xs)' }}>{c.slug}</td>
                <td style={{ color: 'var(--color-text-muted)' }}>{c.sortOrder}</td>
                <td style={{ color: 'var(--color-text-muted)' }}>{c.benefitCount}</td>
                <td>
                  <span className={`${styles.statusBadge} ${c.isActive ? styles['status-active'] : styles['status-archived']}`}>
                    {c.isActive ? 'Aktiv' : 'Inaktiv'}
                  </span>
                </td>
                <td>
                  <div className={styles.actionMenu}>
                    <Link href={`/admin/categories/${c.id}`} className={styles.secondaryBtn}>Rediger</Link>
                    {c.isActive && (
                      <DeactivateCategoryButton id={c.id} name={c.name} benefitCount={c.benefitCount} />
                    )}
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
