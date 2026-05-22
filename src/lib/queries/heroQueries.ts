// CR-002: Fase 2 — Fordeler i app
// Hero queries for the home screen carousel.

import { prisma } from '@/lib/db/client'
import type { HeroCard } from '@/types/app'

export async function getActiveHeroes(): Promise<HeroCard[]> {
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
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
  })
  return heroes.map((h) => ({
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
