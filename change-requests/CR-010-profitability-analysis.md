# CR-010: Lønnsomhetsanalyse

Status: Approved
Created: 2026-05-22

## Business Goal
Gi admin full oversikt over lønnsomhet per fordel, per annonsør og per annonseType —
slik at man kan ta datadrevne beslutninger om prising og innholdsstrategi.

## Problem Statement
Ingen steder i admin er det mulig å se hva en kampanje faktisk genererer i inntekt.
Alle relevante events trackes nå (views, leads, redemptions), men inntektsdata mangler helt.
Det er heller ingen oversikt over hvilke annonsører eller annonsetyper som er mest lønnsomme.

## Proposed Solution

### 1. Økonomifelter på Benefit-nivå
Fire valgfrie prisfelter på `Benefit`:
- `campaignFee` — fast kampanjepris (NOK)
- `pricePerView` — pris per visning (CPV)
- `pricePerLead` — pris per generert lead
- `pricePerRedemption` — pris per innløst kode/klikk

Inntekt per fordel = `campaignFee + views×pricePerView + leads×pricePerLead + redemptions×pricePerRedemption`

### 2. Admin BenefitForm — prisseksjon
Nytt "Økonomi"-avsnitt i fordel-skjemaet med de 4 feltene.

### 3. Ny admin-side: /admin/profitability
Tre seksjoner:
- **Per fordel** — utvider analytics-tabellen med inntekt og margin
- **Per annonsør** — aggregert inntekt, antall kampanjer, snitt-CPL og snitt-CPV
- **Per annonseType** — hvilken redemptionType gir høyest inntekt og best konvertering

### 4. Per-sluttbruker (konsument) LTV
Estimert LTV per sesjon basert på sessions med events:
`LTV = views×pricePerView_snitt + leads×pricePerLead_snitt + redemptions×pricePerRedemption_snitt`
Vises som histogram/tabell i profitability-siden.

## Impact Analysis

Affected Specs:
- [x] specs/entities.md — Benefit-modellen: 4 nye Decimal-felter
- [ ] specs/api.yaml
- [ ] specs/flows.md
- [ ] specs/architecture.md
- [ ] specs/nfr.md
- [ ] specs/ui-spec.md

Affected Components:
- `prisma/schema.prisma` — Benefit: 4 nye Decimal?-felter
- `src/types/admin.ts` — AdminBenefitDetail oppdatert, nye typer for profitability
- `src/lib/queries/adminQueries.ts` — getAnalytics oppdatert, getProfitabilityData ny
- `src/app/api/admin/benefits/route.ts` + `[id]/route.ts` — prisfelter i validering og skriv
- `src/app/admin/(protected)/benefits/BenefitForm.tsx` — Økonomi-seksjon
- `src/app/admin/(protected)/profitability/` — ny side med 3 tabs/seksjoner

Database Impact:
- 4 nye nullable Decimal-kolonner på `benefits`-tabellen
- `prisma db push` — ingen destruktiv endring, alle nullable

API Impact:
- POST/PATCH `/api/admin/benefits` — nye valgfrie prisfelter
- Ingen breaking changes — felter er nullable med default null

UX Impact:
- Ny "Økonomi"-seksjon i BenefitForm (kun synlig for admin)
- Ny "Lønnsomhet"-side i sidebar
- Analytics-tabellen viser inntekt-kolonne der prisfelter er satt

Security Impact:
- Prisfelter er kun synlig og redigerbare bak admin JWT — aldri eksponert i consumer API

Performance Impact:
- getProfitabilityData gjør 3 aggregerte queries (benefit, advertiser, type-nivå)
- Ingen N+1 — groupBy og aggregering i Prisma

## Acceptance Criteria
- [x] 4 prisfelter på Benefit-modellen, db push kjørt
- [x] BenefitForm har Økonomi-seksjon med de 4 feltene
- [x] POST/PATCH benefits persisterer prisfelter
- [x] /admin/profitability viser per-fordel, per-annonsør og per-type analyse
- [x] Per-fordel: inntekt beregnet korrekt som sum av faste + variable komponenter
- [x] Per-annonsør: aggregert inntekt, kampanjetall, snitt-CPL
- [x] Per-annonseType: inntekt og konverteringsrate per type
- [x] LTV-estimat per sesjon vist i per-sluttbruker-seksjon
- [x] Nullverdier vises som «—» (ikke 0) der prisfelter ikke er satt

## Required Tests
- [x] Unit: inntektsberegning — alle kombinasjoner av fast + variable
- [x] Unit: LTV-beregning — tom sesjon gir 0, kombinert sesjon gir riktig sum
- [x] Unit: per-annonsør aggregering — summerer riktig på tvers av benefits

## Rollback Strategy
Fjern de 4 Decimal-kolonnene fra schema og push — nullable kolonner, ingen datarisiko.

## Migration Strategy
`prisma db push` — additive, alle felter nullable.

## Risks
- Prisdata er selvrapportert av admin — ingen validering mot faktiske fakturaer
- LTV-estimat er approksimativt (basert på snitt-priser, ikke per-benefit-priser per sesjon)

## Dependencies
- CR-008 (analytics-infrastruktur gjenbrukes)
- CR-009 (tracking komplett — alle events fyres nå)
