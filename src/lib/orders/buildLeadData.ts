// CR-024: Pure builders for the Lead created per ordered benefit.
// Personal data: the result goes to Lead.formData, never to logs.

import { CONSENT_TEXTS } from './consentTexts'
import type { OrderInput } from './orderSchema'
import type { ResolvedLine } from './validateLines'

export type LeadFormData = {
  source: 'web_flow'
  orderId: string
  name: string
  email: string
  phone: string | null
  postcode: string | null
  productId: string
  productName: string
}

export function buildLeadFormData(
  input: Pick<OrderInput, 'name' | 'email' | 'phone' | 'postcode'>,
  line: ResolvedLine,
  orderId: string
): LeadFormData {
  return {
    source: 'web_flow',
    orderId,
    name: input.name,
    email: input.email,
    phone: input.phone ?? null,
    postcode: input.postcode ?? null,
    productId: line.productId,
    productName: line.productName,
  }
}

// The sharing consent is what the Lead stands on (the server's text, not the client's).
export const LEAD_CONSENT_TEXT = CONSENT_TEXTS.share
