// CR-028: Input validation for the auth routes. Kept in one place so routes and tests agree.
// The limits are guesses for the prototype.

import { z } from 'zod'
import { HOUSING_TYPES } from './types'

// "" / whitespace / missing -> null.
function optionalText(max: number, message: string) {
  return z.preprocess(
    (v) => (typeof v === 'string' ? (v.trim() === '' ? null : v.trim()) : (v ?? null)),
    z.string().max(max, message).nullable()
  )
}

export const loginSchema = z
  .object({
    personId: z.string().uuid('Ugyldig person'),
    email: z.string().trim().email('Ugyldig e-postadresse').max(200, 'E-postadressen er for lang'),
  })
  .strict()

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ugyldig dato')
  // Round trip: JS Date silently rolls 2026-02-31 over to 2026-03-03, so compare the result back.
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`)
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v
  }, 'Ugyldig dato')

export const newPersonSchema = z
  .object({
    name: z.string().trim().min(1, 'Navn mangler').max(80, 'Navnet er for langt'),
    postcode: z.preprocess(
      (v) => (typeof v === 'string' ? (v.trim() === '' ? null : v.trim()) : (v ?? null)),
      z.string().regex(/^\d{4}$/, 'Postnummer må ha 4 siffer').nullable()
    ),
    movingStatus: z.enum(['recently_moved', 'moved_past', 'not_moving', 'unknown']),
    movedAt: z.preprocess((v) => (v === '' ? null : (v ?? null)), isoDate.nullable()),
    fromAddress: optionalText(120, 'Fra-adressen er for lang'),
    toAddress: optionalText(120, 'Til-adressen er for lang'),
    housingType: z.preprocess((v) => (v === '' ? null : (v ?? null)), z.enum(HOUSING_TYPES).nullable()),
  })
  .strict()
