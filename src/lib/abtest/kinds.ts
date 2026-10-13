// CR-030: Register of test kinds. A kind says what a test is about (its scope), how to validate
// its variants and how a variant shows up in events. Adding a test kind later is one new entry
// here, nothing in assignment, storage, events or the admin routes changes.
// Only `content` exists so far: two views of the same format on one benefit.

import { z } from 'zod'
import { DEFAULT_VARIANT, VIEW_FORMATS, isViewFormat, type ViewFormat } from '@/lib/views'

export const MAX_VARIANTS = 6

export const variantKey = z
  .string()
  .regex(/^[a-z0-9][a-z0-9_-]{0,39}$/, 'Variantnøkkel: små bokstaver, tall, - og _ (maks 40 tegn)')

export const variantsSchema = z
  .array(
    z.object({
      key: variantKey,
      weight: z.number().int().min(1, 'Vekt må være minst 1').max(1000, 'Vekt er for stor'),
    })
  )
  .min(2, 'En test trenger minst to varianter')
  .max(MAX_VARIANTS, `Maks ${MAX_VARIANTS} varianter`)
  .refine((vs) => new Set(vs.map((v) => v.key)).size === vs.length, 'Variantnøklene må være unike')

type TestKind<Scope> = {
  scopeSchema: z.ZodType<Scope>
  // At most one running test per scope key.
  scopeKey: (scope: Scope) => string
  // null = ok, otherwise a message for the admin.
  validateVariants: (scope: Scope, variants: readonly { key: string }[]) => string | null
  // The id written to events (BenefitEvent.view_id).
  viewId: (scope: Scope, variant: string) => string
  // Optional extra check right before a test starts (needs I/O). null = ok.
  checkStart?: (scope: Scope, variants: readonly { key: string }[]) => Promise<string | null>
}

export type ContentScope = { benefitId: string; format: ViewFormat }

export function contentScopeKey(benefitId: string, format: string): string {
  return `content:${benefitId}:${format}`
}

const contentKind: TestKind<ContentScope> = {
  scopeSchema: z.object({
    benefitId: z.string().uuid(),
    format: z.string().refine(isViewFormat, 'Ukjent format') as unknown as z.ZodType<ViewFormat>,
  }),
  scopeKey: (s) => contentScopeKey(s.benefitId, s.format),
  validateVariants: (_scope, variants) =>
    variants.some((v) => v.key === DEFAULT_VARIANT)
      ? null
      : `Varianten «${DEFAULT_VARIANT}» må være med som kontrollgruppe`,
  viewId: (s, variant) => `${s.format}:${variant}`,
  // A variant without a view row would silently show the standard content: refuse to start.
  checkStart: async (s, variants) => {
    const { prisma } = await import('@/lib/db/client')
    const wanted = variants.map((v) => v.key).filter((k) => k !== DEFAULT_VARIANT)
    const rows = await prisma.benefitView.findMany({
      where: { benefitId: s.benefitId, format: s.format, variant: { in: wanted } },
      select: { variant: true },
    })
    const have = new Set(rows.map((r) => r.variant))
    const missing = wanted.filter((k) => !have.has(k))
    return missing.length ? `Varianten ${missing.join(', ')} har ikke noe innhold ennå` : null
  },
}

export const TEST_KINDS = {
  content: contentKind,
} as const

export type TestKindName = keyof typeof TEST_KINDS

export function isTestKind(value: unknown): value is TestKindName {
  return typeof value === 'string' && Object.hasOwn(TEST_KINDS, value)
}

export type ParsedTest = {
  kind: TestKindName
  scope: unknown
  scopeKey: string
  variants: { key: string; weight: number }[]
}

// One validation path for every kind, used by the admin routes. Returns a message on failure.
export function parseTestDefinition(input: {
  kind: unknown
  scope?: unknown
  variants?: unknown
}): { ok: true; value: ParsedTest } | { ok: false; message: string } {
  if (!isTestKind(input.kind)) return { ok: false, message: 'Ukjent testtype' }
  const kind = TEST_KINDS[input.kind] as TestKind<unknown>
  const scope = kind.scopeSchema.safeParse(input.scope)
  if (!scope.success) return { ok: false, message: scope.error.errors[0]?.message ?? 'Ugyldig scope' }
  const variants = variantsSchema.safeParse(input.variants)
  if (!variants.success) return { ok: false, message: variants.error.errors[0]?.message ?? 'Ugyldige varianter' }
  const problem = kind.validateVariants(scope.data, variants.data)
  if (problem) return { ok: false, message: problem }
  return {
    ok: true,
    value: {
      kind: input.kind,
      scope: scope.data,
      scopeKey: kind.scopeKey(scope.data),
      variants: variants.data,
    },
  }
}

export function viewIdFor(kind: string, scope: unknown, variant: string): string | null {
  if (!isTestKind(kind)) return null
  const spec = TEST_KINDS[kind] as TestKind<unknown>
  const parsed = spec.scopeSchema.safeParse(scope)
  return parsed.success ? spec.viewId(parsed.data, variant) : null
}

// Used by the start route: kind-specific check right before a test starts.
export async function checkTestStart(
  kind: string,
  scope: unknown,
  variants: readonly { key: string }[]
): Promise<string | null> {
  if (!isTestKind(kind)) return 'Ukjent testtype'
  const spec = TEST_KINDS[kind] as TestKind<unknown>
  const parsed = spec.scopeSchema.safeParse(scope)
  if (!parsed.success) return 'Ugyldig scope'
  return spec.checkStart ? spec.checkStart(parsed.data, variants) : null
}
