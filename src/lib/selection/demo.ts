// CR-029: Facts about the selection demo data (prisma/seed-selection-demo.ts), shared by the seed,
// the tests and the e2e suite so they agree on what each seeded test person should see.

export const SELECTION_DEMO_PREFIX = 'demo-sel-'

// The rule of each demo benefit, keyed by the slug without the prefix. In
// requiresChosenBenefitIds the entries are demo KEYS; the seed swaps them for the real ids.
export const DEMO_SELECTION_RULES: Record<
  string,
  {
    daysSinceMoveMin?: number
    daysSinceMoveMax?: number
    housingTypes?: string[]
    requiresChosenBenefitIds?: string[]
    hideIfChosen?: boolean
  }
> = {
  // Shown to everyone until chosen, then hidden.
  grunn: { hideIfChosen: true },
  // Shown only after "grunn" has been chosen (cross-sell).
  kryssalg: { requiresChosenBenefitIds: ['grunn'] },
  'forste-60': { daysSinceMoveMin: 0, daysSinceMoveMax: 60 },
  'etter-180': { daysSinceMoveMin: 180 },
  leilighet: { housingTypes: ['leilighet'] },
  'enebolig-rekkehus': { housingTypes: ['enebolig', 'rekkehus'] },
}

// Keys (slugs without the prefix) each seeded test person is expected to see among the selection
// demo benefits, before any order. Moved dates are relative to the persons seed run.
export const EXPECTED_DEMO_SELECTION: Record<string, string[]> = {
  'test-nylig-flyttet': ['forste-60', 'grunn', 'leilighet'],
  'test-flyttet-tidligere': ['enebolig-rekkehus', 'etter-180', 'grunn'],
  'test-ikke-flytter': ['enebolig-rekkehus', 'grunn'],
  'test-ukjent': ['grunn'],
  'test-nord-norge': ['enebolig-rekkehus', 'forste-60', 'grunn'],
}
