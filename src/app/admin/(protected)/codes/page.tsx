// CR-004: Admin koder — vis pools og antall tilgjengelige koder.
// CR-009: Lenke til detaljside per pool.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdminAuth } from '@/lib/admin/auth'
import { getAdminCodePools } from '@/lib/queries/adminQueries'
import { AddCodesButton } from './AddCodesButton'
import styles from '@/components/admin/AdminTable.module.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Koder' }

export default async function AdminCodesPage() {
  await requireAdminAuth()
  const pools = await getAdminCodePools()

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Kode-pools</h1>
      </div>

      {pools.length === 0 ? (
        <div className={styles.empty}>Ingen kode-pools registrert.</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Pool-navn</th>
                <th>Fordel</th>
                <th>Tilgjengelig</th>
                <th>Totalt</th>
                <th>Grense</th>
                <th>Handlinger</th>
              </tr>
            </thead>
            <tbody>
              {pools.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500 }}>{p.name}</td>
                  <td style={{ color: 'var(--color-text-muted)' }}>{p.benefitTitle}</td>
                  <td>
                    <span style={{ color: p.availableCodes <= p.lowStockThreshold ? 'var(--color-error)' : 'var(--color-success)', fontWeight: 600 }}>
                      {p.availableCodes}
                    </span>
                  </td>
                  <td>{p.totalCodes}</td>
                  <td style={{ color: 'var(--color-text-muted)' }}>{p.lowStockThreshold}</td>
                  <td style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                    <AddCodesButton poolId={p.id} poolName={p.name} />
                    <Link href={`/admin/codes/${p.id}`} className={styles.actionBtn}>Se koder</Link>
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
