// CR-023: Read-only summary of the choices. No submit yet (CR-024).

import type { Metadata } from 'next'
import { getWebFlow } from '@/lib/queries/flowQueries'
import { getOrCreateSession } from '@/lib/session'
import { getFirstPageId } from '@/lib/flow'
import { FlowEmpty } from '@/components/web/FlowEmpty'
import { FlowSummary } from '@/components/web/FlowSummary'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Oppsummering' }

export default async function FlowSummaryPage() {
  const session = await getOrCreateSession()
  const pages = await getWebFlow(session)
  const firstPageId = getFirstPageId(pages)
  if (!firstPageId) return <FlowEmpty />
  return <FlowSummary pages={pages} firstPageId={firstPageId} />
}
