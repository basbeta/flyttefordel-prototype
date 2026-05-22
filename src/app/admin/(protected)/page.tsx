// CR-004: Admin dashboard med ekte statistikk.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdminAuth } from '@/lib/admin/auth'
import { getAdminDashboardStats } from '@/lib/queries/adminQueries'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Dashboard' }

export default async function AdminDashboardPage() {
  await requireAdminAuth()
  const stats = await getAdminDashboardStats()

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Dashboard</h1>

      <div className={styles.statGrid}>
        <StatCard label="Aktive fordeler" value={stats.activeBenefitsCount} href="/admin/benefits?status=active" color="green" />
        <StatCard label="Planlagte" value={stats.scheduledBenefitsCount} href="/admin/benefits?status=scheduled" color="blue" />
        <StatCard label="Utløper snart" value={stats.expiringSoonCount} href="/admin/benefits" color="yellow" />
        <StatCard label="Nye leads (7 dager)" value={stats.newLeadsCount} href="/admin/leads" color="purple" />
      </div>

      {stats.lowCodePools.length > 0 && (
        <div className={styles.alert}>
          <h2 className={styles.alertTitle}>Kodepool — lav beholdning</h2>
          <ul className={styles.alertList}>
            {stats.lowCodePools.map((p) => (
              <li key={p.id}>
                <Link href="/admin/codes" className={styles.alertLink}>{p.name}</Link>
                {' '}— {p.availableCodes} koder igjen
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.quickLinks}>
        <h2 className={styles.sectionTitle}>Hurtighandlinger</h2>
        <div className={styles.linkGrid}>
          <Link href="/admin/benefits/new" className={styles.quickLink}>+ Ny fordel</Link>
          <Link href="/admin/advertisers/new" className={styles.quickLink}>+ Ny annonsør</Link>
          <Link href="/admin/heroes/new" className={styles.quickLink}>+ Ny hero</Link>
          <Link href="/admin/leads" className={styles.quickLink}>Se leads</Link>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, href, color }: {
  label: string; value: number; href: string; color: 'green' | 'blue' | 'yellow' | 'purple'
}) {
  return (
    <Link href={href} className={`${styles.statCard} ${styles[color]}`}>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </Link>
  )
}
