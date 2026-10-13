// CR-029: The targeting (selection rule) input, shared by the four admin routes that write it
// (benefit create/update, hero create/update). It used to be copied into each route.
//
// The new CR-029 fields are optional: left out means "unchanged" on update (Prisma ignores
// undefined), so an older admin page that does not know them cannot wipe them. null clears a
// number; an empty array means "no constraint".

import { z } from 'zod'
import { HOUSING_TYPES } from '@/lib/identity/types'

const days = z.number().int().min(-3650).max(3650).nullable().optional()

export const targetingSchema = z
  .object({
    appliesNationally: z.boolean().default(false),
    includeUnknownLocation: z.boolean().default(true),
    postcodes: z.array(z.string()).default([]),
    postcodeRanges: z.array(z.object({ from: z.string(), to: z.string() })).default([]),
    movingStatuses: z.array(z.string()).default([]),
    // CR-029
    daysSinceMoveMin: days,
    daysSinceMoveMax: days,
    housingTypes: z.array(z.enum(HOUSING_TYPES)).max(HOUSING_TYPES.length).optional(),
    requiresChosenBenefitIds: z.array(z.string().uuid('Ugyldig fordel-id')).max(50).optional(),
    hideIfChosen: z.boolean().optional(),
  })
  .refine(
    (t) =>
      t.daysSinceMoveMin == null || t.daysSinceMoveMax == null || t.daysSinceMoveMin <= t.daysSinceMoveMax,
    { message: 'Dager siden flytting: «fra» kan ikke være større enn «til»', path: ['daysSinceMoveMin'] }
  )

export type TargetingInput = z.infer<typeof targetingSchema>

// The columns of TargetingRule to write, for both create and update.
export function toTargetingData(t: TargetingInput) {
  return {
    appliesNationally: t.appliesNationally,
    includeUnknownLocation: t.includeUnknownLocation,
    postcodes: t.postcodes,
    postcodeRanges: t.postcodeRanges,
    movingStatuses: t.movingStatuses,
    daysSinceMoveMin: t.daysSinceMoveMin,
    daysSinceMoveMax: t.daysSinceMoveMax,
    housingTypes: t.housingTypes,
    requiresChosenBenefitIds: t.requiresChosenBenefitIds,
    hideIfChosen: t.hideIfChosen,
  }
}
