# CR-022: Treet Page, Fordel, Product (backend for web-løpet)

Status: Done (committed 0d31820, pushet, deployet, prod-sjekk OK av bruker 2026-10-12, /review PASSED). Seed ikke kjørt
Created: 2026-10-12
Approved: 2026-10-12

## Business Goal
Bygge den direkte kjeden **Page → Fordel → Product** som beslutning 2 i
docs/10 krever, slik at web-løpet (Flyttefordel) kan leses fra samme modell
som appen, uten Endpoint, Container og TemplateOffer. Dette er første steg mot
web-løpet. Bestilling (CR-023) og web-UI (CR-024) bygger på dette.

## Problem Statement
Prototypen har ingen sider (rekkefølge av kategorier i løpet) og ingen
produkter. Kunden og prisene ligger på fordelen, og «flere produktvalg på samme
kort» (docs/09 §2, lokalavis med to knapper) kan ikke uttrykkes. Det finnes
heller ingen smal lesemodell for et løp med sider, kort og valg (docs/09 §4
funn 1: dagens FF API returnerer databaseentiteter).

## Proposed Solution

### Modell (additiv)
- **`FlowPage`** (Page i docs): `name`, `text`, `imageUrl`, `imageAlt`,
  `sortOrder`, `isActive`, soft delete. Rekkefølgen er data (docs/10 §7.1).
  Kalt `FlowPage` i kode for å unngå forveksling med Next.js sider.
- **`Product`**: **eid av fordelen** (`benefitId`), ingen koblingstabell.
  Felter: `name`, `text?`, `priceText?` (fritekst som vises, for eksempel
  «199 kr/mnd», ingen priselogikk), `sortOrder`, `isActive`, soft delete.
  TemplateOffers felter (navn, tekst, pris per valg) ligger rett på produktet
  (docs/12 spm. 4). Flere produkter på samme fordel gir flere valg på kortet.
  Kunden er fordelens `Advertiser`.
- **Placering på web hører til web-visningen** (docs/10 §3.2). `BenefitView`
  får `pageId?` og `sortOrder` (default 0). Nytt format **`web_card`** i
  format-registeret fra CR-021, med samme overstyrbare felt som `app_card`.
  Placeringen leses **kun fra `standard`-raden** for `web_card`. `pageId` og
  `sortOrder` på andre varianter ignoreres, slik at en A/B-variant av innhold
  ikke flytter fordelen.

### Lesemodell
`getWebFlow(session)` i `src/lib/queries/flowQueries.ts` returnerer en liste
av sider med kort, som **smale visningsmodeller** (aldri Prisma-objekter):

```
FlowPage { id, name, text, imageUrl, imageAlt,
  cards: [{ benefitId, slug, title, text, imageUrl, imageAlt, badgeText,
            termsText, advertiser: { name, logoUrl },
            products: [{ id, name, text, priceText }] }] }
```
Regler:
1. Kun aktive sider (`isActive`, ikke slettet), sortert på `sortOrder`.
2. Et kort er en fordel som er **live** (status `active`, ikke slettet, innenfor
   `startsAt`/`endsAt`) og har en `web_card`-standardrad med `pageId` til siden,
   sortert på radens `sortOrder`.
3. Kortinnhold løses med `resolveBenefitView(..., 'web_card')`. Frontend kjenner
   ikke arv eller varianter.
4. Targeting: `matchesSession()` brukes som i dag. Fordeler som ikke passer
   personen utelates.
5. Produkter: kun `isActive` og ikke slettet, sortert på `sortOrder`.
   En fordel uten produkter beholdes som kort med `products: []` (UI avgjør).
6. **En side uten synlige kort utelates** (docs/09 §2: sider kan hoppes over).
7. Ingen interne felter lekker (ingen `internalNotes`, priser, kontaktfelt,
   `consentText` eller targeting).

### Seed
Valgfritt seed-skript `prisma/seed-web-flow.ts` (`npm run db:seed-flow`),
idempotent, **kjøres aldri automatisk**. Oppretter noen sider og demo-fordeler
med åpenbart fiktive navn (prefiks `demo-` på slug), `web_card`-rader og
produkter, slik at lesemodellen og senere UI kan vises. Kjøres manuelt av den
som ønsker demo-data.

### Utenfor scope (egne CR-er)
- Bestilling, ordre og samtykker (CR-023).
- Web-UI, innlogging og bekreftelsesside (CR-024).
- Admin-UI for sider, produkter og visninger. Inntil videre opprettes data via
  seed eller direkte i databasen.
