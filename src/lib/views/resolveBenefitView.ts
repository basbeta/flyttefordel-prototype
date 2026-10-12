// CR-021: Pure function, no I/O. Resolves what a benefit looks like on a surface:
// override from a BenefitView row wins, otherwise the benefit's core content.
// Frontend only ever receives the resolved content and knows nothing about
// inheritance, variants or tests.

import {
  DEFAULT_VARIANT,
  VIEW_FORMATS,
  type ViewContent,
  type ViewFormat,
} from './formats'

// The benefit's core content (subset of Benefit).
export type BenefitCoreContent = {
  title: string
  shortDescription: string
  imageUrl: string | null
  imageAlt: string | null
  badgeText: string | null
}

// Structural subset of the BenefitView row. All content fields are optional overrides.
export type BenefitViewRow = {
  format: string
  variant: string
  title?: string | null
  text?: string | null
  imageUrl?: string | null
  imageAlt?: string | null
  badgeText?: string | null
}

// Empty or whitespace-only counts as "no override".
function clean(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

// Requested variant, else 'standard', else none (pure inheritance).
function pickRow(
  views: readonly BenefitViewRow[],
  format: ViewFormat,
  variant: string
): BenefitViewRow | null {
  const forFormat = views.filter((v) => v.format === format)
  return (
    forFormat.find((v) => v.variant === variant) ??
    forFormat.find((v) => v.variant === DEFAULT_VARIANT) ??
    null
  )
}

export function resolveBenefitView(
  core: BenefitCoreContent,
  views: readonly BenefitViewRow[],
  format: ViewFormat,
  variant: string = DEFAULT_VARIANT
): ViewContent {
  const resolved: ViewContent = {
    title: core.title,
    text: core.shortDescription,
    imageUrl: core.imageUrl,
    imageAlt: core.imageAlt,
    badgeText: core.badgeText,
  }

  const row = pickRow(views, format, variant)
  if (!row) return resolved

  const allowed: readonly string[] = VIEW_FORMATS[format].overridable

  const title = allowed.includes('title') ? clean(row.title) : null
  if (title) resolved.title = title

  const text = allowed.includes('text') ? clean(row.text) : null
  if (text) resolved.text = text

  const badgeText = allowed.includes('badgeText') ? clean(row.badgeText) : null
  if (badgeText) resolved.badgeText = badgeText

  // Image and alt text resolve as a pair: a new image never keeps the benefit's alt text.
  const imageUrl = allowed.includes('imageUrl') ? clean(row.imageUrl) : null
  const imageAlt = allowed.includes('imageAlt') ? clean(row.imageAlt) : null
  if (imageUrl) {
    resolved.imageUrl = imageUrl
    resolved.imageAlt = imageAlt
  } else if (imageAlt) {
    resolved.imageAlt = imageAlt
  }

  return resolved
}
