// CR-024: Submit an order from the web flow. Public and anonymous (session from x-anon-id).
// Stores personal data: NOTHING from the request body may be logged (NFR-003), including
// inside error objects (Prisma errors can carry the submitted values), so only the error
// name and code are logged.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { getOrCreateSession } from '@/lib/session'
import { getPersonIdFromRequest } from '@/lib/identity/token'
import { trackEvent } from '@/lib/tracking/trackEvent'
import { InvalidOrderLinesError, OrderInputSchema, submitOrder } from '@/lib/orders'

const ORDER_RATE_LIMIT = 10
const ORDER_RATE_WINDOW_SECONDS = 60 * 60

function safeErrorLabel(err: unknown): string {
  if (err instanceof Error) {
    const code = (err as { code?: unknown }).code
    return typeof code === 'string' ? `${err.name} ${code}` : err.name
  }
  return 'UnknownError'
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rateLimit = await checkRateLimit(`flow-order:${ip}`, ORDER_RATE_LIMIT, ORDER_RATE_WINDOW_SECONDS)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'RATE_LIMITED', message: 'For mange forsøk. Prøv igjen senere.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: 'Ugyldig forespørsel' },
      { status: 400 }
    )
  }

  const parsed = OrderInputSchema.safeParse(body)
  if (!parsed.success) {
    // flatten() carries messages only, never the submitted values.
    return NextResponse.json(
      {
        error: 'VALIDATION_ERROR',
        message: 'Sjekk feltene og prøv igjen',
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    )
  }

  try {
    const session = await getOrCreateSession()
    const personId = getPersonIdFromRequest(request)
    const result = await submitOrder(parsed.data, {
      sessionId: session?.sessionId ?? null,
      personId,
      targeting: session ? { postcode: session.postcode, movingStatus: session.movingStatus } : null,
    })

    if (result.created) {
      // Fire-and-forget: a tracking failure must never change the response.
      for (const line of result.lines) {
        void trackEvent('benefit_selected', line.benefitId, undefined, {
          channel: 'web',
          viewId: 'web_card:standard',
          sessionId: session?.sessionId ?? null,
          userId: personId,
        })
      }
    }

    return NextResponse.json({ orderId: result.orderId }, { status: result.created ? 201 : 200 })
  } catch (err) {
    if (err instanceof InvalidOrderLinesError) {
      return NextResponse.json(
        {
          error: 'INVALID_LINES',
          message: 'Noen av valgene er ikke lenger tilgjengelige',
          lines: err.invalid,
        },
        { status: 400 }
      )
    }
    console.error('[flow/order POST] Uventet feil:', safeErrorLabel(err))
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Noe gikk galt. Prøv igjen.' },
      { status: 500 }
    )
  }
}
