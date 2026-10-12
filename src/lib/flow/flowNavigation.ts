// CR-023: Pure navigation helpers for the web flow (no I/O).
// Pages can be skipped per person, so position and "next" are always computed
// from the flow as it is for this person, never from a fixed page number.

import type { WebFlowPage } from '@/types/app'

export type FlowPageRef = { id: string; name: string }

export type FlowPosition = {
  pageId: string
  // 1-based position and total, for "Side X av N".
  position: number
  total: number
  previous: FlowPageRef | null
  next: FlowPageRef | null
}

export type FlowStep =
  | { status: 'empty' }
  | { status: 'redirect'; pageId: string }
  | { status: 'ok'; position: FlowPosition }

function ref(page: WebFlowPage): FlowPageRef {
  return { id: page.id, name: page.name }
}

export function getFirstPageId(pages: readonly WebFlowPage[]): string | null {
  return pages[0]?.id ?? null
}

// Unknown, inactive or skipped page ids redirect to the first visible page.
export function resolveFlowStep(pages: readonly WebFlowPage[], pageId: string): FlowStep {
  if (pages.length === 0) return { status: 'empty' }
  const index = pages.findIndex((p) => p.id === pageId)
  if (index === -1) return { status: 'redirect', pageId: pages[0].id }
  return {
    status: 'ok',
    position: {
      pageId,
      position: index + 1,
      total: pages.length,
      previous: index > 0 ? ref(pages[index - 1]) : null,
      next: index < pages.length - 1 ? ref(pages[index + 1]) : null,
    },
  }
}
