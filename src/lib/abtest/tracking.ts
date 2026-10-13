// CR-030: Test dimensions for an event on a benefit's surface (format). Used by routes that know
// the person and benefit but not what the person was shown. Empty when there is no running test.

import { contentScopeKey } from './kinds'
import { resolveActiveAssignments } from './resolve'

export type TestDimensions = { testId?: string; variant?: string; viewId?: string }

export async function testDimensionsFor(
  personId: string | null,
  benefitId: string,
  format: string
): Promise<TestDimensions> {
  const key = contentScopeKey(benefitId, format)
  const a = (await resolveActiveAssignments(personId, [key])).get(key)
  return a ? { testId: a.testId, variant: a.variant, viewId: a.viewId } : {}
}