- Leveringsmåte (e-post, SMS, telefon, befaring) på fordelen.
- If-komponent, postkasseskilt, puff.
- Leadpris per produkt: fakturering ligger fortsatt på `Benefit`
  (`pricePerLead` m.fl., CR-010). Ingen `articleId` eller kobling til kundens
  leads-API ennå.
- Flere plasseringer per fordel i samme kanal (docs/12 spm. 1).

## Impact Analysis

Affected Specs:
- [x] specs/entities.md (FlowPage, Product, BenefitView.page_id/sort_order)
- [x] specs/api.yaml (ingen HTTP-endepunkt, lesemodellen brukes server-side)
- [x] specs/flows.md (web-løpets lesemodell og regler, hvis seksjon passer)
- [x] specs/architecture.md (`/lib/queries`-notat, `/lib/views` med `web_card`)
- [x] specs/nfr.md
- [x] specs/ui-spec.md

Affected Components:
- `prisma/schema.prisma` (FlowPage, Product, `BenefitView.pageId/sortOrder`) og
  ny migrasjon
- `src/lib/views/formats.ts` (nytt format `web_card`)
- Ny `src/lib/queries/flowQueries.ts`, nye typer i `src/types/app.ts`
  (`WebFlowPage`, `WebFlowCard`, `WebFlowProduct`)
- Nytt `prisma/seed-web-flow.ts` og script i `package.json`
- Eksisterende app-kode berøres ikke

Database Impact: Nye tabeller `flow_pages` og `products`. `benefit_views` får
`page_id` (nullable, FK til `flow_pages`, ingen kaskade) og `sort_order`
(default 0), pluss indeks på `page_id`. Additiv, tom etter migrasjon, ingen
bakfylling.

API Impact: Ingen. `getWebFlow` er en server-side spørring.

UX Impact: Ingen synlig endring. Ingen ny side i dette steget.

Security Impact: Ingen ny inngang og ingen skrivevei i appen. Lesemodellen
returnerer en eksplisitt avgrenset felt-liste (regel 7), testet.

Performance Impact: Én nested spørring (sider med views, fordeler,
produkter, targeting), Prisma batcher den. Forventet volum er titalls sider og
under 500 fordeler.

## Acceptance Criteria
- [x] Migrasjonen er additiv, og eksisterende tabeller og app-atferd er uendret
- [x] `web_card` finnes i format-registeret, og `app_card` er uendret
- [x] `getWebFlow` returnerer sider i `sortOrder` og kort i radens `sortOrder`
- [x] Inaktive, slettede og tomme sider utelates
- [x] Kun live fordeler vises (status, slettet, periode)
- [x] Targeting utelater fordeler som ikke passer sesjonen
- [x] Kortinnhold løses via `resolveBenefitView` med `web_card`-overstyring
- [x] Placering leses kun fra `standard`-raden, ikke fra varianter
- [x] Inaktive og slettede produkter utelates, rekkefølge følger `sortOrder`
- [x] Fordel uten produkter gir kort med `products: []`
- [x] Lesemodellen inneholder ingen interne felter
- [x] Seed-skriptet er idempotent og kjøres ikke automatisk
- [x] `specs/entities.md`, `specs/flows.md` og `specs/architecture.md` er
      oppdatert før kode
- [x] `npx tsc --noEmit`, `npx vitest run`, `npm run lint` og
      `npm run build` er grønne

## Required Tests
- [x] Unit: format-registeret (`web_card`, ukjent format avvises)
- [x] Unit: ren funksjon for live-sjekk av fordel (status, slettet, periode,
      grenseverdier)
- [x] Integration: `getWebFlow` med mocket Prisma, alle regler 1 til 7 i
      lesemodellen, inkludert at ingen interne felter lekker
- [x] Manuell: migrasjonen er gått gjennom i prod etter deploy, og appen
      virker som før (ingen lokal `DATABASE_URL`, se Risks)

## Rollback Strategy
Revert commit. Tabellene og kolonnene er nye og ubrukte av eksisterende kode, så
gammel kode virker mot det nye skjemaet. Skal de fjernes, kjøres en migrasjon
som dropper dem (ingen data å tape så lenge seed ikke er kjørt).

## Migration Strategy
Én additiv Prisma-migrasjon, deployes på `master`. Coolify kjører
`prisma migrate deploy` før oppstart. Ingen bakfylling, seed er manuell.

## Risks
- **Ingen lokal `DATABASE_URL`.** Migrasjonen verifiseres med
  `prisma migrate diff` og i prod etter deploy (som CR-020 og CR-021).
- **Tom modell i prod.** Uten admin-UI er det ingen vei å fylle sider og
  produkter, bortsett fra seed eller direkte SQL. Lesemodellen kan derfor kun
  vises i prod etter manuell seed. Admin-UI må komme før reell bruk.
