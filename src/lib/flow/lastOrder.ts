// CR-024: What the confirmation page shows after a successful order. Kept in the browser
// only (sessionStorage + memory). Deliberately contains NO personal data: just the order id
// and what was ordered.

import type { SummaryItem } from './flowSelection'
import { createSessionStringStore } from './stringStore'

export const LAST_ORDER_STORAGE_KEY = 'flyttefordel.flow.lastOrder.v1'

export type LastOrderItem = {
  title: string
  advertiserName: string
  productName: string
  priceText: string | null
}

export type LastOrder = {
  orderId: string
  items: LastOrderItem[]
}

export function buildLastOrder(orderId: string, items: readonly SummaryItem[]): LastOrder {
  return {
    orderId,
    items: items.map((i) => ({
      title: i.title,
      advertiserName: i.advertiserName,
      productName: i.productName,
      priceText: i.priceText,
    })),
  }
}

export function serializeLastOrder(order: LastOrder): string {
  return JSON.stringify(order)
}

function isItem(value: unknown): value is LastOrderItem {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.title === 'string' &&
    typeof v.advertiserName === 'string' &&
    typeof v.productName === 'string' &&
    (v.priceText === null || typeof v.priceText === 'string')
  )
}

// Tolerant: anything unexpected is "no last order".
export function parseLastOrder(raw: string | null | undefined): LastOrder | null {
  if (!raw) return null
  try {
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null) return null
    const v = value as Record<string, unknown>
    if (typeof v.orderId !== 'string' || v.orderId.length === 0) return null
    if (!Array.isArray(v.items) || !v.items.every(isItem)) return null
    return { orderId: v.orderId, items: v.items }
  } catch {
    return null
  }
}

export const lastOrderStore = createSessionStringStore(LAST_ORDER_STORAGE_KEY)
