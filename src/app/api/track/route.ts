// CR-002: Event tracking endpoint — fire-and-forget from client components.
// CR-020: validates eventType/channel against known lists, accepts view/test/variant.

import { NextResponse } from 'next/server'
import { trackEvent } from '@/lib/tracking/trackEvent'
import { getPersonIdFromRequest } from '@/lib/identity/token'
import {
  DEFAULT_CHANNEL,
  MAX_TRACKING_STRING_LENGTH,
  isChannel,
  isTrackableEventType,
} from '@/lib/tracking/eventTypes'
import { getSessionIdFromRequest } from '@/lib/session'

function validationError(message: string) {
  return NextResponse.json({ error: 'VALIDATION_ERROR', message }, { status: 400 })
}

// undefined/null → null (absent); valid string → trimmed; anything else → 'invalid'
function optionalShortString(value: unknown): string | null | 'invalid' {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') return 'invalid'
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  if (trimmed.length > MAX_TRACKING_STRING_LENGTH) return 'invalid'
  return trimmed
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { eventType, benefitId, metadata, channel, viewId, testId, variant } = body as {
      eventType?: unknown
      benefitId?: string
      metadata?: Record<string, unknown>
      channel?: unknown
      viewId?: unknown
      testId?: unknown
      variant?: unknown
    }

    if (!eventType || typeof eventType !== 'string') {
      return validationError('eventType er påkrevd')
    }
    if (!isTrackableEventType(eventType)) {
      return validationError('Ukjent eventType')
    }
    if (channel !== undefined && !isChannel(channel)) {
      return validationError('Ukjent channel')
    }

    const view = optionalShortString(viewId)
    const test = optionalShortString(testId)
    const variantValue = optionalShortString(variant)
    if (view === 'invalid' || test === 'invalid' || variantValue === 'invalid') {
      return validationError(
        `viewId, testId og variant må være tekst på maks ${MAX_TRACKING_STRING_LENGTH} tegn`
      )
    }

    const sessionId = await getSessionIdFromRequest(request)

    await trackEvent(eventType, benefitId ?? null, metadata, {
      channel: channel ?? DEFAULT_CHANNEL,
      viewId: view,
      testId: test,
      variant: variantValue,
      sessionId,
      userId: getPersonIdFromRequest(request),
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Intern feil' },
      { status: 500 }
    )
  }
}
