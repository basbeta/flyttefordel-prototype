// CR-023: Start of the web flow. Sends to the first visible page for this person,
// or shows an empty state when the flow is empty.

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getWebFlow } from '@/lib/queries/flowQueries'
import { getOrCreateSession } from '@/lib/session'
import { getFirstPageId } from '@/lib/flow'
import { FlowEmpty } from '@/components/web/FlowEmpty'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Flyttefordel' }

export default async function FlowStartPage() {
  const session = await getOrCreateSession()
  const pages = await getWebFlow(session)
  const firstPageId = getFirstPageId(pages)
  if (firstPageId) redirect(`/flytting/${firstPageId}`)
  return <FlowEmpty />
}
