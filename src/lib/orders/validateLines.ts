// CR-024: Pure validation of order lines against the flow as the session sees it.
// The client is never trusted: a line is only valid if the benefit is in the person's
// flow and the product belongs to that benefit and is active (inactive products are
// not in the flow read model at all).

import type { WebFlowPage } from '@/types/app'

export type OrderLineInput = { benefitId: string; productId: string }

export type ResolvedLine = {
  benefitId: string
  productId: string
  pageId: string
  productName: string
  benefitTitle: string
}

export type InvalidReason = 'benefit_not_in_flow' | 'product_not_on_benefit' | 'duplicate_benefit'

export type InvalidLine = OrderLineInput & { reason: InvalidReason }

export type LineValidation =
  | { ok: true; lines: ResolvedLine[] }
  | { ok: false; invalid: InvalidLine[] }

export function validateOrderLines(
  lines: readonly OrderLineInput[],
  pages: readonly WebFlowPage[]
): LineValidation {
  const byBenefit = new Map<
    string,
    { pageId: string; title: string; products: Map<string, string> }
  >()
  for (const page of pages) {
    for (const card of page.cards) {
      byBenefit.set(card.benefitId, {
        pageId: page.id,
        title: card.title,
        products: new Map(card.products.map((p) => [p.id, p.name])),
      })
    }
  }

  const resolved: ResolvedLine[] = []
  const invalid: InvalidLine[] = []
  const seen = new Set<string>()

  for (const line of lines) {
    if (seen.has(line.benefitId)) {
      invalid.push({ ...line, reason: 'duplicate_benefit' })
      continue
    }
    seen.add(line.benefitId)

    const benefit = byBenefit.get(line.benefitId)
    if (!benefit) {
      invalid.push({ ...line, reason: 'benefit_not_in_flow' })
      continue
    }
    const productName = benefit.products.get(line.productId)
    if (productName === undefined) {
      invalid.push({ ...line, reason: 'product_not_on_benefit' })
      continue
    }
    resolved.push({
      benefitId: line.benefitId,
      productId: line.productId,
      pageId: benefit.pageId,
      productName,
      benefitTitle: benefit.title,
    })
  }

  return invalid.length > 0 ? { ok: false, invalid } : { ok: true, lines: resolved }
}
