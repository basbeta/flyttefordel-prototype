// ============================================================
// CR-029: Demo benefits that use the new selection rules (days since move, housing type,
// cross-sell, hide-if-chosen), so the effect can be seen and proven per test person.
//
// NOT run automatically. Run on purpose with: npm run db:seed-selection
// Needs the CR-029 migration applied and the test persons seeded (npm run db:seed-persons).
// Idempotent per slug: a benefit that already exists is left alone (rules are not overwritten).
// Everything is obviously fictive (slugs start with "demo-sel-").
//
// Expected result per seeded test person (moved dates are relative to the persons seed run, so
// run db:seed-persons again when the dates have aged):
//
//   Test Nylig-Flyttet     (10 d, leilighet)  : forste-60, leilighet, grunn
//   Test Flyttet-Tidligere (240 d, enebolig)  : etter-180, enebolig-rekkehus, grunn
//   Test Ikke-Flytter      (no date, rekkehus): enebolig-rekkehus, grunn
//   Test Ukjent            (nothing known)    : grunn
//   Test Nord-Norge        (40 d, enebolig)   : forste-60, enebolig-rekkehus, grunn
//
// After a person has ORDERED "grunn" in the web flow, "grunn" is hidden (hide-if-chosen) and
// "kryssalg" appears (cross-sell).
// ============================================================

import { PrismaClient, type Prisma } from '@prisma/client'
import { DEMO_SELECTION_RULES, SELECTION_DEMO_PREFIX } from '../src/lib/selection/demo'

const prisma = new PrismaClient()

const PAGE_NAME = 'Utvalg (demo)'
const ADVERTISER_SLUG = `${SELECTION_DEMO_PREFIX}utvalg`

type DemoSelectionBenefit = {
  key: string
  title: string
  short: string
  sortOrder: number
}

// The rules live in src/lib/selection/demo.ts (shared with the tests). "kryssalg" needs the id of
// "grunn", so "grunn" is created first and the keys are swapped for ids in main().
const DEMO: DemoSelectionBenefit[] = [
  {
    key: 'grunn',
    title: 'Grunnpakke strøm',
    short: 'Vises for alle til du har valgt den, så skjules den.',
    sortOrder: 1,
  },
  {
    key: 'kryssalg',
    title: 'Tilleggstjeneste til grunnpakken',
    short: 'Vises først når du har valgt grunnpakken (kryssalg).',
    sortOrder: 2,
  },
  {
    key: 'forste-60',
    title: 'Velkomstpakke første 60 dager',
    short: 'For deg som har flyttet de siste 60 dagene.',
    sortOrder: 3,
  },
  {
    key: 'etter-180',
    title: 'Lojalitetstilbud etter et halvt år',
    short: 'For deg som flyttet for mer enn 180 dager siden.',
    sortOrder: 4,
  },
  {
    key: 'leilighet',
    title: 'Tilbud for leilighet',
    short: 'Bare for deg som bor i leilighet.',
    sortOrder: 5,
  },
  {
    key: 'enebolig-rekkehus',
    title: 'Hage og uterom',
    short: 'For deg som bor i enebolig eller rekkehus.',
    sortOrder: 6,
  },
]

async function main() {
  const category =
    (await prisma.category.findFirst({ orderBy: { sortOrder: 'asc' } })) ??
    (await prisma.category.create({ data: { name: 'Diverse', slug: 'diverse', sortOrder: 99 } }))

  const advertiser =
    (await prisma.advertiser.findUnique({ where: { slug: ADVERTISER_SLUG } })) ??
    (await prisma.advertiser.create({ data: { name: 'Demo Utvalg AS', slug: ADVERTISER_SLUG } }))

  const page =
    (await prisma.flowPage.findFirst({ where: { name: PAGE_NAME, deletedAt: null } })) ??
    (await prisma.flowPage.create({
      data: { name: PAGE_NAME, text: 'Fordeler som bruker utvalgsregler (demo).', sortOrder: 50 },
    }))

  const ids = new Map<string, string>()
  let created = 0

  for (const d of DEMO) {
    const slug = `${SELECTION_DEMO_PREFIX}${d.key}`
    const existing = await prisma.benefit.findUnique({ where: { slug }, select: { id: true } })
    if (existing) {
      ids.set(d.key, existing.id)
      console.log(`Finnes allerede: ${slug}`)
      continue
    }

    // The shared rule, with the cross-sell keys swapped for the real benefit ids.
    const shared = DEMO_SELECTION_RULES[d.key]
    const rule: Omit<Prisma.TargetingRuleUncheckedCreateInput, 'benefitId'> | undefined = shared
      ? {
          ...shared,
          requiresChosenBenefitIds: shared.requiresChosenBenefitIds?.map((k) => {
            const id = ids.get(k)
            if (!id) throw new Error(`Fordelen «${k}» må opprettes før «${d.key}»`)
            return id
          }),
        }
      : undefined

    await prisma.$transaction(async (tx) => {
      const benefit = await tx.benefit.create({
        data: {
          advertiserId: advertiser.id,
          categoryId: category.id,
          title: d.title,
          slug,
          shortDescription: d.short,
          longDescription: d.short,
          status: 'active',
          redemptionType: 'info_only',
        },
      })
      ids.set(d.key, benefit.id)
      if (rule) await tx.targetingRule.create({ data: { ...rule, benefitId: benefit.id } })
      await tx.benefitView.create({
        data: { benefitId: benefit.id, format: 'web_card', variant: 'standard', pageId: page.id, sortOrder: d.sortOrder },
      })
      await tx.product.create({ data: { benefitId: benefit.id, name: 'Ja takk', priceText: 'Gratis', sortOrder: 0 } })
    })
    created++
    console.log(`Opprettet: ${slug}`)
  }

  console.log(`Ferdig: ${created} nye, ${DEMO.length - created} fantes fra før.`)
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
