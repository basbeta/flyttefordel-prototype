'use client'
// CR-004: Leads-tabell med CSV-eksport. formData aldri loggført (NFR-003).

import { useRouter } from 'next/navigation'
import type { AdminLeadRow } from '@/types/admin'
import type { LeadStatus } from '@prisma/client'
import styles from '@/components/admin/AdminTable.module.css'

const STATUS_LABELS: Record<string, string> = {
  new: 'Ny', exported: 'Eksportert', failed: 'Feilet', deleted: 'Slettet',
}

type Props = {
  leads: AdminLeadRow[]
  statusLabels: Record<string, string>
}

export function LeadsTable({ leads }: Props) {
  const router = useRouter()

  function exportCsv() {
    const header = ['ID', 'Fordel', 'Annonsør', 'Status', 'Samtykke', 'Opprettet']
    const rows = leads.map((l) => [
      l.id, l.benefitTitle, l.advertiserName, l.status,
      l.consentAcceptedAt, l.createdAt,
    ])
    const csv = [header, ...rows].map((r) => r.join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function markExported(id: string) {
    try {
      const res = await fetch(`/api/admin/leads/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'exported' as LeadStatus }),
      })
      if (res.ok) router.refresh()
    } catch {
      // Network error — do nothing, user can retry
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-5)', justifyContent: 'flex-end' }}>
        <button className={styles.secondaryBtn} onClick={exportCsv} disabled={leads.length === 0}>
          Eksporter CSV ({leads.length})
        </button>
      </div>

      {leads.length === 0 ? (
        <div className={styles.empty}>Ingen leads.</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Fordel</th>
                <th>Annonsør</th>
                <th>Status</th>
                <th>Samtykke</th>
                <th>Opprettet</th>
                <th>Handlinger</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 500 }}>{l.benefitTitle}</td>
                  <td style={{ color: 'var(--color-text-muted)' }}>{l.advertiserName}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${l.status === 'new' ? styles['status-active'] : styles['status-archived']}`}>
                      {STATUS_LABELS[l.status] ?? l.status}
                    </span>
                  </td>
                  <td style={{ fontSize: 'var(--font-xs)', color: 'var(--color-text-muted)' }}>
                    {new Date(l.consentAcceptedAt).toLocaleDateString('nb-NO')}
                  </td>
                  <td style={{ fontSize: 'var(--font-xs)', color: 'var(--color-text-muted)' }}>
                    {new Date(l.createdAt).toLocaleString('nb-NO')}
                  </td>
                  <td>
                    {l.status === 'new' && (
                      <button className={styles.secondaryBtn} onClick={() => markExported(l.id)}>
                        Merk eksportert
                      </button>
                    )}
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
