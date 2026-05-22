// ============================================================
// FORDELSKLUBBEN — Database Seed
// CR-001: Fase 1 Grunnmur
//
// Testdata basert på PRD-del 08, seksjon 9.
// Seed er idempotent: hoppes over hvis kategoridata allerede eksisterer.
//
// Kjør med: npx prisma db seed
// ============================================================

import { PrismaClient, BenefitStatus, BenefitRedemptionType, HeroStatus, CTAType, AdminRole } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Idempotency check: skip if seed data already exists.
  const existingCategory = await prisma.category.findFirst()
  if (existingCategory) {
    console.log('Seed data already exists — skipping.')
    return
  }

  console.log('Seeding database...')

  // ---- 1. Categories ----
  const categories = await Promise.all([
    prisma.category.create({ data: { name: 'Flytting og bolig', slug: 'flytting-og-bolig', icon: '🏠', sortOrder: 1 } }),
    prisma.category.create({ data: { name: 'Strøm og energi', slug: 'strom-og-energi', icon: '⚡', sortOrder: 2 } }),
    prisma.category.create({ data: { name: 'Forsikring', slug: 'forsikring', icon: '🛡️', sortOrder: 3 } }),
    prisma.category.create({ data: { name: 'Mat og dagligvarer', slug: 'mat-og-dagligvarer', icon: '🛒', sortOrder: 4 } }),
    prisma.category.create({ data: { name: 'Interiør og hjem', slug: 'interior-og-hjem', icon: '🛋️', sortOrder: 5 } }),
    prisma.category.create({ data: { name: 'Trening og helse', slug: 'trening-og-helse', icon: '💪', sortOrder: 6 } }),
    prisma.category.create({ data: { name: 'Underholdning', slug: 'underholdning', icon: '🎬', sortOrder: 7 } }),
    prisma.category.create({ data: { name: 'Lokalt', slug: 'lokalt', icon: '📍', sortOrder: 8 } }),
    prisma.category.create({ data: { name: 'Diverse', slug: 'diverse', icon: '✨', sortOrder: 9 } }),
  ])

  const [catFlytting, catStrom, catForsikring, , catInterior, catTrening, , catLokalt] = categories
  console.log(`✓ ${categories.length} kategorier opprettet`)

  // ---- 2. Advertisers ----
  const [advIf, advStrom, advInterior, advTrening, advLokal] = await Promise.all([
    prisma.advertiser.create({
      data: {
        name: 'If Forsikring',
        slug: 'if-forsikring',
        websiteUrl: 'https://www.if.no',
        contactName: 'Demo Kontakt',
        contactEmail: 'demo@if.no',
      },
    }),
    prisma.advertiser.create({
      data: {
        name: 'Strømleverandør Demo',
        slug: 'stromleverandor-demo',
        websiteUrl: 'https://example.com',
        contactName: 'Demo Kontakt',
        contactEmail: 'demo@stromleverandor.no',
      },
    }),
    prisma.advertiser.create({
      data: {
        name: 'Interiørbutikk Demo',
        slug: 'interiørbutikk-demo',
        websiteUrl: 'https://example.com',
        contactName: 'Demo Kontakt',
        contactEmail: 'demo@interiørbutikk.no',
      },
    }),
    prisma.advertiser.create({
      data: {
        name: 'Treningssenter Demo',
        slug: 'treningssenter-demo',
        websiteUrl: 'https://example.com',
        contactName: 'Demo Kontakt',
        contactEmail: 'demo@treningssenter.no',
      },
    }),
    prisma.advertiser.create({
      data: {
        name: 'Lokal Aktør Demo',
        slug: 'lokal-aktor-demo',
        websiteUrl: 'https://example.com',
        contactName: 'Demo Kontakt',
        contactEmail: 'demo@lokalaktor.no',
      },
    }),
  ])
  console.log('✓ 5 annonsører opprettet')

  // ---- 3. Admin user ----
  await prisma.adminUser.create({
    data: {
      email: 'admin@fordelsklubben.no',
      name: 'Admin',
      role: AdminRole.admin,
    },
  })
  console.log('✓ Admin-bruker opprettet (admin@fordelsklubben.no)')

  // ---- 4. Heroes ----
  const [heroFallback, heroFlytting, heroNaerDeg, heroAppIntro] = await Promise.all([
    prisma.hero.create({
      data: {
        title: 'Alltid noe å oppdage',
        description: 'Utforsk fordeler og kampanjer som gjelder for alle.',
        ctaLabel: 'Se alle fordeler',
        ctaType: CTAType.benefit,
        status: HeroStatus.active,
        priority: 0,
        isFallback: true,
      },
    }),
    prisma.hero.create({
      data: {
        title: 'Nylig flyttet?',
        description: 'Vi har samlet fordeler som kan gjøre det enklere å komme på plass.',
        ctaLabel: 'Se flyttefordeler',
        ctaType: CTAType.category,
        ctaTarget: 'flytting-og-bolig',
        status: HeroStatus.active,
        priority: 10,
        isFallback: false,
      },
    }),
    prisma.hero.create({
      data: {
        title: 'Hva finnes nær deg?',
        description: 'Legg inn postnummer og se om det finnes lokale fordeler i ditt område.',
        ctaLabel: 'Sjekk mitt område',
        ctaType: CTAType.internal_page,
        ctaTarget: '/nearby',
        status: HeroStatus.active,
        priority: 5,
        isFallback: false,
      },
    }),
    prisma.hero.create({
      data: {
        title: 'Fordeler for hjemmet og hverdagen',
        description: 'Utforsk rabattkoder, kampanjer og nyttige tilbud – samlet på mobilen.',
        ctaLabel: 'Se fordeler',
        ctaType: CTAType.benefit,
        status: HeroStatus.active,
        priority: 1,
        isFallback: false,
      },
    }),
  ])
  console.log('✓ 4 heroer opprettet')

  // Targeting for heroes
  await Promise.all([
    // Fallback hero: applies to everyone (no targeting needed — handled by isFallback flag)
    prisma.targetingRule.create({
      data: {
        heroId: heroFallback.id,
        appliesNationally: true,
        includeUnknownLocation: true,
      },
    }),
    // Nylig-flyttet hero: only shown to recently moved users
    prisma.targetingRule.create({
      data: {
        heroId: heroFlytting.id,
        movingStatuses: ['recently_moved'],
        appliesNationally: true,
        includeUnknownLocation: false,
      },
    }),
    // Nær deg hero: everyone (prompts for postcode)
    prisma.targetingRule.create({
      data: {
        heroId: heroNaerDeg.id,
        appliesNationally: true,
        includeUnknownLocation: true,
      },
    }),
    // App-intro hero: everyone
    prisma.targetingRule.create({
      data: {
        heroId: heroAppIntro.id,
        appliesNationally: true,
        includeUnknownLocation: true,
      },
    }),
  ])
  console.log('✓ Hero-targetingregler opprettet')

  // ---- 5. Lead form (must exist before BenefitRedemption for lead benefit) ----
  // Created before benefits that reference it via BenefitRedemption.leadFormId

  // ---- 6. Benefits ----
  const now = new Date()
  const inTwoMonths = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // Benefit 1: Nasjonal generell rabattkode (If Forsikring)
  const b1 = await prisma.benefit.create({
    data: {
      advertiserId: advIf.id,
      categoryId: catForsikring.id,
      title: '20% rabatt på innboforsikring',
      slug: 'if-innbo-20-prosent',
      shortDescription: 'Spar 20% det første året med koden under.',
      longDescription: 'If Forsikring gir deg 20% rabatt på innboforsikring det første forsikringsåret. Perfekt hvis du nylig har flyttet og trenger å sikre boligen din. Koden gjelder ved nytegning på if.no.',
      badgeText: 'Populær',
      status: BenefitStatus.active,
      redemptionType: BenefitRedemptionType.generic_code,
      priority: 20,
      startsAt: now,
      endsAt: inTwoMonths,
      isTimeLimited: true,
      isFeatured: true,
      termsText: 'Gjelder ved nytegning av innboforsikring på if.no. Kan ikke kombineres med andre rabatter.',
      usageInstruction: 'Gå til if.no, velg innboforsikring og skriv inn koden ved betaling.',
    },
  })

  // Benefit 2: Unik kode-fordel (Strømleverandør Demo)
  const b2 = await prisma.benefit.create({
    data: {
      advertiserId: advStrom.id,
      categoryId: catStrom.id,
      title: 'Gratis strømmåler',
      slug: 'stromleverandor-gratis-maler',
      shortDescription: 'Få en gratis strømmåler og spar på strømregningen.',
      longDescription: 'Meld deg over til Strømleverandør Demo og få en gratis strømmåler som hjelper deg å holde oversikt over strømforbruket. Tilbudet gjelder for nye kunder.',
      badgeText: 'Ny',
      status: BenefitStatus.active,
      redemptionType: BenefitRedemptionType.unique_code,
      priority: 15,
      startsAt: now,
      endsAt: inTwoMonths,
      isTimeLimited: true,
      termsText: 'Gjelder kun for nye kunder. Strømmåleren sendes per post innen 14 dager.',
      usageInstruction: 'Hent din unike kode og oppgi den ved bestilling.',
    },
  })

  // Benefit 3: QR-kode-fordel (Interiørbutikk Demo)
  const b3 = await prisma.benefit.create({
    data: {
      advertiserId: advInterior.id,
      categoryId: catInterior.id,
      title: '15% rabatt i butikk',
      slug: 'interiørbutikk-qr-rabatt',
      shortDescription: 'Vis QR-koden i kassen og få 15% på hele kjøpet.',
      longDescription: 'Interiørbutikk Demo tilbyr 15% rabatt på hele kjøpet for Fordelsklubben-medlemmer. Vis bare QR-koden i kassen — gjelder alle varer i butikk.',
      badgeText: 'Butikk',
      status: BenefitStatus.active,
      redemptionType: BenefitRedemptionType.qr_code,
      priority: 12,
      startsAt: now,
      endsAt: inTwoMonths,
      isTimeLimited: true,
      termsText: 'Gjelder i butikk. Kan ikke kombineres med andre tilbud. Ikke gyldig på varer allerede på salg.',
      usageInstruction: 'Vis QR-koden i kassen.',
    },
  })

  // Benefit 4: Leadskjema-fordel (Treningssenter Demo)
  const b4 = await prisma.benefit.create({
    data: {
      advertiserId: advTrening.id,
      categoryId: catTrening.id,
      title: 'Gratis prøvetime på treningssenteret',
      slug: 'treningssenter-gratis-provetime',
      shortDescription: 'Meld interesse og få en gratis prøvetime.',
      longDescription: 'Treningssenter Demo inviterer deg til en gratis prøvetime. Fyll ut skjemaet så kontakter de deg for å avtale tid. Tilbudet gjelder for nye kunder.',
      badgeText: 'Meld interesse',
      status: BenefitStatus.active,
      redemptionType: BenefitRedemptionType.lead_form,
      priority: 8,
      startsAt: now,
      consentText: 'Jeg samtykker til at opplysningene mine deles med Treningssenter Demo, slik at de kan kontakte meg om denne fordelen.',
      termsText: 'Tilbudet gjelder for nye kunder. Treningssenter Demo kontakter deg for å avtale tidspunkt.',
    },
  })

  // Benefit 5: Ekstern lenke-fordel (If Forsikring)
  const b5 = await prisma.benefit.create({
    data: {
      advertiserId: advIf.id,
      categoryId: catForsikring.id,
      title: 'Beregn pris på bilforsikring',
      slug: 'if-bilforsikring-kalkulator',
      shortDescription: 'Sjekk hvor mye du kan spare på bilforsikring.',
      longDescription: 'Bruk If sin prisberegner og se hva din bilforsikring koster. Mange sparer hundrevis av kroner i året ved å bytte.',
      status: BenefitStatus.active,
      redemptionType: BenefitRedemptionType.external_link,
      priority: 5,
      startsAt: now,
      usageInstruction: 'Klikk på lenken og fyll inn bilens registreringsnummer.',
    },
  })

  // Benefit 6: Kun for nylig flyttet (Interiørbutikk Demo)
  const b6 = await prisma.benefit.create({
    data: {
      advertiserId: advInterior.id,
      categoryId: catFlytting.id,
      title: 'Nytter-deg-ha-pakken — 10% på alt',
      slug: 'interiørbutikk-flytterabatt',
      shortDescription: 'Spesialtilbud kun for deg som nylig har flyttet.',
      longDescription: 'Gratulerer med ny bolig! Som nylig innflyttet får du 10% rabatt på alt fra Interiørbutikk Demo. Gjelder i 60 dager fra innflyttingsdato.',
      badgeText: 'For deg som har flyttet',
      status: BenefitStatus.active,
      redemptionType: BenefitRedemptionType.generic_code,
      priority: 25,
      startsAt: now,
      endsAt: inTwoMonths,
      isTimeLimited: true,
      isFeatured: true,
      termsText: 'Gjelder kun for brukere som har registrert at de nylig har flyttet. 10% rabatt på ordinære priser.',
      usageInstruction: 'Bruk koden i nettbutikk eller vis den i kassen.',
    },
  })

  // Benefit 7: Lokalt tilbud (postnummer 0-9999 = alle norske — men targeting_rule begrenser i prod)
  const b7 = await prisma.benefit.create({
    data: {
      advertiserId: advLokal.id,
      categoryId: catLokalt.id,
      title: 'Kaffe og kake gratis',
      slug: 'lokal-aktor-kaffe-kake',
      shortDescription: 'Vis koden og få gratis kaffe og kake hos Lokal Aktør.',
      longDescription: 'Lokal Aktør Demo er stolt av å tilby gratis kaffe og kake til alle Fordelsklubben-medlemmer. Gjelder i utvalgte lokasjoner — sjekk at din enhet er i nærheten.',
      badgeText: 'Nær deg',
      status: BenefitStatus.active,
      redemptionType: BenefitRedemptionType.generic_code,
      priority: 10,
      startsAt: now,
      endsAt: inTwoMonths,
      isTimeLimited: true,
      termsText: 'Gjelder i utvalgte lokasjoner. Én gang per besøk.',
      usageInstruction: 'Vis koden i kassen.',
    },
  })

  // Benefit 8: Utløpt fordel (for testing expired state)
  const b8 = await prisma.benefit.create({
    data: {
      advertiserId: advIf.id,
      categoryId: catForsikring.id,
      title: 'Utløpt testkampanje',
      slug: 'utgatt-testkampanje',
      shortDescription: 'Denne kampanjen er avsluttet.',
      longDescription: 'Denne fordelen er kun for testing av utløpt-tilstand i appen.',
      status: BenefitStatus.expired,
      redemptionType: BenefitRedemptionType.generic_code,
      priority: 0,
      startsAt: new Date('2024-01-01'),
      endsAt: yesterday,
    },
  })
  console.log('✓ 8 fordeler opprettet')

  // ---- 7. Lead form for benefit 4 ----
  const leadForm = await prisma.leadForm.create({
    data: {
      benefitId: b4.id,
      name: 'Prøvetime treningssenter',
      fields: [
        { name: 'name', label: 'Navn', type: 'text', required: true },
        { name: 'email', label: 'E-post', type: 'email', required: true },
        { name: 'phone', label: 'Telefon', type: 'tel', required: false },
        { name: 'postcode', label: 'Postnummer', type: 'text', required: false },
      ],
      consentRequired: true,
    },
  })
  console.log('✓ Leadskjema opprettet')

  // ---- 8. Code pool for benefit 2 ----
  const codePool = await prisma.codePool.create({
    data: {
      benefitId: b2.id,
      name: 'Strømmåler koder',
      totalCodes: 10,
      availableCodes: 10,
      lowStockThreshold: 3,
    },
  })

  // Create 10 unique codes in the pool
  const codeValues = Array.from({ length: 10 }, (_, i) => `STROM${String(i + 1).padStart(3, '0')}`)
  await prisma.code.createMany({
    data: codeValues.map((code) => ({
      codePoolId: codePool.id,
      benefitId: b2.id,
      codeValue: code,
    })),
  })
  console.log('✓ Kodepool med 10 koder opprettet')

  // ---- 9. Benefit Redemptions ----
  await Promise.all([
    // B1: generic_code
    prisma.benefitRedemption.create({
      data: {
        benefitId: b1.id,
        type: BenefitRedemptionType.generic_code,
        genericCode: 'FLYTTE20',
        ctaLabel: 'Vis kode',
        opensInNewTab: false,
      },
    }),
    // B2: unique_code
    prisma.benefitRedemption.create({
      data: {
        benefitId: b2.id,
        type: BenefitRedemptionType.unique_code,
        codePoolId: codePool.id,
        ctaLabel: 'Hent kode',
      },
    }),
    // B3: qr_code
    prisma.benefitRedemption.create({
      data: {
        benefitId: b3.id,
        type: BenefitRedemptionType.qr_code,
        // qrValue is the value encoded in the QR — here a discount code string.
        qrValue: 'INTERIØR15',
        ctaLabel: 'Vis QR-kode',
      },
    }),
    // B4: lead_form
    prisma.benefitRedemption.create({
      data: {
        benefitId: b4.id,
        type: BenefitRedemptionType.lead_form,
        leadFormId: leadForm.id,
        ctaLabel: 'Meld interesse',
      },
    }),
    // B5: external_link
    prisma.benefitRedemption.create({
      data: {
        benefitId: b5.id,
        type: BenefitRedemptionType.external_link,
        externalUrl: 'https://www.if.no/privat/forsikring/bilforsikring',
        ctaLabel: 'Gå til tilbudet',
        opensInNewTab: true,
      },
    }),
    // B6: generic_code (moving segment)
    prisma.benefitRedemption.create({
      data: {
        benefitId: b6.id,
        type: BenefitRedemptionType.generic_code,
        genericCode: 'NYBOLIG10',
        ctaLabel: 'Vis kode',
      },
    }),
    // B7: generic_code (local)
    prisma.benefitRedemption.create({
      data: {
        benefitId: b7.id,
        type: BenefitRedemptionType.generic_code,
        genericCode: 'LOKAL2024',
        ctaLabel: 'Vis kode',
      },
    }),
    // B8: expired (no meaningful redemption)
    prisma.benefitRedemption.create({
      data: {
        benefitId: b8.id,
        type: BenefitRedemptionType.generic_code,
        genericCode: 'UTGATT',
        ctaLabel: 'Vis kode',
      },
    }),
  ])
  console.log('✓ BenefitRedemptions opprettet')

  // ---- 10. Targeting rules for benefits ----
  await Promise.all([
    // B1: national, all segments
    prisma.targetingRule.create({
      data: {
        benefitId: b1.id,
        appliesNationally: true,
        includeUnknownLocation: true,
      },
    }),
    // B2: national, all segments
    prisma.targetingRule.create({
      data: {
        benefitId: b2.id,
        appliesNationally: true,
        includeUnknownLocation: true,
      },
    }),
    // B3: national, all segments
    prisma.targetingRule.create({
      data: {
        benefitId: b3.id,
        appliesNationally: true,
        includeUnknownLocation: true,
      },
    }),
    // B4: national, all segments
    prisma.targetingRule.create({
      data: {
        benefitId: b4.id,
        appliesNationally: true,
        includeUnknownLocation: true,
      },
    }),
    // B5: national, all segments
    prisma.targetingRule.create({
      data: {
        benefitId: b5.id,
        appliesNationally: true,
        includeUnknownLocation: true,
      },
    }),
    // B6: recently_moved only, national
    prisma.targetingRule.create({
      data: {
        benefitId: b6.id,
        movingStatuses: ['recently_moved'],
        appliesNationally: true,
        includeUnknownLocation: false,
      },
    }),
    // B7: postcodes 0150-0199 (demo Oslo sentrum area)
    prisma.targetingRule.create({
      data: {
        benefitId: b7.id,
        postcodeRanges: [{ from: '0150', to: '0199' }],
        appliesNationally: false,
        includeUnknownLocation: false,
      },
    }),
  ])
  console.log('✓ Targeting-regler for fordeler opprettet')

  console.log('\n✅ Seed fullført!')
  console.log('   Kategorier: 9')
  console.log('   Annonsører: 5')
  console.log('   Heroer: 4')
  console.log('   Fordeler: 8 (inkl. 1 utløpt)')
  console.log('   Admin-bruker: admin@fordelsklubben.no')
}

main()
  .catch((e) => {
    console.error('Seed feilet:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
