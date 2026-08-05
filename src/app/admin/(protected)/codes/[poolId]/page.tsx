// CR-009: Admin kode-pool detalj — viser alle koder med tildelingsinformasjon.

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdminAuth } from '@/lib/admin/auth'
import { getAdminCodePoolDetail } from '@/lib/queries/adminQueries'
import { DisableCodeButton } from './DisableCodeButton'
import styles from '@/components/admin/AdminTable.module.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Kode-pool detalj' }

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  available: { label: 'Tilgjengelig', color: 'var(--color-success)' },
  assigned:  { label: 'Tildelt',      color: 'var(--color-info)' },
  disabled:  { label: 'Deaktivert',   color: 'var(--color-text-muted)' },
  reserved:  { label: 'Reservert',    color: 'var(--color-warning)' },
  expired:   { label: 'Utløpt',       color: 'var(--color-error)' },
}

type Props = { params: { poolId: string } }

export default async function CodePoolDetailPage({ params }: Props) {
  await requireAdminAuth()
  const pool = await getAdminCodePoolDetail(params.poolId)
  if (!pool) notFound()

  const isLowStock = pool.availableCodes <= pool.lowStockThreshold

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <Link href="/admin/codes" style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-muted)' }}>
            ← Tilbake til kode-pools
          </Link>
          <h1 className={styles.pageTitle} style={{ marginTop: 'var(--space-1)' }}>{pool.name}</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-sm)', margin: 0 }}>
            Fordel: {pool.benefitTitle}
          </p>
        </div>
      </div>

      {/* Pool-statistikk */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <StatCard label="Tilgjengelig" value={pool.availableCodes} color={isLowStock ? 'var(--color-error)' : 'var(--color-success)'} />
        <StatCard label="Totalt" value={pool.totalCodes} color="var(--color-text)" />
        <StatCard label="Lav-beholdning grense" value={pool.lowStockThreshold} color="var(--color-text-muted)" />
      </div>

      {pool.codes.length === 0 ? (
        <div className={styles.empty}>Ingen koder i denne poolen.</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Kodeverdi</th>
                <th>Status</th>
                <th>Tildelt sesjon</th>
                <th>Tildelt tidspunkt</th>
                <th>Lagt til</th>
                <th>Handlinger</th>
              </tr>
            </thead>
            <tbody>
              {pool.codes.map((c) => {
                const s = STATUS_LABEL[c.status] ?? { label: c.status, color: 'inherit' }
                return (
                  <tr key={c.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{c.codeValue}</td>
                    <td>
                      <span style={{ color: s.color, fontWeight: 500 }}>{s.label}</span>
                    </td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-xs)', fontFamily: 'monospace' }}>
                      {c.assignedSessionId ? `…${c.assignedSessionId.slice(-8)}` : '—'}
                    </td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-xs)' }}>
                      {c.assignedAt ? new Date(c.assignedAt).toLocaleString('nb', { timeZone: 'Europe/Oslo' }) : '—'}
                    </td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-xs)' }}>
                      {new Date(c.createdAt).toLocaleString('nb', { timeZone: 'Europe/Oslo' })}
                    </td>
                    <td>
                      <DisableCodeButton codeId={c.id} poolId={pool.id} status={c.status} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      padding: 'var(--space-4)',
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
    }}>
      <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 'var(--font-weight-bold)', color }}>{value}</div>
      <div style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-muted)' }}>{label}</div>
    </div>
  )
}
