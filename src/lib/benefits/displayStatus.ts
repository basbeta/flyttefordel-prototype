// CR-016: Beregnet visningsstatus for fordeler — grupperer den lagrede
// BenefitStatus i 4 farge-bøtter (aktiv/planlagt/kladd/feilet) og oppdager
// reelle konfigurasjonsproblemer (manglende redemption-innhold, utløpte
// datoer status ikke har fanget opp). Ren funksjon, ingen I/O.

import type { BenefitRedemptionType, BenefitStatus } from '@prisma/client'

export type BenefitStatusInput = {
  status: BenefitStatus
  redemptionType: BenefitRedemptionType
  startsAt: Date | string | null
  endsAt: Date | string | null
  redemption: {
    genericCode: string | null
    externalUrl: string | null
    qrValue: string | null
    codePoolId: string | null
    leadFormId: string | null
    codePool: { availableCodes: number } | null
  } | null
}

export type BenefitStatusBucket = 'active' | 'scheduled' | 'draft' | 'failed'

export type BenefitDisplayStatus = {
  bucket: BenefitStatusBucket
  label: string
  reasons: string[]
}

const DRAFT_LIKE_STATUSES: BenefitStatus[] = ['draft', 'paused', 'archived', 'deleted']

const RAW_LABELS: Record<BenefitStatus, string> = {
  draft: 'Utkast',
  scheduled: 'Planlagt',
  active: 'Aktiv',
  paused: 'Pauset',
  expired: 'Utløpt',
  archived: 'Arkivert',
  deleted: 'Slettet',
}

function toDate(value: Date | string | null): Date | null {
  if (!value) return null
  return value instanceof Date ? value : new Date(value)
}

function findProblems(input: BenefitStatusInput, now: Date): string[] {
  const problems: string[] = []
  const startsAt = toDate(input.startsAt)
  const endsAt = toDate(input.endsAt)

  if (endsAt && endsAt < now) {
    problems.push('Sluttdato har passert, men status er ikke oppdatert')
  }
  if (input.status === 'active' && startsAt && startsAt > now) {
    problems.push('Startdato er i fremtiden — bør være «Planlagt»')
  }

  const r = input.redemption
  switch (input.redemptionType) {
    case 'generic_code':
      if (!r?.genericCode) problems.push('Mangler rabattkode')
      break
    case 'qr_code':
      if (!r?.qrValue) problems.push('Mangler QR-innhold')
      break
    case 'external_link':
      if (!r?.externalUrl) problems.push('Mangler ekstern URL')
      break
    case 'unique_code':
      if (!r?.codePoolId) problems.push('Mangler koblet kodepool')
      else if ((r.codePool?.availableCodes ?? 0) <= 0) problems.push('Kodepool er tom')
      break
    case 'lead_form':
      if (!r?.leadFormId) problems.push('Mangler koblet leadskjema')
      break
    case 'mixed':
      if (!r?.genericCode && !r?.externalUrl && !r?.qrValue) {
        problems.push('Mangler innhold for kombinert redemption-type')
      }
      break
    case 'info_only':
      break
  }

  return problems
}

export function getBenefitDisplayStatus(
  input: BenefitStatusInput,
  now: Date = new Date(),
): BenefitDisplayStatus {
  if (DRAFT_LIKE_STATUSES.includes(input.status)) {
    return { bucket: 'draft', label: RAW_LABELS[input.status], reasons: [] }
  }

  if (input.status === 'expired') {
    return { bucket: 'failed', label: RAW_LABELS.expired, reasons: [] }
  }

  // Her er status enten 'active' eller 'scheduled'.
  const reasons = findProblems(input, now)
  if (reasons.length > 0) {
    return { bucket: 'failed', label: 'Feilet', reasons }
  }

  return {
    bucket: input.status === 'scheduled' ? 'scheduled' : 'active',
    label: RAW_LABELS[input.status],
    reasons: [],
  }
}
