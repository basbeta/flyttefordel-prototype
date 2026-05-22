// CR-003: Query for saved benefits, keyed by sessionId.

import { prisma } from '@/lib/db/client'
import { mapBenefitCardFromSaved } from './benefitQueries'
import type { BenefitCard } from '@/types/app'

export async function getSavedBenefits(sessionId: string): Promise<BenefitCard[]> {
  const saved = await prisma.savedBenefit.findMany({
    where: { sessionId, deletedAt: null },
    include: {
      benefit: {
        include: {
          advertiser: { select: { id: true, name: true, slug: true, logoUrl: true, websiteUrl: true } },
          category: { select: { id: true, name: true, slug: true, icon: true, sortOrder: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return saved
    .filter((s) => s.benefit.status === 'active' && s.benefit.deletedAt === null)
    .map((s) => ({ ...mapBenefitCardFromSaved(s.benefit), isSaved: true }))
}
