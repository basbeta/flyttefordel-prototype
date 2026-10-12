// CR-021: Format registry. A format is a surface a benefit is shown on.
// Adding a surface later is one new entry here, not a migration (BenefitView.format
// is a plain string validated against this registry).

export type ViewContent = {
  title: string
  text: string
  imageUrl: string | null
  imageAlt: string | null
  badgeText: string | null
}

export type ViewContentField = keyof ViewContent

type FormatSpec = {
  // Fields a view of this format may override. Overrides of other fields are ignored.
  overridable: readonly ViewContentField[]
  // Fields that must be filled after inheritance.
  required: readonly ViewContentField[]
}

export const VIEW_FORMATS = {
  // The benefit card in lists and grids. Detail page is not a view.
  app_card: {
    overridable: ['title', 'text', 'imageUrl', 'imageAlt', 'badgeText'],
    required: ['title', 'text'],
  },
} as const satisfies Record<string, FormatSpec>

export type ViewFormat = keyof typeof VIEW_FORMATS

export const DEFAULT_VARIANT = 'standard'

export function isViewFormat(value: unknown): value is ViewFormat {
  return typeof value === 'string' && Object.hasOwn(VIEW_FORMATS, value)
}

export function getMissingRequiredFields(
  format: ViewFormat,
  content: ViewContent
): ViewContentField[] {
  const required: readonly ViewContentField[] = VIEW_FORMATS[format].required
  return required.filter((field) => {
    const value = content[field]
    return value === null || value.trim().length === 0
  })
}
