// CR-024: Client side of the order submission (no React, testable).
// Validation reuses the server's zod schema so both sides agree. The schema and consent
// texts are imported from their own files, NOT from '@/lib/orders' (that index pulls in
// server-only code such as Prisma).

import { OrderInputSchema } from '@/lib/orders/orderSchema'
import type { SummaryItem } from './flowSelection'

export type OrderFormValues = {
  name: string
  email: string
  phone: string
  postcode: string
  consentShare: boolean
  consentEmail: boolean
  consentMail: boolean
  consentSms: boolean
}

export type FieldErrors = Record<string, string[] | undefined>

export type InvalidLineInfo = { benefitId: string; productId: string; reason: string }

export type SubmitOutcome =
  | { kind: 'ok'; orderId: string; replay: boolean }
  | { kind: 'validation'; fields: FieldErrors }
  | { kind: 'invalid_lines'; lines: InvalidLineInfo[] }
  | { kind: 'rate_limited'; retryAfterSeconds: number | null }
  | { kind: 'error' }
  | { kind: 'network' }

// crypto.randomUUID needs a secure context (https or localhost); fall back otherwise.
export function generateSubmissionId(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = Math.floor(Math.random() * 16)
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export function buildOrderPayload(
  values: OrderFormValues,
  items: readonly SummaryItem[],
  submissionId: string
) {
  return {
    submissionId,
    name: values.name,
    email: values.email,
    phone: values.phone,
    postcode: values.postcode,
    consentShare: values.consentShare,
    consentEmail: values.consentEmail,
    consentMail: values.consentMail,
    consentSms: values.consentSms,
    lines: items.map((i) => ({ benefitId: i.benefitId, productId: i.productId })),
  }
}

// null = valid. Same rules as the server.
export function validateOrderPayload(payload: unknown): FieldErrors | null {
  const result = OrderInputSchema.safeParse(payload)
  return result.success ? null : result.error.flatten().fieldErrors
}

export async function postOrder(
  payload: unknown,
  fetchFn: typeof fetch = fetch
): Promise<SubmitOutcome> {
  let res: Response
  try {
    res = await fetchFn('/api/flow/order', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    return { kind: 'network' }
  }

  if (res.status === 429) {
    const retry = Number(res.headers.get('Retry-After'))
    return { kind: 'rate_limited', retryAfterSeconds: Number.isFinite(retry) && retry > 0 ? retry : null }
  }

  let json: unknown
  try {
    json = await res.json()
  } catch {
    return { kind: 'error' }
  }
  const body = (typeof json === 'object' && json !== null ? json : {}) as Record<string, unknown>

  if ((res.status === 200 || res.status === 201) && typeof body.orderId === 'string') {
    return { kind: 'ok', orderId: body.orderId, replay: res.status === 200 }
  }
  if (res.status === 400 && body.error === 'INVALID_LINES' && Array.isArray(body.lines)) {
    return { kind: 'invalid_lines', lines: body.lines as InvalidLineInfo[] }
  }
  if (res.status === 400 && body.error === 'VALIDATION_ERROR') {
    const fields =
      typeof body.fields === 'object' && body.fields !== null ? (body.fields as FieldErrors) : {}
    return { kind: 'validation', fields }
  }
  return { kind: 'error' }
}
