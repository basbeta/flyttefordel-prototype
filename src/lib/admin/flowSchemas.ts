// CR-025: Zod schemas for the admin routes for the web flow (pages, products, placement).
// Kept in one place so the routes and their tests agree.

import { z } from 'zod'

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
