// CR-023: Pure selection logic for the web flow (no I/O, no storage access).
// A selection is one chosen product per benefit: { [benefitId]: productId }.
// It lives only in the browser (see selectionStore.ts), nothing is sent anywhere.

import type { WebFlowPage } from '@/types/app'

export type FlowSelection = Record<string, string>

export const SELECTION_STORAGE_KEY = 'flyttefordel.flow.selection.v1'

export type SummaryItem = {
  pageId: string
  pageName: string
  benefitId: string
  title: string
  advertiserName: string
  productId: string
  productName: string
  priceText: string | null
}

// Tolerant: anything that is not a plain object of string -> string is "no selection".
export function parseSelection(raw: string | null | undefined): FlowSelection {
  if (!raw) return {}
  try {
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}
    const result: FlowSelection = {}
    for (const [key, v] of Object.entries(value)) {
      if (typeof v === 'string' && v.length > 0) result[key] = v
    }
    return result
  } catch {
    return {}
  }
}

export function serializeSelection(selection: FlowSelection): string {
  return JSON.stringify(selection)
}

// Press a product: select it, press the selected one again to undo, press another
// product on the same benefit to switch. Never mutates the input.
export function toggleProduct(
  selection: FlowSelection,
  benefitId: string,
  productId: string
): FlowSelection {
  if (selection[benefitId] === productId) {
    const { [benefitId]: _removed, ...rest } = selection
    return rest
  }
  return { ...selection, [benefitId]: productId }
}

// Drop choices that point at a benefit or product that is no longer in the flow
// (gone between visits, or not visible for this person).
export function sanitizeSelection(
  selection: FlowSelection,
  pages: readonly WebFlowPage[]
): FlowSelection {
  const valid = new Map<string, Set<string>>()
  for (const page of pages) {
    for (const card of page.cards) {
      valid.set(card.benefitId, new Set(card.products.map((p) => p.id)))
    }
  }
  const result: FlowSelection = {}
  for (const [benefitId, productId] of Object.entries(selection)) {
    if (valid.get(benefitId)?.has(productId)) result[benefitId] = productId
  }
  return result
}

// Chosen items in flow order (page order, then card order). Selection is sanitized first.
export function buildSummary(
  selection: FlowSelection,
  pages: readonly WebFlowPage[]
): SummaryItem[] {
  const clean = sanitizeSelection(selection, pages)
  const items: SummaryItem[] = []
  for (const page of pages) {
    for (const card of page.cards) {
      const productId = clean[card.benefitId]
      if (!productId) continue
      const product = card.products.find((p) => p.id === productId)
      if (!product) continue
      items.push({
        pageId: page.id,
        pageName: page.name,
        benefitId: card.benefitId,
        title: card.title,
        advertiserName: card.advertiser.name,
        productId: product.id,
        productName: product.name,
        priceText: product.priceText,
      })
    }
  }
  return items
}
