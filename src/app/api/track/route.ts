// CR-002: Event tracking endpoint — fire-and-forget from client components.

import { NextResponse } from 'next/server'
import { trackEvent } from '@/lib/tracking/trackEvent'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { eventType, benefitId, metadata } = body as {
      eventType?: string
      benefitId?: string
      metadata?: Record<string, unknown>
    }

    if (!eventType || typeof eventType !== 'string') {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'eventType er påkrevd' },
        { status: 400 }
      )
    }

    await trackEvent(eventType, benefitId ?? null, metadata)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Intern feil' },
      { status: 500 }
    )
  }
}
