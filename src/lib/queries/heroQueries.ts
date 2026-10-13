// CR-002: Fase 2 — Fordeler i app
// CR-005: Fase 5 — Targeting filter + fallback hero logic added

import { prisma } from '@/lib/db/client'
import { isQualified } from '@/lib/selection'
import type { TargetingSession } from '@/lib/targeting'
import type { HeroCard } from '@/types/app'

export async function getActiveHeroes(session?: TargetingSession | null): Promise<HeroCard[]> {
  const now = new Date()
  const heroes = await prisma.hero.findMany({
    where: {
      status: 'active',
      deletedAt: null,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    include: { targeting: true },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
  })

  const ctx: TargetingSession = session ?? { postcode: null, movingStatus: 'unknown' }

  const nonFallback = heroes.filter((h) => !h.isFallback)
  const fallback = heroes.filter((h) => h.isFallback)

  const matched = nonFallback.filter((h) => isQualified(h.targeting, ctx, now))
  const visible = matched.length > 0 ? matched : fallback

  return visible.map((h) => ({
    id: h.id,
    title: h.title,
    description: h.description,
    imageUrl: h.imageUrl,
    imageAlt: h.imageAlt,
    ctaLabel: h.ctaLabel,
    ctaType: h.ctaType,
    ctaTarget: h.ctaTarget,
    isFallback: h.isFallback,
  }))
}
