// CR-022: Read model for the web flow (Page -> Fordel -> Product).
// Server-side only, no HTTP endpoint. Maps Prisma objects to narrow view models:
// only the listed fields leave this module (no internalNotes, prices, consent
// text, targeting or contact fields).
// Placement (page, order) is read only from the web_card/standard row of a benefit.

import { prisma } from '@/lib/db/client'
import { isBenefitLive } from '@/lib/benefits/isBenefitLive'
import { isQualified } from '@/lib/selection'
import type { TargetingSession } from '@/lib/targeting'
import { resolveBenefitView } from '@/lib/views'
import type { WebFlowCard, WebFlowPage } from '@/types/app'

const WEB_CARD = 'web_card'
const STANDARD = 'standard'

export async function getWebFlow(
  session?: TargetingSession | null,
  now: Date = new Date(),
): Promise<WebFlowPage[]> {
  const targetingCtx: TargetingSession = session ?? { postcode: null, movingStatus: 'unknown' }

  const pages = await prisma.flowPage.findMany({
    where: { isActive: true, deletedAt: null },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: {
      views: {
        where: { format: WEB_CARD, variant: STANDARD },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        include: {
          benefit: {
            include: {
              advertiser: { select: { name: true, logoUrl: true } },
              targeting: true,
              products: {
                where: { isActive: true, deletedAt: null },
                orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
              },
            },
          },
        },
      },
    },
  })

  const result: WebFlowPage[] = []
  for (const page of pages) {
    const cards: WebFlowCard[] = []
    for (const view of page.views) {
      const benefit = view.benefit
      if (!isBenefitLive(benefit, now)) continue
      if (!isQualified(benefit.targeting, targetingCtx, now)) continue

      const content = resolveBenefitView(benefit, [view], WEB_CARD, STANDARD)
      cards.push({
        benefitId: benefit.id,
        slug: benefit.slug,
        title: content.title,
        text: content.text,
        imageUrl: content.imageUrl,
        imageAlt: content.imageAlt,
        badgeText: content.badgeText,
        termsText: benefit.termsText,
        advertiser: { name: benefit.advertiser.name, logoUrl: benefit.advertiser.logoUrl },
        products: benefit.products.map((p) => ({
          id: p.id,
          name: p.name,
          text: p.text,
          priceText: p.priceText,
        })),
      })
    }
    // A page without visible cards is skipped (docs/09: pages can be skipped).
    if (cards.length === 0) continue
    result.push({
      id: page.id,
      name: page.name,
      text: page.text,
      imageUrl: page.imageUrl,
      imageAlt: page.imageAlt,
      cards,
    })
  }
  return result
}
