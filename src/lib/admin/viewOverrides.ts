// CR-027: Pure helpers for editing content overrides of a benefit on a surface (no I/O).
// In the editor an empty string means "inherit from the benefit"; on the wire and in the
// database that is null.

export const VIEW_OVERRIDE_LIMITS = {
  title: 120,
  text: 500,
  badgeText: 40,
  imageAlt: 200,
  imageUrl: 500,
} as const

// Editor state: '' = inherit.
export type ViewOverrideFields = {
  title: string
  text: string
  imageUrl: string
  imageAlt: string
  badgeText: string
}

// Wire/database shape: null = inherit.
export type ViewOverrideBody = {
  title: string | null
  text: string | null
  imageUrl: string | null
  imageAlt: string | null
  badgeText: string | null
}

export const EMPTY_OVERRIDES: ViewOverrideFields = {
  title: '',
  text: '',
  imageUrl: '',
  imageAlt: '',
  badgeText: '',
}

function toNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

export function toOverrideBody(fields: ViewOverrideFields): ViewOverrideBody {
  return {
    title: toNull(fields.title),
    text: toNull(fields.text),
    imageUrl: toNull(fields.imageUrl),
    imageAlt: toNull(fields.imageAlt),
    badgeText: toNull(fields.badgeText),
  }
}

export function fieldsFromRow(
  row: Partial<Record<keyof ViewOverrideFields, string | null>> | null | undefined
): ViewOverrideFields {
  return {
    title: row?.title ?? '',
    text: row?.text ?? '',
    imageUrl: row?.imageUrl ?? '',
    imageAlt: row?.imageAlt ?? '',
    badgeText: row?.badgeText ?? '',
  }
}

// True when at least one field is overridden (whitespace-only counts as inherit).
export function hasOverrides(fields: ViewOverrideFields): boolean {
  return Object.values(toOverrideBody(fields)).some((v) => v !== null)
}
