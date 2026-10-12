// CR-002: Fire-and-forget event tracking.
// CR-020: channel/view/test/variant/session dimensions, typed event types.
// MIGRATION NOTE: Replace body with your analytics service (Segment, Amplitude, etc.) at MVP.
// Never await this in the user-facing request path — a failed event must not crash the UX.

import { prisma } from '@/lib/db/client'
import { DEFAULT_CHANNEL, type Channel, type TrackableEventType } from './eventTypes'

export type { TrackableEventType } from './eventTypes'

export type TrackEventOptions = {
  channel?: Channel
  viewId?: string | null
  testId?: string | null
  variant?: string | null
  sessionId?: string | null
  userId?: string | null
}

export async function trackEvent(
  eventType: TrackableEventType,
  benefitId: string | null,
  metadata?: Record<string, unknown>,
  options: TrackEventOptions = {}
): Promise<void> {
  try {
    await prisma.benefitEvent.create({
      data: {
        eventType,
        benefitId: benefitId ?? undefined,
        metadata: metadata as object | undefined,
        channel: options.channel ?? DEFAULT_CHANNEL,
        viewId: options.viewId ?? undefined,
        testId: options.testId ?? undefined,
        variant: options.variant ?? undefined,
        sessionId: options.sessionId ?? undefined,
        userId: options.userId ?? undefined,
      },
    })
  } catch {
    // Intentionally swallowed — tracking must never break the user experience.
  }
}
