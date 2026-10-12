// ============================================================
// CR-022: Optional demo seed for the web flow (Page -> Fordel -> Product).
//
// NOT run automatically. Run on purpose with: npm run db:seed-flow
// Idempotent: skips if any benefit with slug prefix "demo-" already exists.
// Runs in one transaction, so a failure leaves no partial demo data.
//
// Creates obviously fictive demo data (slug prefix "demo-"). The demo benefits
// are ordinary active benefits, so they also show up in the mobile app lists
// (the app does not filter on visibility). Do not run against a database with
// real users unless that is intended.
// ============================================================

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DEMO_PREFIX = 'demo-'

type DemoBenefit = {
  slug: string
  title: string
  short: string
  page: number
  sortOrder: number
  products: { name: string; text?: string; priceText?: string }[]
  webTitle?: string
}

const DEMO_BENEFITS: DemoBenefit[] = [
  {
    slug: `${DEMO_PREFIX}flyttehjelp`,
    title: 'Demo Flyttehjelp',
    short: 'Gratis kartonger ved flytting.',
    page: 0,
    sortOrder: 1,
    products: [{ name: 'Ti kartonger', priceText: 'Gratis' }],
  },
  {
    slug: `${DEMO_PREFIX}solskjerming`,
    title: 'Demo Solskjerming',
    short: 'Gratis måling og befaring.',
    page: 0,
    sortOrder: 2,
    products: [{ name: 'Gratis befaring' }],
  },
  {
    slug: `${DEMO_PREFIX}strom`,
    title: 'Demo Strøm',
    short: 'Fastpris på strøm i tolv måneder.',
    page: 1,
    sortOrder: 1,
    webTitle: 'Fastpris på strøm hos Demo Strøm',
    products: [
      { name: 'Fastpris 12 mnd', priceText: '99 øre/kWh' },
      { name: 'Spotpris', priceText: 'Ingen bindingstid' },
    ],
  },
  {
    slug: `${DEMO_PREFIX}avis`,
    title: 'Demo Lokalavis',
    short: 'Prøv avisen en måned gratis.',
    page: 2,
    sortOrder: 1,
    products: [
      { name: 'Digital', priceText: '149 kr/mnd' },
      { name: 'Komplett', text: 'Papir og digital', priceText: '249 kr/mnd' },
    ],
  },
]

async function main() {
  const existing = await prisma.benefit.findFirst({
    where: { slug: { startsWith: DEMO_PREFIX } },
    select: { id: true },
  })
  if (existing) {
    console.log('Demo flow data already exists, skipping.')
    return
  }

  await prisma.$transaction(
    async (tx) => {
      const category =
        (await tx.category.findFirst({ orderBy: { sortOrder: 'asc' } })) ??
        (await tx.category.create({ data: { name: 'Diverse', slug: 'diverse', sortOrder: 99 } }))

      const advertiser = await tx.advertiser.create({
        data: { name: 'Demo Kunde AS', slug: `${DEMO_PREFIX}kunde` },
      })

      const pages = [
        await tx.flowPage.create({ data: { name: 'Til hjemmet', text: 'Fordeler til det nye hjemmet.', sortOrder: 1 } }),
        await tx.flowPage.create({ data: { name: 'Strøm og bredbånd', text: 'Gode tilbud fra demo-leverandører.', sortOrder: 2 } }),
        await tx.flowPage.create({ data: { name: 'Lesestoff', sortOrder: 3 } }),
      ]

      for (const d of DEMO_BENEFITS) {
        const benefit = await tx.benefit.create({
          data: {
            advertiserId: advertiser.id,
            categoryId: category.id,
            title: d.title,
            slug: d.slug,
            shortDescription: d.short,
            longDescription: d.short,
            status: 'active',
            redemptionType: 'info_only',
          },
        })
        await tx.benefitView.create({
          data: {
            benefitId: benefit.id,
            format: 'web_card',
            variant: 'standard',
            title: d.webTitle,
            pageId: pages[d.page].id,
            sortOrder: d.sortOrder,
          },
        })
        for (const [i, p] of d.products.entries()) {
          await tx.product.create({
            data: { benefitId: benefit.id, name: p.name, text: p.text, priceText: p.priceText, sortOrder: i },
          })
        }
      }

      console.log(`Seeded ${pages.length} pages and ${DEMO_BENEFITS.length} demo benefits with products.`)
    },
    { timeout: 30000 },
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
