// TEMP DEBUG — slett etter bruk
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

export async function GET() {
  const now = new Date()
  const benefits = await prisma.benefit.findMany({
    where: {
      status: 'active',
      deletedAt: null,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    select: { id: true, title: true, status: true, startsAt: true, endsAt: true, deletedAt: true },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
  })

  const gratis = await prisma.benefit.findFirst({
    where: { id: '3a48a477-a6b2-490c-bba8-2b5842881a50' },
    select: { id: true, title: true, status: true, startsAt: true, endsAt: true, deletedAt: true },
  })

  return NextResponse.json({ now: now.toISOString(), activeCount: benefits.length, benefits, gratisBenefit: gratis })
}
