// CR-025: Explains why a benefit does or does not show in the web flow (no I/O).
// Mirrors the rules in getWebFlow: live benefit, active page, targeting. Products are
// not required for a card to show (a benefit without products is shown as information).

import { isBenefitLive, type BenefitLiveInput } from './isBenefitLive'

export type WebPlacementInput = {
  benefit: BenefitLiveInput
  // The page the benefit is placed on, or null when it has no placement.
  placement: { pageId: string } | null
  // The placed page as loaded, or null when it no longer exists.
  page: { isActive: boolean; deletedAt: Date | null } | null
  activeProductCount: number
  hasTargeting: boolean
}

export type WebPlacementProblem = {
  code: 'benefit_not_live' | 'page_missing' | 'page_inactive' | 'no_products' | 'targeting'
  // blocking: the benefit will not show in the flow. info: it shows, with a caveat.
  severity: 'blocking' | 'info'
  message: string
}

export function getWebPlacementProblems(input: WebPlacementInput, now: Date): WebPlacementProblem[] {
  // No placement is a choice ("Ikke i løpet"), not a problem.
  if (!input.placement) return []

  const problems: WebPlacementProblem[] = []

  if (!isBenefitLive(input.benefit, now)) {
    problems.push({
      code: 'benefit_not_live',
      severity: 'blocking',
      message: 'Fordelen er ikke aktiv eller ikke innenfor perioden sin, så den vises ikke i løpet.',
    })
  }

  if (!input.page || input.page.deletedAt) {
    problems.push({
      code: 'page_missing',
      severity: 'blocking',
      message: 'Siden er slettet, så fordelen vises ikke i løpet. Velg en annen side.',
    })
  } else if (!input.page.isActive) {
    problems.push({
      code: 'page_inactive',
      severity: 'blocking',
      message: 'Siden er inaktiv, så fordelen vises ikke i løpet.',
    })
  }

  if (input.activeProductCount === 0) {
    problems.push({
      code: 'no_products',
      severity: 'info',
      message: 'Fordelen har ingen aktive produkter. Den vises som ren informasjon uten valg.',
    })
  }

  if (input.hasTargeting) {
    problems.push({
      code: 'targeting',
      severity: 'info',
      message: 'Targeting begrenser hvem som ser fordelen i løpet.',
    })
  }

  return problems
}
