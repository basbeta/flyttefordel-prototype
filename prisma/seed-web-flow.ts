// ============================================================
// CR-022 / CR-023: Optional test data for the web flow (Page -> Fordel -> Product).
//
// NOT run automatically. Run on purpose with: npm run db:seed-flow
// Idempotent: skips if any benefit with slug prefix "demo-" already exists.
// Runs in one transaction, so a failure leaves no partial demo data.
//
// Realistic in shape, obviously fictive in content (all names are "Demo ..." and
// slugs start with "demo-"). Covers: several pages, benefits with one product,
// several products and none, a web override of title/text/badge, targeting
// (Oslo area only), and a draft benefit that must NOT show in the flow.
//
// The demo benefits are ordinary active benefits, so they also show up in the
// mobile app lists (the app does not filter on visibility). Do not run against a
// database with real users unless that is intended. No images: seed cannot upload
// files, so the cards use the image fallback.
// ============================================================

import { PrismaClient, type BenefitStatus } from '@prisma/client'

const prisma = new PrismaClient()

const DEMO_PREFIX = 'demo-'

type DemoPage = { name: string; text?: string }

const PAGES: DemoPage[] = [
  { name: 'Til hjemmet', text: 'Praktiske fordeler når du skal pakke og bo inn deg.' },
  { name: 'Streaming og bredbånd', text: 'Hold deg oppdatert fra første dag i det nye hjemmet.' },
  { name: 'Strøm', text: 'Sikre deg en god strømavtale før første regning.' },
  { name: 'Lokale tilbud', text: 'Tilbud fra butikker og tjenester i nærheten av deg.' },
  { name: 'Solskjerming', text: 'Gratis befaring og tilbud på solskjerming.' },
  { name: 'Aviser' },
  { name: 'Lesestoff', text: 'Bli kjent med nabolaget og få inspirasjon til hjemmet.' },
  { name: 'Diverse' },
]

type DemoProduct = { name: string; text?: string; priceText?: string }

type DemoBenefit = {
  slug: string
  title: string
  short: string
  advertiser: string
  page: number
  sortOrder: number
  products: DemoProduct[]
  terms?: string
  // web_card overrides
  webTitle?: string
  webText?: string
  webBadge?: string
  // Only visible for postcodes 0001-1299 (Oslo area). Needs a postcode on the profile.
  osloOnly?: boolean
  status?: BenefitStatus
}

const ADVERTISERS = [
  'Demo Flytteservice AS',
  'Demo Strøm AS',
  'Demo Bredbånd AS',
  'Demo Streaming AS',
  'Demo Solskjerming AS',
  'Demo Lokalavis AS',
  'Demo Bokhandel AS',
  'Demo Nabolag AS',
]

