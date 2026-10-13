// CR-023: One page in the web flow: progress, the page's cards and navigation.
// Unknown, inactive or skipped page ids redirect to the first visible page.

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getWebFlow } from '@/lib/queries/flowQueries'
import { getOrCreateSession } from '@/lib/session'
import { resolveFlowStep } from '@/lib/flow'
import { FlowCard } from '@/components/web/FlowCard'
import { FlowEmpty } from '@/components/web/FlowEmpty'
import { FlowNav } from '@/components/web/FlowNav'
import { FlowProgress } from '@/components/web/FlowProgress'
import styles from '../flow.module.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Flyttefordel' }

type Props = { params: Promise<{ pageId: string }> }

export default async function FlowPageRoute({ params }: Props) {
  const { pageId } = await params
  const session = await getOrCreateSession()
  const pages = await getWebFlow(session, new Date(), session?.personId ?? null)
  const step = resolveFlowStep(pages, pageId)

  if (step.status === 'empty') return <FlowEmpty />
  if (step.status === 'redirect') redirect(`/flytting/${step.pageId}`)

  const page = pages.find((p) => p.id === pageId)
  if (!page) return <FlowEmpty />

  return (
    <div className={styles.page}>
      <FlowProgress position={step.position} />
      <header className={styles.pageHeader}>
        {page.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- plain <img> is the project standard (see BenefitCard)
          <img src={page.imageUrl} alt={page.imageAlt ?? ''} className={styles.pageImage} />
        )}
        <h1 className={styles.pageTitle}>{page.name}</h1>
        {page.text && <p className={styles.pageText}>{page.text}</p>}
      </header>
      <div className={styles.cards}>
        {page.cards.map((card) => (
          <FlowCard key={card.benefitId} card={card} />
        ))}
      </div>
      <FlowNav position={step.position} />
    </div>
  )
}
