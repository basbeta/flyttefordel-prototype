// CR-024: Input validation for POST /api/flow/order. Personal data: error messages
// never echo the submitted values.

import { z } from 'zod'

export const MAX_ORDER_LINES = 50

// "" or whitespace counts as "not given" for optional fields.
function optional<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    schema.optional()
  )
}

export const OrderInputSchema = z
  .object({
    submissionId: z.string().uuid('Ugyldig innsendings-id'),
    name: z.string().trim().min(1, 'Navn er påkrevd').max(120, 'Navn er for langt'),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, 'E-post er påkrevd')
      .max(200, 'E-post er for lang')
      .email('Ugyldig e-postadresse'),
    phone: optional(
      z
        .string()
        .trim()
        .max(30, 'Telefonnummer er for langt')
        .regex(/^[0-9 +()-]+$/, 'Ugyldig telefonnummer')
    ),
    postcode: optional(z.string().trim().regex(/^[0-9]{4}$/, 'Postnummer må være fire siffer')),
    consentShare: z.literal(true, {
      errorMap: () => ({ message: 'Du må godta deling av opplysninger for å bestille' }),
    }),
    consentEmail: z.boolean().default(false),
    consentMail: z.boolean().default(false),
    consentSms: z.boolean().default(false),
    lines: z
      .array(
        z
          .object({
            benefitId: z.string().uuid('Ugyldig fordel'),
            productId: z.string().uuid('Ugyldig produkt'),
          })
          .strict()
      )
      .min(1, 'Velg minst én fordel')
      .max(MAX_ORDER_LINES, 'For mange valg'),
  })
  .strict()

export type OrderInput = z.infer<typeof OrderInputSchema>
