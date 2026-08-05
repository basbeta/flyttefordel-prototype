// CR-003: Save / unsave a benefit for the current anonymous session.
// POST   → 201 (saved) or 200 (already saved, idempotent)
// DELETE → 204 (removed) or 204 (already unsaved, idempotent)

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/client'
import { ANON_ID_HEADER } from '@/lib/session'
import { trackEvent } from '@/lib/tracking/trackEvent'

type Params = { params: { slug: string } }

async function resolveSession(request: NextRequest) {
  const anonymousId = request.headers.get(ANON_ID_HEADER)
  if (!anonymousId) return null
  return prisma.userSession.findUnique({
    where: { anonymousId },
    select: { id: true },
  })
}

async function resolveBenefit(slug: string) {
  return prisma.benefit.findFirst({
    where: { slug: decodeURIComponent(slug), status: 'active', deletedAt: null },
    select: { id: true },
  })
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const [session, benefit] = await Promise.all([
      resolveSession(request),
      resolveBenefit(params.slug),
    ])

    if (!session) return NextResponse.json({ message: 'Ingen sesjon' }, { status: 401 })
    if (!benefit) return NextResponse.json({ message: 'Fordel ikke funnet' }, { status: 404 })

    const existing = await prisma.savedBenefit.findFirst({
      where: { sessionId: session.id, benefitId: benefit.id, deletedAt: null },
      select: { id: true },
    })

    if (existing) return NextResponse.json({ saved: true }, { status: 200 })

    // Restore soft-deleted record if it exists, otherwise create fresh
    const softDeleted = await prisma.savedBenefit.findFirst({
      where: { sessionId: session.id, benefitId: benefit.id, deletedAt: { not: null } },
      select: { id: true },
    })

    if (softDeleted) {
      await prisma.savedBenefit.update({
        where: { id: softDeleted.id },
        data: { deletedAt: null },
      })
    } else {
      await prisma.savedBenefit.create({
        data: { sessionId: session.id, benefitId: benefit.id },
      })
    }

    await trackEvent('benefit_saved', benefit.id)
    return NextResponse.json({ saved: true }, { status: 201 })
  } catch (err) {
    console.error('[benefits/[slug]/save POST] Uventet feil:', err)
    return NextResponse.json({ message: 'Noe gikk galt' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const [session, benefit] = await Promise.all([
      resolveSession(request),
      resolveBenefit(params.slug),
    ])

    if (!session) return NextResponse.json({ message: 'Ingen sesjon' }, { status: 401 })
    if (!benefit) return NextResponse.json({ message: 'Fordel ikke funnet' }, { status: 404 })

    const { count } = await prisma.savedBenefit.updateMany({
      where: { sessionId: session.id, benefitId: benefit.id, deletedAt: null },
      data: { deletedAt: new Date() },
    })

    if (count > 0) await trackEvent('benefit_unsaved', benefit.id)
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('[benefits/[slug]/save DELETE] Uventet feil:', err)
    return NextResponse.json({ message: 'Noe gikk galt' }, { status: 500 })
  }
}
