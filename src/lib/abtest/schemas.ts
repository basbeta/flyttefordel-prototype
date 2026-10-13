// CR-030: Zod schemas for the admin routes. Scope and variants are validated per kind by
// parseTestDefinition, so these only check the shared envelope.

import { z } from 'zod'

const date = z
  .string()
  .datetime({ offset: true, message: 'Ugyldig dato' })
  .nullable()
  .optional()

const name = z.string().trim().min(1, 'Navn er påkrevd').max(120, 'Navn er for langt')
const primaryGoal = z.string().trim().max(60, 'Målet er for langt').nullable().optional()

export const createAbTestSchema = z.object({
  name,
  kind: z.string(),
  scope: z.unknown(),
  variants: z.unknown(),
  primaryGoal,
  startsAt: date,
  endsAt: date,
})

export const patchAbTestSchema = z.object({
  name: name.optional(),
  primaryGoal,
  startsAt: date,
  endsAt: date,
  variants: z.unknown().optional(),
  status: z.enum(['draft', 'running', 'ended']).optional(),
})

export const AB_STATUS_ORDER = { draft: 0, running: 1, ended: 2 } as const

// draft -> running -> ended, draft -> ended. An ended test never comes back (new test = new split).
export function isAllowedTransition(from: string, to: string): boolean {
  if (from === to) return true
  if (from === 'draft') return to === 'running' || to === 'ended'
  if (from === 'running') return to === 'ended'
  return false
}

export function periodProblem(startsAt: Date | null, endsAt: Date | null): string | null {
  if (startsAt && endsAt && endsAt <= startsAt) return 'Sluttdato må være etter startdato'
  return null
}
