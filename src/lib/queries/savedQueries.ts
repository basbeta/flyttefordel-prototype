// CR-003: Query for saved benefits, keyed by sessionId.

import { prisma } from '@/lib/db/client'
import { getAppCardVariants, mapBenefitCardFromSaved, withAppCardView } from './benefitQueries'
import type { BenefitCard } from '@/types/app'

export async function getSavedBenefits(
  sessionId: string,
  personId: string | null = null,
): Promise<BenefitCard[]> {
  const saved = await prisma.savedBenefit.findMany({
    where: { sessionId, deletedAt: null },
    include: {
      benefit: {
        include: {
          advertiser: { select: { id: true, name: true, slug: true, logoUrl: true, websiteUrl: true } },
          category: { select: { id: true, name: true, slug: true, icon: true, sortOrder: true } },
          // CR-027: same card content as the list (app_card overrides).
          views: { where: { format: 'app_card' } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // CR-025: benefits switched off for the app are left out of the saved list too.
  const visible = saved.filter(
    (s) => s.benefit.status === 'active' && s.benefit.deletedAt === null && s.benefit.showInApp
  )
  // CR-030: the same variant of the card as in the list.
  const variants = await getAppCardVariants(personId, visible.map((s) => s.benefit.id))
  return visible.map((s) => ({
    ...mapBenefitCardFromSaved(withAppCardView(s.benefit, variants.get(s.benefit.id))),
    isSaved: true,
  }))
}
