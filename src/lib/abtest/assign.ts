// CR-030: Pure variant assignment. Knows nothing about what is tested (content, format,
// placement, structure): only a person, a test id and weighted keys.
// The hash is a contract: changing it moves every person to another variant mid-test. It is
// frozen by a snapshot test.

import { createHash } from 'node:crypto'

export type Variant = { key: string; weight: number }

// Same person + same test = same variant, in every channel, without storing anything.
// Different test ids give independent splits. Returns null for an unusable variant list.
export function assignVariant(
  personId: string,
  testId: string,
  variants: readonly Variant[]
): string | null {
  const usable = variants.filter((v) => Number.isInteger(v.weight) && v.weight > 0 && v.key)
  if (usable.length === 0) return null

  // Sorted by key so the list order in storage can never change who gets what.
  const sorted = [...usable].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
  const total = sorted.reduce((sum, v) => sum + v.weight, 0)

  const digest = createHash('sha256').update(`${testId}:${personId}`).digest()
  let point = digest.readUInt32BE(0) % total
  for (const v of sorted) {
    if (point < v.weight) return v.key
    point -= v.weight
  }
  return null
}
