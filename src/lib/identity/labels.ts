// CR-028: Norwegian labels for the person fields, shared by the login page and the profile page.

import type { UserMovingStatus } from '@prisma/client'
import type { PersonSummary } from './types'

export const MOVING_STATUS_LABELS: Record<UserMovingStatus, string> = {
  recently_moved: 'Nylig flyttet (siste 60 dager)',
  moved_past: 'Flyttet for mer enn 60 dager siden',
  not_moving: 'Ikke planlagt å flytte',
  unknown: 'Ukjent',
}

export const HOUSING_TYPE_LABELS: Record<string, string> = {
  enebolig: 'Enebolig',
  leilighet: 'Leilighet',
  rekkehus: 'Rekkehus',
  annet: 'Annet',
}

// "2026-10-03" -> "03.10.2026"
export function formatDateNo(iso: string | null): string | null {
  if (!iso) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso
}

// The labelled parameters of a person, in a fixed order. Empty values are shown as "Ingen",
// so QA can see exactly which case a person covers.
export function describePerson(p: PersonSummary): { label: string; value: string }[] {
  const none = 'Ingen'
  return [
    { label: 'Postnummer', value: p.postcode ?? none },
    { label: 'Flyttestatus', value: MOVING_STATUS_LABELS[p.movingStatus] },
    { label: 'Flyttedato', value: formatDateNo(p.movedAt) ?? none },
    { label: 'Fra-adresse', value: p.fromAddress ?? none },
    { label: 'Til-adresse', value: p.toAddress ?? none },
    { label: 'Boligtype', value: p.housingType ? (HOUSING_TYPE_LABELS[p.housingType] ?? p.housingType) : none },
  ]
}
