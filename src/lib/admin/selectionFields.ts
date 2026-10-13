// CR-029: The selection fields of a targeting rule as the admin forms edit them (text inputs and
// checkbox lists), and the conversion to and from the stored rule. Pure, so it can be tested
// without a component test setup.

export type SelectionFieldsValue = {
  // Whole days since the moved date, as typed. "" = no limit. Negative = before the move.
  daysSinceMoveMin: string
  daysSinceMoveMax: string
  housingTypes: string[]
  requiresChosenBenefitIds: string[]
  hideIfChosen: boolean
}

export const EMPTY_SELECTION_FIELDS: SelectionFieldsValue = {
  daysSinceMoveMin: '',
  daysSinceMoveMax: '',
  housingTypes: [],
  requiresChosenBenefitIds: [],
  hideIfChosen: false,
}

type RuleLike = {
  daysSinceMoveMin?: number | null
  daysSinceMoveMax?: number | null
  housingTypes?: unknown
  requiresChosenBenefitIds?: unknown
  hideIfChosen?: boolean | null
} | null | undefined

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}

export function selectionFieldsFromRule(rule: RuleLike): SelectionFieldsValue {
  if (!rule) return EMPTY_SELECTION_FIELDS
  return {
    daysSinceMoveMin: typeof rule.daysSinceMoveMin === 'number' ? String(rule.daysSinceMoveMin) : '',
    daysSinceMoveMax: typeof rule.daysSinceMoveMax === 'number' ? String(rule.daysSinceMoveMax) : '',
    housingTypes: strings(rule.housingTypes),
    requiresChosenBenefitIds: strings(rule.requiresChosenBenefitIds),
    hideIfChosen: rule.hideIfChosen === true,
  }
}

// "" and anything that is not a whole number become null (no limit). The server validates again.
export function parseDays(input: string): number | null {
  const t = input.trim()
  if (t === '') return null
  const n = Number(t)
  return Number.isInteger(n) ? n : null
}

export function selectionFieldsToPayload(value: SelectionFieldsValue) {
  return {
    daysSinceMoveMin: parseDays(value.daysSinceMoveMin),
    daysSinceMoveMax: parseDays(value.daysSinceMoveMax),
    housingTypes: value.housingTypes,
    requiresChosenBenefitIds: value.requiresChosenBenefitIds,
    hideIfChosen: value.hideIfChosen,
  }
}

// A problem the admin should see before saving, or null.
export function selectionFieldsProblem(value: SelectionFieldsValue): string | null {
  const min = parseDays(value.daysSinceMoveMin)
  const max = parseDays(value.daysSinceMoveMax)
  if (value.daysSinceMoveMin.trim() !== '' && min === null) return 'Dager siden flytting må være hele tall'
  if (value.daysSinceMoveMax.trim() !== '' && max === null) return 'Dager siden flytting må være hele tall'
  if (min !== null && max !== null && min > max) return 'Dager siden flytting: «fra» kan ikke være større enn «til»'
  return null
}
