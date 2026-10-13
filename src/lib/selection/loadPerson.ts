// CR-029: The only place that reads a person's history for the selection. I/O, so it is kept
// apart from the pure isQualified. Never throws: a failure must not stop the page from
// rendering, so the selection then runs without the extra data (rules that need it do not qualify).

import { prisma } from '@/lib/db/client'

export type SelectionExtras = {
  movedAt: Date | null
  housingType: string | null
  chosenBenefitIds: string[]
}

// movedAt and housingType from the person, and the benefits the person has ordered before
// (OrderLine on an order with this person id, CR-024/CR-028).
export async function loadSelectionExtras(personId: string): Promise<SelectionExtras | null> {
  try {
    const [user, lines] = await Promise.all([
      prisma.user.findFirst({
        where: { id: personId, deletedAt: null },
        select: { movedAt: true, housingType: true },
      }),
      prisma.orderLine.findMany({
        where: { order: { personId } },
        select: { benefitId: true },
      }),
    ])
    if (!user) return null
    return {
      movedAt: user.movedAt,
      housingType: user.housingType,
      chosenBenefitIds: [...new Set(lines.map((l) => l.benefitId))],
    }
  } catch (err) {
    // Logged (error name only, a Prisma message can carry values) because this failure silently
    // changes what the person sees: the selection is strict about missing data.
    console.error('[selection] loadSelectionExtras feilet:', err instanceof Error ? err.name : 'UnknownError')
    return null
  }
}
