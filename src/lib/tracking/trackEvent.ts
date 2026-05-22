// CR-002: Fire-and-forget event tracking.
// MIGRATION NOTE: Replace body with your analytics service (Segment, Amplitude, etc.) at MVP.
// Never await this in the user-facing request path — a failed event must not crash the UX.

import { prisma } from '@/lib/db/client'

export type TrackableEventType =
  | 'benefit_viewed'
  | 'code_revealed'
  | 'code_copied'
  | 'qr_opened'
  | 'external_link_clicked'
  | 'lead_form_started'
  | 'lead_submitted'
  | 'benefit_saved'
  | 'benefit_unsaved'
  | 'hero_clicked'

export async function trackEvent(
  eventType: TrackableEventType | string,
  benefitId: string | null,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.benefitEvent.create({
      data: {
        eventType,
        benefitId: benefitId ?? undefined,
        metadata: metadata as object | undefined,
      },
    })
  } catch {
    // Intentionally swallowed — tracking must never break the user experience.
  }
}
