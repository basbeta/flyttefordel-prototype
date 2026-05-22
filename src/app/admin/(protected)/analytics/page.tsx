// CR-008: Analytics dashboard — per-fordel hendelsesaggregering.

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { requireAdminAuth } from '@/lib/admin/auth'
import { getAnalytics } from '@/lib/queries/adminQueries'
import { PeriodFilter } from './PeriodFilter'
import styles from '@/components/admin/AdminTable.module.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Analytics' }

type Props = { searchParams: { period?: string } }

const VALID_PERIODS = ['7d', '30d', 'all'] as const
type Period = typeof VALID_PERIODS[number]

function parsePeriod(raw: string | undefined): Period {
  return VALID_PERIODS.includes(raw as Period) ? (raw as Period) : '7d'
}

export default async function AnalyticsPage({ searchParams }: Props) {
  await requireAdminAuth()
  const period = parsePeriod(searchParams.period)
  const data = await getAnalytics(period)

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Analytics</h1>
        <Suspense>
          <PeriodFilter current={period} />
        </Suspense>
      </div>

      {/* Globale nøkkeltall */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <SummaryCard label="Visninger" value={data.totalViews} color="var(--color-info)" />
        <SummaryCard label="Innløsninger" value={data.totalRedemptions} color="var(--color-success)" />
        <SummaryCard label="Leads" value={data.totalLeads} color="#9333ea" />
      </div>

      {/* Per-fordel-tabell */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Fordel</th>
              <th style={{ textAlign: 'right' }}>Visninger</th>
              <th style={{ textAlign: 'right' }}>Kode avslørt</th>
              <th style={{ textAlign: 'right' }}>Kode kopiert</th>
              <th style={{ textAlign: 'right' }}>Leads</th>
              <th style={{ textAlign: 'right' }}>Lagret</th>
              <th style={{ minWidth: 160 }}>Konv.rate</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 && (
              <tr><td colSpan={7} className={styles.empty}>Ingen hendelser registrert for valgt periode</td></tr>
            )}
            {data.rows.map((r) => (
              <tr key={r.id}>
                <td>{r.title}</td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.views.toLocaleString('nb')}</td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.codeRevealed.toLocaleString('nb')}</td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.codeCopied.toLocaleString('nb')}</td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.leads.toLocaleString('nb')}</td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.saved.toLocaleString('nb')}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <div style={{
                      flex: 1,
                      height: 8,
                      background: 'var(--color-border)',
                      borderRadius: 'var(--radius-full)',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${r.conversionRate}%`,
                        background: r.conversionRate >= 50 ? 'var(--color-success)' : r.conversionRate >= 20 ? 'var(--color-warning)' : 'var(--color-primary)',
                        borderRadius: 'var(--radius-full)',
                        transition: 'width 0.3s ease',
                      }} />
                    </div>
                    <span style={{ fontSize: 'var(--font-xs)', color: 'var(--color-text-muted)', minWidth: 32, textAlign: 'right' }}>
                      {r.conversionRate}%
                    </span>
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

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      padding: 'var(--space-5)',
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-1)',
    }}>
      <span style={{ fontSize: 'var(--font-3xl)', fontWeight: 'var(--font-weight-bold)', color }}>
        {value.toLocaleString('nb')}
      </span>
      <span style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-muted)' }}>{label}</span>
    </div>
  )
}
