// CR-029: Types for the selection function (docs/10 §4).

// What the selection knows about a person at a point in time. Only postcode and movingStatus are
// required: the other fields are optional so older callers (sessions without a person) keep
// working. A missing value means "unknown", and a rule that needs it does not qualify (strict).
export type SelectionPerson = {
  postcode: string | null
  movingStatus: string
  movedAt?: Date | null
  housingType?: string | null
  // Benefits the person has chosen before (CR-029: ordered in the web flow).
  chosenBenefitIds?: ReadonlySet<string> | readonly string[]
}

// A TargetingRule as the selection reads it. All new (CR-029) fields are optional/nullable so a
// rule row from before the migration, or a plain object in a test, still works.
export type SelectionRule = {
  appliesNationally: boolean
  includeUnknownLocation: boolean
  postcodes: unknown
  postcodeRanges: unknown
  movingStatuses: unknown
  // The benefit the rule belongs to (null for a hero rule). Needed for hideIfChosen.
  benefitId?: string | null
  daysSinceMoveMin?: number | null
  daysSinceMoveMax?: number | null
  housingTypes?: unknown
  requiresChosenBenefitIds?: unknown
  hideIfChosen?: boolean | null
}

// The criterion names explainSelection reports.
export type SelectionCriterion =
  | 'unknownLocation'
  | 'postcode'
  | 'movingStatus'
  | 'daysSinceMove'
  | 'housingType'
  | 'requiresChosen'
  | 'hideIfChosen'

export type SelectionExplanation = {
  qualified: boolean
  // Every criterion that failed (empty when qualified).
  failed: SelectionCriterion[]
}
