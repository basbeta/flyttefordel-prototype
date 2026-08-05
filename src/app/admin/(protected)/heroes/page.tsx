// CR-004: Admin hero-liste.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdminAuth } from '@/lib/admin/auth'
import { getAdminHeroes } from '@/lib/queries/adminQueries'
import styles from '@/components/admin/AdminTable.module.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Heroer' }

const STATUS_LABELS: Record<string, string> = {
  active: 'Aktiv', draft: 'Utkast', scheduled: 'Planlagt',
  paused: 'Pauset', expired: 'Utløpt', archived: 'Arkivert',
}

export default async function AdminHeroesPage() {
  await requireAdminAuth()
  const heroes = await getAdminHeroes()

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Heroer</h1>
        <Link href="/admin/heroes/new" className={styles.primaryBtn}>+ Ny hero</Link>
      </div>

      {heroes.length === 0 ? (
        <div className={styles.empty}>Ingen heroer registrert.</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Tittel</th>
                <th>Status</th>
                <th>Prioritet</th>
                <th>Fallback</th>
                <th>Utløper</th>
                <th>Handlinger</th>
              </tr>
            </thead>
            <tbody>
              {heroes.map((h) => (
                <tr key={h.id}>
                  <td>
                    <Link href={`/admin/heroes/${h.id}`} style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 500 }}>
                      {h.title}
                    </Link>
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles[`status-${h.status}`]}`}>
                      {STATUS_LABELS[h.status] ?? h.status}
                    </span>
                  </td>
                  <td>{h.priority}</td>
                  <td>{h.isFallback ? 'Ja' : '—'}</td>
                  <td style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-xs)' }}>
                    {h.endsAt ? new Date(h.endsAt).toLocaleDateString('nb-NO', { timeZone: 'Europe/Oslo' }) : '—'}
                  </td>
                  <td>
                    <div className={styles.actionMenu}>
                      <Link href={`/admin/heroes/${h.id}`} className={styles.secondaryBtn}>Rediger</Link>
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
