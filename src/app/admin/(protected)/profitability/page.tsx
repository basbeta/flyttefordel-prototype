// CR-010: Lønnsomhetsanalyse-side.

import type { Metadata } from 'next'
import { requireAdminAuth } from '@/lib/admin/auth'
import { getProfitabilityData } from '@/lib/queries/adminQueries'
import styles from '@/components/admin/AdminTable.module.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Lønnsomhetsanalyse' }

function fmt(n: number | null, decimals = 2) {
  if (n == null) return '—'
  return n.toLocaleString('nb-NO', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function fmtNOK(n: number | null) {
  if (n == null) return '—'
  return `${fmt(n)} kr`
}

const summaryCard: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  padding: 'var(--space-5)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-2)',
}

const summaryLabel: React.CSSProperties = {
  fontSize: 'var(--font-xs)',
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

const summaryValue: React.CSSProperties = {
  fontSize: 'var(--font-2xl)',
  fontWeight: 700,
  color: 'var(--color-text)',
}

export default async function ProfitabilityPage() {
  await requireAdminAuth()
  const data = await getProfitabilityData()

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Lønnsomhetsanalyse</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
        <div style={summaryCard}>
          <span style={summaryLabel}>Total inntekt</span>
          <span style={summaryValue}>{fmtNOK(data.totalRevenue)}</span>
        </div>
        <div style={summaryCard}>
          <span style={summaryLabel}>Prissatte kampanjer</span>
          <span style={summaryValue}>{data.pricedCampaigns} / {data.totalCampaigns}</span>
        </div>
      </div>

      {/* Per fordel */}
      <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>Per fordel</h2>
      <div className={styles.tableWrapper} style={{ marginBottom: 'var(--space-8)' }}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Fordel</th>
              <th>Annonsør</th>
              <th>Type</th>
              <th>Visninger</th>
              <th>Leads</th>
              <th>Innløst</th>
              <th>Fast pris</th>
              <th>CPV</th>
              <th>CPL</th>
              <th>CPR</th>
              <th>Inntekt</th>
            </tr>
          </thead>
          <tbody>
            {data.benefits.map((b) => (
              <tr key={b.id}>
                <td>{b.title}</td>
                <td>{b.advertiserName}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 'var(--font-xs)' }}>{b.redemptionType}</td>
                <td>{b.views}</td>
                <td>{b.leads}</td>
                <td>{b.redemptions}</td>
                <td>{fmtNOK(b.campaignFee)}</td>
                <td>{b.pricePerView != null ? `${fmt(b.pricePerView, 4)} kr` : '—'}</td>
                <td>{fmtNOK(b.pricePerLead)}</td>
                <td>{fmtNOK(b.pricePerRedemption)}</td>
                <td style={{ fontWeight: 600 }}>
                  {b.hasPricing ? fmtNOK(b.revenue) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Per annonsør */}
      <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>Per annonsør</h2>
      <div className={styles.tableWrapper} style={{ marginBottom: 'var(--space-8)' }}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Annonsør</th>
              <th>Kampanjer</th>
              <th>Visninger</th>
              <th>Leads</th>
              <th>Innløsninger</th>
              <th>Snitt-CPL</th>
              <th>Snitt-CPV</th>
              <th>Total inntekt</th>
            </tr>
          </thead>
          <tbody>
            {data.advertisers.map((a) => (
              <tr key={a.id}>
                <td>{a.name}</td>
                <td>{a.campaignCount}</td>
                <td>{a.totalViews}</td>
                <td>{a.totalLeads}</td>
                <td>{a.totalRedemptions}</td>
                <td>{fmtNOK(a.avgCPL)}</td>
                <td>{a.avgCPV != null ? `${fmt(a.avgCPV, 4)} kr` : '—'}</td>
                <td style={{ fontWeight: 600 }}>{fmtNOK(a.totalRevenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Per annonseType */}
      <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>Per annonseType</h2>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Type</th>
              <th>Kampanjer</th>
              <th>Visninger</th>
              <th>Leads</th>
              <th>Innløsninger</th>
              <th>Snitt konvertering</th>
              <th>Total inntekt</th>
            </tr>
          </thead>
          <tbody>
            {data.byType.map((t) => (
              <tr key={t.redemptionType}>
                <td style={{ fontFamily: 'monospace', fontSize: 'var(--font-xs)' }}>{t.redemptionType}</td>
                <td>{t.campaignCount}</td>
                <td>{t.totalViews}</td>
                <td>{t.totalLeads}</td>
                <td>{t.totalRedemptions}</td>
                <td>{t.avgConversionRate > 0 ? `${t.avgConversionRate} %` : '—'}</td>
                <td style={{ fontWeight: 600 }}>{t.totalRevenue > 0 ? fmtNOK(t.totalRevenue) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
