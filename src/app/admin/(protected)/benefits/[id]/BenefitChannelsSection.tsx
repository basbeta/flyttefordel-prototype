'use client'
// CR-025: Channels for a benefit: placement in the web flow (page + order) and "Vis i appen".
// CR-026: save controls follow the shared rule: no button until there are changes, then
// "Lagre", then "Lagret" (InlineSaveActions + useDirtyTracking), per group.
// NOT part of the main benefit form. The "Vis i appen" save goes through
// PATCH /api/admin/benefits/[id], which also re-checks that an active benefit is complete
// (CR-017), so it can be refused for a broken benefit.

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { WebPlacementProblem } from '@/lib/benefits/webPlacement'
import type { AdminFlowPageOption, AdminWebPlacement } from '@/types/admin'
import adminStyles from '@/components/admin/AdminTable.module.css'
import { InlineSaveActions } from '@/components/admin/InlineSaveActions'
import styles from '@/components/admin/BenefitSections.module.css'
import { useDirtyTracking } from '@/lib/admin/useDirtyTracking'

type Props = {
  benefitId: string
  pages: AdminFlowPageOption[]
  placement: AdminWebPlacement
  problems: WebPlacementProblem[]
  showInApp: boolean
}

async function readMessage(res: Response): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as { message?: string }
  return data.message ?? 'Noe gikk galt'
}

export function BenefitChannelsSection({ benefitId, pages, placement, problems, showInApp }: Props) {
  const router = useRouter()

  const [pageId, setPageId] = useState(placement.pageId ?? '')
  const [sortOrder, setSortOrder] = useState(placement.sortOrder)
  const [webSaving, setWebSaving] = useState(false)
  const [webError, setWebError] = useState<string | null>(null)
  const webPayload = useMemo(() => ({ pageId, sortOrder }), [pageId, sortOrder])
  const web = useDirtyTracking(webPayload)

  const [inApp, setInApp] = useState(showInApp)
  const [appSaving, setAppSaving] = useState(false)
  const [appError, setAppError] = useState<string | null>(null)
  const appPayload = useMemo(() => ({ inApp }), [inApp])
  const app = useDirtyTracking(appPayload)

  async function saveWeb() {
    const sent = webPayload
    setWebSaving(true)
    setWebError(null)
    try {
      const res = await fetch(`/api/admin/benefits/${benefitId}/web-placement`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId: sent.pageId || null, sortOrder: sent.sortOrder }),
      })
      if (res.ok) {
        web.markSaved(sent)
        router.refresh()
      } else {
        setWebError(await readMessage(res))
      }
    } catch {
      setWebError('Nettverksfeil, prøv igjen')
    }
    setWebSaving(false)
  }

  async function saveApp() {
    const sent = appPayload
    setAppSaving(true)
    setAppError(null)
    try {
      const res = await fetch(`/api/admin/benefits/${benefitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showInApp: sent.inApp }),
      })
      if (res.ok) {
        app.markSaved(sent)
        router.refresh()
      } else {
        setAppError(await readMessage(res))
      }
    } catch {
      setAppError('Nettverksfeil, prøv igjen')
    }
    setAppSaving(false)
  }

  return (
    <section className={styles.section} aria-labelledby="channels-title">
      <h2 id="channels-title" className={styles.title}>Kanaler</h2>
      <p className={styles.help}>
        Hvor fordelen vises. Hver gruppe lagres for seg, uavhengig av «Lagre endringer» for
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
          <InlineSaveActions
            label="Lagre plassering"
            isDirty={web.isDirty}
            saving={webSaving}
            saved={web.showSaved}
            error={webError}
            onSave={saveWeb}
          />
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
        <InlineSaveActions
          isDirty={app.isDirty}
          saving={appSaving}
          saved={app.showSaved}
          error={appError}
          onSave={saveApp}
        />
      </div>
    </section>
  )
}
