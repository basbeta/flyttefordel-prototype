// CR-022: Pure live check for a benefit (no I/O). Same rules as the inline
// filters in benefitQueries: status active, not deleted, inside the optional
// start/end window (bounds inclusive).

import type { BenefitStatus } from '@prisma/client'

export type BenefitLiveInput = {
  status: BenefitStatus
  deletedAt: Date | null
  startsAt: Date | null
  endsAt: Date | null
}

export function isBenefitLive(benefit: BenefitLiveInput, now: Date): boolean {
  if (benefit.status !== 'active') return false
  if (benefit.deletedAt) return false
  if (benefit.startsAt && benefit.startsAt > now) return false
  if (benefit.endsAt && benefit.endsAt < now) return false
  return true
}
