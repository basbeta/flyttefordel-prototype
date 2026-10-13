// CR-025: Zod schemas for the admin routes for the web flow (pages, products, placement).
// Kept in one place so the routes and their tests agree.

import { z } from 'zod'
import { VIEW_OVERRIDE_LIMITS } from './viewOverrides'

// Image URLs come from the upload route (absolute https URL) or are typed in; only http(s)
// or site-relative URLs are accepted.
const imageUrl = z
  .string()
  .max(500)
  .refine((v) => /^https?:\/\//i.test(v) || v.startsWith('/'), 'Ugyldig bilde-URL')
  .nullable()
  .optional()

const sortOrder = z.number().int().min(-100000).max(100000)

export const flowPageSchema = z.object({
  name: z.string().trim().min(1, 'Navn er påkrevd').max(120, 'Navn er for langt'),
  text: z.string().max(1000, 'Teksten er for lang').nullable().optional(),
  imageUrl,
  imageAlt: z.string().max(200, 'Alt-teksten er for lang').nullable().optional(),
  sortOrder: sortOrder.default(0),
  isActive: z.boolean().default(true),
})

export const flowPagePatchSchema = z.object({
  name: z.string().trim().min(1, 'Navn er påkrevd').max(120, 'Navn er for langt').optional(),
  text: z.string().max(1000, 'Teksten er for lang').nullable().optional(),
  imageUrl,
  imageAlt: z.string().max(200, 'Alt-teksten er for lang').nullable().optional(),
  sortOrder: sortOrder.optional(),
  isActive: z.boolean().optional(),
})

export const productSchema = z.object({
  name: z.string().trim().min(1, 'Navn er påkrevd').max(120, 'Navn er for langt'),
  text: z.string().max(500, 'Teksten er for lang').nullable().optional(),
  priceText: z.string().max(80, 'Pristeksten er for lang').nullable().optional(),
  sortOrder: sortOrder.default(0),
  isActive: z.boolean().default(true),
})

export const productPatchSchema = z.object({
  name: z.string().trim().min(1, 'Navn er påkrevd').max(120, 'Navn er for langt').optional(),
  text: z.string().max(500, 'Teksten er for lang').nullable().optional(),
  priceText: z.string().max(80, 'Pristeksten er for lang').nullable().optional(),
  sortOrder: sortOrder.optional(),
  isActive: z.boolean().optional(),
})

export const webPlacementSchema = z.object({
  pageId: z.string().uuid('Ugyldig side').nullable(),
  sortOrder: sortOrder.default(0),
})

// CR-027: content overrides for a benefit on a surface. "" / whitespace / missing = null
// (inherit from the benefit). The limits are guesses until ui-spec exists.
function nullableText(max: number, message: string) {
  return z.preprocess(
    (v) => (typeof v === 'string' ? (v.trim() === '' ? null : v.trim()) : (v ?? null)),
    z.string().max(max, message).nullable()
  )
}

export const viewOverrideSchema = z
  .object({
    title: nullableText(VIEW_OVERRIDE_LIMITS.title, 'Tittelen er for lang'),
    text: nullableText(VIEW_OVERRIDE_LIMITS.text, 'Teksten er for lang'),
    imageUrl: z.preprocess(
      (v) => (typeof v === 'string' ? (v.trim() === '' ? null : v.trim()) : (v ?? null)),
      z
        .string()
        .max(VIEW_OVERRIDE_LIMITS.imageUrl, 'Bilde-URL er for lang')
        .refine((v) => /^https?:\/\//i.test(v) || v.startsWith('/'), 'Ugyldig bilde-URL')
        .nullable()
    ),
    imageAlt: nullableText(VIEW_OVERRIDE_LIMITS.imageAlt, 'Alt-teksten er for lang'),
    badgeText: nullableText(VIEW_OVERRIDE_LIMITS.badgeText, 'Merketeksten er for lang'),
  })
  .strict()
