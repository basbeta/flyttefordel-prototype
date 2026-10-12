// CR-023: Summary of the choices.
// CR-024: with the order form. The postcode from the session pre-fills the form.

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
  return (
    <FlowSummary pages={pages} firstPageId={firstPageId} defaultPostcode={session?.postcode ?? null} />
  )
}