const DEMO_BENEFITS: DemoBenefit[] = [
  {
    slug: `${DEMO_PREFIX}kartonger`,
    title: 'Gratis flyttekartonger',
    short: 'Ti flyttekartonger levert til døren.',
    advertiser: 'Demo Flytteservice AS',
    page: 0,
    sortOrder: 1,
    products: [{ name: 'Ti kartonger', priceText: 'Gratis' }],
    terms: 'Levering innen fem virkedager. Ett sett per husstand.',
  },
  {
    slug: `${DEMO_PREFIX}flyttebyra`,
    title: 'Rabatt på flyttebyrå',
    short: 'Få tilbud på flytting med bærehjelp eller komplett pakking.',
    advertiser: 'Demo Flytteservice AS',
    page: 0,
    sortOrder: 2,
    webBadge: 'Populær',
    products: [
      { name: 'Bærehjelp', text: 'To bærere og bil', priceText: 'Fra 1 990 kr' },
      { name: 'Komplett flytting', text: 'Pakking, transport og utpakking', priceText: 'Fra 5 990 kr' },
      { name: 'Kun transport', priceText: 'Fra 1 290 kr' },
    ],
  },
  {
    slug: `${DEMO_PREFIX}bredband`,
    title: 'Bredbånd uten oppstartsgebyr',
    short: 'Flytt med deg bredbåndet, eller bestill nytt med gratis oppstart.',
    advertiser: 'Demo Bredbånd AS',
    page: 1,
    sortOrder: 1,
    webTitle: 'Bredbånd uten oppstartsgebyr når du flytter',
    products: [
      { name: 'Fiber 100/100', priceText: '449 kr/mnd' },
      { name: 'Fiber 500/500', priceText: '599 kr/mnd' },
    ],
    terms: 'Forutsetter fiber i bygget. Bindingstid 12 måneder.',
  },
  {
    slug: `${DEMO_PREFIX}streaming`,
    title: 'Streaming første måned gratis',
    short: 'Prøv en streamingtjeneste en måned uten kostnad.',
    advertiser: 'Demo Streaming AS',
    page: 1,
    sortOrder: 2,
    webBadge: 'Ny',
    products: [{ name: 'Prøvemåned', priceText: 'Gratis i 30 dager' }],
  },
  {
    slug: `${DEMO_PREFIX}strom-fastpris`,
    title: 'Fastpris på strøm',
    short: 'Forutsigbar strømregning i tolv måneder.',
    advertiser: 'Demo Strøm AS',
    page: 2,
    sortOrder: 1,
    webText: 'Bind prisen i tolv måneder og slipp overraskelser på regningen.',
    products: [
      { name: 'Fastpris 12 mnd', priceText: '99 øre/kWh' },
      { name: 'Spotpris', text: 'Ingen bindingstid', priceText: 'Påslag 4 øre/kWh' },
    ],
    terms: 'Prisen gjelder energileddet. Nettleie kommer i tillegg.',
  },
  {
    slug: `${DEMO_PREFIX}bakeri`,
    title: 'Velkomstbrød fra bakeriet',
    short: 'Hent et gratis brød i bakeriet i nabolaget.',
    advertiser: 'Demo Nabolag AS',
    page: 3,
    sortOrder: 1,
    osloOnly: true,
    products: [{ name: 'Gratis brød', priceText: 'Gratis' }],
    terms: 'Gjelder kun i Oslo-området. Vis kupong i butikk.',
  },
  {
    slug: `${DEMO_PREFIX}frisor`,
    title: 'Rabatt hos frisøren',
    short: 'Tjue prosent på første klipp.',
    advertiser: 'Demo Nabolag AS',
    page: 3,
    sortOrder: 2,
    osloOnly: true,
    products: [{ name: 'Første klipp', priceText: '20 % rabatt' }],
  },
  {
    slug: `${DEMO_PREFIX}solskjerming`,
    title: 'Gratis befaring for solskjerming',
    short: 'Få en uforpliktende befaring og tilbud.',
    advertiser: 'Demo Solskjerming AS',
    page: 4,
    sortOrder: 1,
    products: [{ name: 'Gratis befaring' }],
  },
  {
    slug: `${DEMO_PREFIX}avis`,
    title: 'Prøv lokalavisen',
    short: 'Hold deg oppdatert på det som skjer der du bor.',
    advertiser: 'Demo Lokalavis AS',
    page: 5,
    sortOrder: 1,
    products: [
      { name: 'Digital', text: 'Nettavis og app', priceText: '149 kr/mnd' },
      { name: 'Komplett', text: 'Papiravis og digital', priceText: '249 kr/mnd' },
    ],
    terms: 'Første måned gratis. Kan sies opp når som helst.',
  },
  {
    slug: `${DEMO_PREFIX}bok`,
    title: 'Interiørbok til nytt hjem',
    short: 'En inspirasjonsbok til rabatt for deg som har flyttet.',
    advertiser: 'Demo Bokhandel AS',
    page: 6,
    sortOrder: 1,
    products: [{ name: 'Interiørbok', priceText: '99 kr' }],
  },
  {
    slug: `${DEMO_PREFIX}nabolagsguide`,
    title: 'Guide til nabolaget',
    short: 'Les om butikker, skoler og friluftsliv der du bor nå.',
    advertiser: 'Demo Nabolag AS',
    page: 6,
    sortOrder: 2,
    // No products: shown as information only.
    products: [],
  },
  {
    slug: `${DEMO_PREFIX}diverse-tips`,
    title: 'Tips til de første ukene',
    short: 'En enkel sjekkliste for adresseendring og abonnement.',
    advertiser: 'Demo Flytteservice AS',
    page: 7,
    sortOrder: 1,
    products: [],
  },
  {
    // Draft: must NOT show in the flow (only live benefits do).
    slug: `${DEMO_PREFIX}utkast`,
    title: 'Utkast som ikke skal vises',
    short: 'Skal ikke dukke opp i løpet.',
    advertiser: 'Demo Flytteservice AS',
    page: 0,
    sortOrder: 99,
    status: 'draft',
    products: [{ name: 'Skal ikke vises' }],
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

      const advertisers = new Map<string, string>()
      for (const name of ADVERTISERS) {
        const slug = `${DEMO_PREFIX}${name.toLowerCase().replace(/^demo /, '').replace(/ as$/, '').replace(/[^a-zæøå0-9]+/g, '-')}`
        const a = await tx.advertiser.create({ data: { name, slug } })
        advertisers.set(name, a.id)
      }

      const pageIds: string[] = []
      for (const [i, p] of PAGES.entries()) {
        const page = await tx.flowPage.create({
          data: { name: p.name, text: p.text, sortOrder: i + 1 },
        })
        pageIds.push(page.id)
      }

      for (const d of DEMO_BENEFITS) {
        const benefit = await tx.benefit.create({
          data: {
            advertiserId: advertisers.get(d.advertiser)!,
            categoryId: category.id,
            title: d.title,
            slug: d.slug,
            shortDescription: d.short,
            longDescription: d.short,
            termsText: d.terms,
            status: d.status ?? 'active',
            redemptionType: 'info_only',
          },
        })
        if (d.osloOnly) {
          await tx.targetingRule.create({
            data: {
              benefitId: benefit.id,
              postcodeRanges: [{ from: '0001', to: '1299' }],
              includeUnknownLocation: false,
              appliesNationally: false,
            },
          })
        }
        await tx.benefitView.create({
          data: {
            benefitId: benefit.id,
            format: 'web_card',
            variant: 'standard',
            title: d.webTitle,
            text: d.webText,
            badgeText: d.webBadge,
            pageId: pageIds[d.page],
            sortOrder: d.sortOrder,
          },
        })
        for (const [i, p] of d.products.entries()) {
          await tx.product.create({
            data: { benefitId: benefit.id, name: p.name, text: p.text, priceText: p.priceText, sortOrder: i },
          })
        }
      }

      console.log(
        `Seeded ${PAGES.length} pages, ${ADVERTISERS.length} advertisers and ${DEMO_BENEFITS.length} demo benefits (incl. 1 draft that stays hidden).`,
      )
    },
    { timeout: 60000 },
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
