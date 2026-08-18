// CR-006: POST /api/benefits/[slug]/claim-code
// Tildeler en unik kode fra fordelens kode-pool til nåværende sesjon.
// Idempotent: gjentatte kall fra samme sesjon returnerer samme kode.
// CR-014: rate limiting (20 claims / time per IP) lagt til.
//
// MIGRATION NOTE: For MVP med høyt volum (>1000 samtidige brukere),
// bytt claimCode-transaksjonen til raw SQL med SELECT ... FOR UPDATE SKIP LOCKED.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/client'
import { ANON_ID_HEADER } from '@/lib/session'
import { trackEvent } from '@/lib/tracking/trackEvent'
import { claimCode, NoCodesAvailableError } from '@/lib/codes/claimCode'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

type Params = { params: Promise<{ slug: string }> }

const CLAIM_CODE_RATE_LIMIT = 20
const CLAIM_CODE_RATE_WINDOW_SECONDS = 60 * 60

export async function POST(request: NextRequest, { params }: Params) {
  const { slug } = await params
  const anonymousId = request.headers.get(ANON_ID_HEADER)
  if (!anonymousId) return NextResponse.json({ message: 'Ingen sesjon' }, { status: 401 })

  const ip = getClientIp(request)
  const rateLimit = await checkRateLimit(`claim-code:${ip}`, CLAIM_CODE_RATE_LIMIT, CLAIM_CODE_RATE_WINDOW_SECONDS)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { message: 'For mange forsøk. Prøv igjen senere.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
    )
  }

  try {
    const session = await prisma.userSession.findUnique({
      where: { anonymousId },
      select: { id: true },
    })
    if (!session) return NextResponse.json({ message: 'Ingen sesjon' }, { status: 401 })

    const benefit = await prisma.benefit.findFirst({
      where: { slug: decodeURIComponent(slug), status: 'active', deletedAt: null },
      select: {
        id: true,
        redemptionType: true,
        redemption: { select: { codePoolId: true } },
      },
    })

    if (!benefit) {
      return NextResponse.json({ message: 'Fordel ikke funnet' }, { status: 404 })
    }
    if (benefit.redemptionType !== 'unique_code' || !benefit.redemption?.codePoolId) {
      return NextResponse.json({ message: 'Fordelen støtter ikke unik kode-tildeling' }, { status: 404 })
    }

    const result = await claimCode(benefit.redemption.codePoolId, session.id)
    void trackEvent('code_revealed', benefit.id)
    return NextResponse.json({ code: result.codeValue, alreadyClaimed: result.alreadyClaimed })
  } catch (err) {
    if (err instanceof NoCodesAvailableError) {
      return NextResponse.json(
        { message: 'Ingen koder igjen. Ta kontakt med annonsøren.' },
        { status: 410 },
      )
    }
    console.error('[claim-code] Unexpected error:', err)
    return NextResponse.json({ message: 'Noe gikk galt. Prøv igjen.' }, { status: 500 })
  }
}
