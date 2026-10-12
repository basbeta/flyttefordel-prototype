'use client'
// CR-025: Channels for a benefit: placement in the web flow (page + order) and "Vis i appen".
// NOT part of the main benefit form: each group has its own save button.
// The "Vis i appen" save goes through PATCH /api/admin/benefits/[id], which also re-checks
// that an active benefit is complete (CR-017), so it can be refused for a broken benefit.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { WebPlacementProblem } from '@/lib/benefits/webPlacement'
import type { AdminFlowPageOption, AdminWebPlacement } from '@/types/admin'
import adminStyles from '@/components/admin/AdminTable.module.css'
import styles from '@/components/admin/BenefitSections.module.css'

type Props = {
  benefitId: string
  pages: AdminFlowPageOption[]
  placement: AdminWebPlacement
  problems: WebPlacementProblem[]
  showInApp: boolean
}

type Message = { kind: 'ok' | 'error'; text: string } | null

async function readMessage(res: Response): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as { message?: string }
  return data.message ?? 'Noe gikk galt'
}

export function BenefitChannelsSection({ benefitId, pages, placement, problems, showInApp }: Props) {
  const router = useRouter()

  const [pageId, setPageId] = useState(placement.pageId ?? '')
  const [sortOrder, setSortOrder] = useState(placement.sortOrder)
  const [webBusy, setWebBusy] = useState(false)
  const [webMessage, setWebMessage] = useState<Message>(null)

  const [inApp, setInApp] = useState(showInApp)
  const [appBusy, setAppBusy] = useState(false)
  const [appMessage, setAppMessage] = useState<Message>(null)

  const webDirty = pageId !== (placement.pageId ?? '') || sortOrder !== placement.sortOrder
  const appDirty = inApp !== showInApp

  async function saveWeb() {
    setWebBusy(true)
    setWebMessage(null)
    try {
      const res = await fetch(`/api/admin/benefits/${benefitId}/web-placement`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId: pageId || null, sortOrder }),
      })
      if (res.ok) {
        setWebMessage({ kind: 'ok', text: 'Lagret' })
        router.refresh()
      } else {
        setWebMessage({ kind: 'error', text: await readMessage(res) })
      }
    } catch {
      setWebMessage({ kind: 'error', text: 'Nettverksfeil, prøv igjen' })
    }
    setWebBusy(false)
  }

  async function saveApp() {
    setAppBusy(true)
    setAppMessage(null)
    try {
      const res = await fetch(`/api/admin/benefits/${benefitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showInApp: inApp }),
      })
      if (res.ok) {
        setAppMessage({ kind: 'ok', text: 'Lagret' })
        router.refresh()
      } else {
        setAppMessage({ kind: 'error', text: await readMessage(res) })
      }
    } catch {
      setAppMessage({ kind: 'error', text: 'Nettverksfeil, prøv igjen' })
    }
    setAppBusy(false)
  }

  return (
    <section className={styles.section} aria-labelledby="channels-title">
      <h2 id="channels-title" className={styles.title}>Kanaler</h2>
      <p className={styles.help}>
        Hvor fordelen vises. Hver gruppe lagres for seg med egen knapp, uavhengig av «Lagre» for
        fordelen over.
      </p>

      <div className={styles.group}>
        <h3 className={styles.groupTitle}>Web-løpet</h3>
        <div className={styles.inline}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="placement-page">Side</label>
            <select
              id="placement-page"
              className={adminStyles.select}
              value={pageId}
              onChange={(e) => setPageId(e.target.value)}
            >
              <option value="">Ikke i løpet</option>
              {pages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.isActive ? '' : ' (inaktiv)'}
                </option>
              ))}
              {pageId && !pages.some((p) => p.id === pageId) && (
                <option value={pageId}>Slettet side</option>
              )}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="placement-sort">Rekkefølge på siden</label>
            <input
              id="placement-sort"
              className={adminStyles.input}
              type="number"
              step={1}
              value={sortOrder}
              onChange={(e) => setSortOrder(Math.trunc(Number(e.target.value)))}
            />
          </div>
          <div className={styles.actions}>
            <button type="button" className={adminStyles.primaryBtn} onClick={saveWeb} disabled={webBusy || !webDirty}>
              {webBusy ? '…' : 'Lagre plassering'}
            </button>
            {webDirty && !webMessage && <span className={styles.statusDirty}>Ulagret</span>}
            {webMessage && (
              <span role={webMessage.kind === 'error' ? 'alert' : 'status'} className={webMessage.kind === 'error' ? styles.statusError : styles.status}>
                {webMessage.text}
              </span>
            )}
          </div>
        </div>
        {pages.length === 0 && (
          <p className={styles.empty}>Det finnes ingen sider ennå. Opprett en under «Sider» i menyen.</p>
        )}
        {problems.length > 0 && (
          <ul className={styles.problems} aria-label="Merknader om web-løpet">
            {problems.map((p) => (
              <li key={p.code} className={p.severity === 'blocking' ? styles.problemBlocking : styles.problemInfo}>
                {p.message}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.group}>
        <h3 className={styles.groupTitle}>Appen</h3>
        <label className={styles.check}>
          <input type="checkbox" checked={inApp} onChange={(e) => setInApp(e.target.checked)} />
          Vis i appen (lister, «I nærheten» og «Lagret»)
        </label>
        <p className={styles.help}>
          Slås dette av, vises ikke fordelen i appens lister. Detaljsiden og direkte lenker virker
          fortsatt.
        </p>
        <div className={styles.actions}>
          <button type="button" className={adminStyles.primaryBtn} onClick={saveApp} disabled={appBusy || !appDirty}>
            {appBusy ? '…' : 'Lagre'}
          </button>
          {appDirty && !appMessage && <span className={styles.statusDirty}>Ulagret</span>}
          {appMessage && (
            <span role={appMessage.kind === 'error' ? 'alert' : 'status'} className={appMessage.kind === 'error' ? styles.statusError : styles.status}>
              {appMessage.text}
            </span>
          )}
        </div>
      </div>
    </section>
  )
}