- **Demo-data i appen.** Seed oppretter vanlige aktive fordeler, og appens
  lister filtrerer ikke på `visibility`, så demo-fordeler vises også i
  mobilappen. Seed kjøres derfor bare manuelt og bevisst, ikke mot en
  database med ekte brukere uten at det er ønsket.
- **Kanal-tilstedeværelse er skjev.** Web-plassering er eksplisitt (rad med
  `pageId`), mens appvisning er implisitt for alle aktive fordeler (arv uten
  rad). En fordel som bare skal vises på web, vises derfor også i appen. Dette
  er et reelt modellspørsmål (docs/10: «en fordel vises der den har en
  visning») som ikke løses her. Må avklares senest i admin-CR-en.
- **Eierskap til produkt.** Produkter deles ikke mellom fordeler. Hvis samme
  produkt trengs på flere fordeler, må det kopieres, eller modellen endres
  senere. Bekreftet av bruker for denne runden.

## Antakelser (docs/12: merkes tydelig)
- **Prototypens rolle (docs/12 spm. 15):** bruker bekreftet 2026-10-12 at det er greit å simulere nå og justere senere. Standarden, altså ny backend i dette
  repoet med simulerte integrasjoner, antas. Brukerens svar på «klikkbar demo
  eller reelt grunnlag» er ikke gitt, så det er ikke avgjort hvor mye
  feilhåndtering og integrasjon som bygges. Dette steget er uavhengig av
  valget.
- Page er egen entitet med tekst og bilde (bekreftet av bruker), ikke bare en
  kategori i en rekkefølge.
- Product eies av fordelen (bekreftet av bruker).
- `priceText` er fritekst uten priselogikk, siden prisformat og beregning ikke
  er avklart.
- Hver fordel har høyst én web-plassering (docs/12 spm. 1 uavklart).
- Appens lister endres ikke. `visibility` ignoreres som i dag.
- Sletting av en side eller et produkt er soft delete (som `Benefit`), siden
  senere ordrelinjer vil referere dem.

## Dependencies
Bygger på CR-021 (`BenefitView`, format-register, resolver). Åpner for
CR-023 (bestilling) og CR-024 (web-UI), og for admin-UI for sider, produkter og
visninger.

## Implementation Notes (2026-10-12)
- Bruker bekreftet at det er greit å simulere nå og justere senere (antakelsen
  om prototypens rolle står derfor ved lag).
- Nytt: `FlowPage` og `Product` i schema, `BenefitView.pageId/sortOrder`,
  migrasjon `20261012200000_cr022_flow_tree` (SQL fra `prisma migrate diff`,
  ikke kjørt mot DB), format `web_card`, `isBenefitLive` (ren, i
  `/lib/benefits`), `getWebFlow` i `src/lib/queries/flowQueries.ts`, typene
  `WebFlowPage/Card/Product`, og `prisma/seed-web-flow.ts` med
  `npm run db:seed-flow` (aldri automatisk).
- FK fra `BenefitView.pageId` til `FlowPage` er `ON DELETE RESTRICT` (Prisma sin
  standard for valgfri relasjon er SET NULL, satt eksplisitt til Restrict for å
  matche CR-teksten om ingen kaskade).
- `prisma format` ble kjørt ved et uhell og omformaterte hele skjemaet. Det ble
  rullet tilbake, og skjemaendringen er kun de 44 tiltenkte linjene.
- `getWebFlow` henter bare views med `web_card` og `standard`, og løser kortet
  fra den raden. Fordeler uten slik rad med `pageId` vises ikke i løpet.
- Ingen HTTP-endepunkt og ingen UI. `api.yaml` er uendret.
- Seed er ikke kjørt (ingen DB). Skriptet bruker `info_only` og `active`, og
  går utenom admin-API-ets write-validering (CR-017).
- Validering: tsc OK, lint 0 feil (3 gamle advarsler), vitest 203/203 (opp fra
  187, 16 nye), build OK.
- Gjenstår: `/review`, commit, deploy, og sjekk i prod at migrasjonen gikk
  gjennom og at appen virker som før.

## Etterskrift (2026-10-12)
- Bruker bekreftet at `npm run db:seed-flow` er kjørt mot en database og fungerte. Det
  verifiserer at tabellene fra migrasjonene finnes og at skriptet (transaksjon, nested
  creates, targeting-regel) går gjennom. Idempotens ved gjentatt kjøring og at
  `getWebFlow` returnerer riktig innhold er ikke eksplisitt bekreftet.
