// CR-004: Admin fordelliste med status-filter og hurtighandlinger.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdminAuth } from '@/lib/admin/auth'
import { getAdminBenefits } from '@/lib/queries/adminQueries'
import { getBenefitDisplayStatus } from '@/lib/benefits/displayStatus'
import { BenefitStatusActions } from './BenefitStatusActions'
import { BenefitStatusBadge } from '@/components/admin/BenefitStatusBadge'
import styles from '@/components/admin/AdminTable.module.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Fordeler' }

const STATUS_LABELS: Record<string, string> = {
  active: 'Aktiv', draft: 'Utkast', scheduled: 'Planlagt',
  paused: 'Pauset', expired: 'Utløpt', archived: 'Arkivert',
}

type Props = { searchParams: Promise<{ status?: string }> }

export default async function AdminBenefitsPage({ searchParams }: Props) {
  await requireAdminAuth()
  const statusValues = ['draft', 'active', 'scheduled', 'paused', 'expired', 'archived', 'deleted'] as const
  type BenefitStatusValue = typeof statusValues[number]
  const { status: rawStatus } = await searchParams
  const status = statusValues.includes(rawStatus as BenefitStatusValue) ? rawStatus as BenefitStatusValue : undefined
  const benefits = await getAdminBenefits(status ? { status } : undefined)

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Fordeler</h1>
        <Link href="/admin/benefits/new" className={styles.primaryBtn}>+ Ny fordel</Link>
      </div>

      <div className={styles.filterBar}>
        {['', 'active', 'draft', 'scheduled', 'paused', 'expired', 'archived'].map((s) => (
          <Link
            key={s}
            href={s ? `/admin/benefits?status=${s}` : '/admin/benefits'}
            className={styles.filterSelect}
            style={{ textDecoration: 'none', background: status === s || (!status && !s) ? 'var(--color-primary-soft)' : undefined }}
          >
            {s ? STATUS_LABELS[s] : 'Alle'}
          </Link>
        ))}
      </div>

      {benefits.length === 0 ? (
        <div className={styles.empty}>Ingen fordeler funnet.</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Tittel</th>
                <th>Status</th>
                <th>Annonsør</th>
                <th>Kategori</th>
                <th>Prioritet</th>
                <th>Utløper</th>
                <th>Handlinger</th>
              </tr>
            </thead>
            <tbody>
              {benefits.map((b) => (
                <tr key={b.id}>
                  <td>
                    <Link href={`/admin/benefits/${b.id}`} style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 500 }}>
                      {b.title}
                    </Link>
                  </td>
                  <td>
                    <BenefitStatusBadge status={getBenefitDisplayStatus(b)} />
                  </td>
                  <td>{b.advertiserName}</td>
                  <td>{b.categoryName}</td>
                  <td>{b.priority}</td>
                  <td style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-xs)' }}>
                    {b.endsAt ? new Date(b.endsAt).toLocaleDateString('nb-NO', { timeZone: 'Europe/Oslo' }) : '—'}
                  </td>
                  <td>
                    <BenefitStatusActions id={b.id} currentStatus={b.status} />
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
