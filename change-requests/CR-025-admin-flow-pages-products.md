# CR-025: Admin for sider, produkter og web-plassering

Status: Implementert (ikke committed, ikke /review, admin-UI ikke sett i nettleser, migrasjon ikke kjørt mot DB)
Created: 2026-10-12
Approved: 2026-10-12

## Business Goal
Gjøre det mulig å fylle web-løpet fra admin, uten seed-skript eller SQL: lage sider,
legge produkter på fordeler og plassere en fordel på en side i løpet. Dette er første
av to steg for admin rundt visninger (docs/10 §8). Innholdsoverstyringer per flate
(tittel, tekst, bilde) kommer i CR-026.

## Problem Statement
CR-022 til CR-024 leverte modellen, løpet og bestillingen, men det finnes ingen måte å
opprette `FlowPage`, `Product` eller web-plassering (`BenefitView` med `pageId`) i admin.
Treet kan bare fylles med seed eller direkte i databasen. I tillegg er kanalpresens
skjev (CR-022 Risks): web-plassering er eksplisitt, men appvisning er implisitt for alle
aktive fordeler, så en fordel som bare skal være på web vises også i mobilappen. Seed-dataene
fra CR-022 og CR-023 viser seg i appen av samme grunn.

## Proposed Solution

### 1. Sider (`FlowPage`), ny admin-seksjon `/admin/flow-pages`
- Liste: navn, aktiv, rekkefølge og antall plasserte fordeler. Advarsel på en side som er
  inaktiv eller tom (den utelates fra løpet).
- Opprett og rediger: navn, tekst, bilde (gjenbruker `ImageUploadField`, CR-012), alt-tekst,
  `sortOrder` (tall) og `isActive`. Skjemaet følger `CategoryForm` med `useDirtyTracking`
  og `FormSaveBar` (CR-013, CR-019).
- Slett er **soft delete** (`deletedAt`), som for `Benefit`. Plasseringer på en slettet side
  blir stående, men siden og kortene utelates fra løpet (finnes allerede i `getWebFlow`).
- Ny meny «Sider» i `AdminSidebar`.

### 2. Produkter på en fordel, seksjon på rediger fordel-siden
- Liste over fordelens produkter, og legg til, rediger, deaktiver og slett (soft delete):
  `name` (påkrevd), `text`, `priceText` (fritekst), `sortOrder`, `isActive`.
- Egen seksjon under `BenefitForm`, **ikke** en del av hovedskjemaet. Hver rad lagres
  eksplisitt med egen knapp. `BenefitForm` (437 linjer) endres ikke.

### 3. Web-plassering på en fordel (`BenefitView` `web_card`/`standard`)
- Seksjon «Web-løpet» på rediger fordel: velg side (eller «Ikke i løpet») og `sortOrder`.
  Lagring oppretter eller oppdaterer raden, «Ikke i løpet» fjerner `pageId` (raden og
  eventuelle overstyringer fra CR-026 beholdes).
- Viser **hvorfor** fordelen ikke vises i løpet, med en ren funksjon
  `getWebPlacementProblems`: fordelen er ikke live, siden er inaktiv eller slettet, fordelen
  har ingen aktive produkter (vises som ren informasjon), eller postnummer-targeting
  begrenser den.
- Overstyring av innhold på `web_card` og `app_card` er **ikke** med her (CR-026).

### 4. Kanalpresens: «Vis i appen» (`Benefit.showInApp`)
- Ny boolsk kolonne `show_in_app`, **default `true`**, så all eksisterende atferd er uendret.
- Avkrysning «Vis i appen» på rediger fordel. Appens lister og «I nærheten» og «Lagret»
  utelater fordeler med `showInApp = false`. Detaljsiden og direktelenker påvirkes ikke
  (egen vurdering, se Risks).
- Løser at en web-only fordel (og seed-data) ellers dukker opp i mobilappen. Se åpent
  punkt 1.

### API (alle med admin-auth per rute, som resten av `/api/admin/*`)
- `GET/POST /api/admin/flow-pages`, `GET/PATCH/DELETE /api/admin/flow-pages/[id]`
- `GET/POST /api/admin/benefits/[id]/products`,
  `PATCH/DELETE /api/admin/benefits/[id]/products/[productId]`
- `PUT /api/admin/benefits/[id]/web-placement` (`{ pageId: uuid | null, sortOrder }`)
- `PATCH /api/admin/benefits/[id]` utvides med `showInApp`
- Alle med zod, 401 uten innlogging, 404 ved ukjent id, `try/catch` med JSON-feil, og
  ingen persondata å logge.

### Utenfor scope (CR-026 og senere)
- Overstyring av tittel, tekst, bilde og merketekst per flate, forhåndsvisning, varianter og
  A/B. **Lagret-siden bruker fortsatt kjerneinnhold** (kjent hull fra CR-021), tas i CR-026
  sammen med overstyringene.
- Dra-og-slipp for rekkefølge (tall i dette steget).
- Ordreadmin og lead-eksport med kontaktfelt (egen CR).
- Endring av hvordan `Hero` og `app_hero` virker.

## Impact Analysis

Affected Specs:
- [x] specs/entities.md (`Benefit.show_in_app`)
- [x] specs/api.yaml (de nye admin-rutene)
- [x] specs/flows.md (web-plassering og «Vis i appen»)
- [x] specs/architecture.md (`/app/admin` nye seksjoner, `/lib/admin` hjelpere)
- [ ] specs/nfr.md
- [ ] specs/ui-spec.md (tom fra før)

Affected Components:
- `prisma/schema.prisma` (`Benefit.showInApp`) og ny migrasjon
- Nye `src/app/admin/(protected)/flow-pages/` (liste, ny, rediger, skjema)
- Nye admin-seksjoner for produkter og web-plassering under `benefits/[id]`
- Nye `src/app/api/admin/flow-pages/**`, `benefits/[id]/products/**`,
  `benefits/[id]/web-placement`, utvidet `benefits/[id]` (PATCH)
- Nye `src/lib/admin/` hjelpere (`getWebPlacementProblems`) og spørringer i
  `adminQueries.ts`
- `AdminSidebar.tsx` (ny meny)
- `src/lib/queries/benefitQueries.ts`, `savedQueries.ts`, og «I nærheten»-spørringen
  (filter på `showInApp`)

Database Impact: Én ny kolonne `benefits.show_in_app` (boolean, default true, NOT NULL).
Additiv migrasjon, ingen bakfylling. Ellers ingen skjemaendring (alle andre tabeller
finnes fra CR-022).

API Impact: Nye admin-endepunkter (se over). Ingen endring i offentlige endepunkter.
Appens spørringer får ett ekstra filter.

UX Impact: Ny admin-seksjon og to nye seksjoner på rediger fordel. Mobilappen endres
bare for fordeler der `showInApp` slås av.

Security Impact: Alle nye skriveruter krever admin-JWT (cookie), sjekket i hver rute som i
dag (middleware beskytter ikke `/api/admin`, se `src/middleware.ts`). Zod på all input,
lengdegrenser, bilde-URL fra opplastingen (CR-012). Ingen offentlige skriveveier. Enhetstest
for 401 på hver rute.

Performance Impact: Ubetydelig. Ett ekstra boolsk filter, og noen nye admin-spørringer.

## Acceptance Criteria
- [ ] Admin kan opprette, redigere, deaktivere og slette (soft) en side, og endringen
      synes i `/flytting` (aktive sider med kort)
- [ ] Admin kan legge til, redigere, deaktivere og slette (soft) produkter på en fordel
- [ ] Admin kan plassere en fordel på en side med rekkefølge, og fjerne plasseringen
- [ ] Seksjonen «Web-løpet» forklarer hvorfor en fordel ikke vises (ikke live, side
      inaktiv eller slettet, ingen aktive produkter, targeting)
- [x] «Vis i appen» av utelater fordelen fra appens lister, «I nærheten» og «Lagret», og
      default (på) gir uendret atferd
- [x] Alle nye API-ruter gir 401 uten admin-cookie og 404 ved ukjent id, og validerer input
- [x] Soft-slettede sider og produkter vises ikke i løpet og ikke i listene som standard
- [ ] Skjemaet for sider bruker dirty-tracking og «Lagret»-indikator som øvrige admin-skjemaer
- [x] Eksisterende admin-skjemaer og `BenefitForm` er uendret
- [x] `specs/entities.md`, `specs/api.yaml`, `specs/flows.md` og `specs/architecture.md` er
      oppdatert før kode
- [x] `npx tsc --noEmit`, `npx vitest run`, `npm run lint` og `npm run build` er grønne

## Required Tests
- [x] Unit: `getWebPlacementProblems` (alle årsaker, ingen problemer)
- [x] Integration (route-tester med mocket Prisma, som `categories/route.test.ts`): 401,
      400, 404, 409 der aktuelt, og suksess for hver ny rute
- [x] Integration: `benefitQueries`, `savedQueries` og «I nærheten» filtrerer på
      `showInApp`, og default er uendret
- [ ] Manuell i nettleser: fylle løpet fra bunnen i admin (side, produkter, plassering),
      verifisere `/flytting`, slå av «Vis i appen» og se at appen ikke viser fordelen

## Rollback Strategy
Revert commit. `show_in_app` har default true, så gammel kode virker mot det nye skjemaet.
Sider, produkter og plasseringer opprettet via admin blir stående og er ufarlige (leses bare
av `getWebFlow`).

## Migration Strategy
Én additiv Prisma-migrasjon, deployes på `master`. Coolify kjører `prisma migrate deploy`
før oppstart. Ingen bakfylling.

## Risks
- **Ingen lokal `DATABASE_URL`.** Migrasjon og alle admin-skriveflyter er bare testet med
  mocket Prisma. Verifiseres manuelt i admin etter deploy.
- **To lagringsmåter på samme side.** Hovedskjemaet (`BenefitForm`) lagres som før, mens
  produkter og web-plassering har egne knapper. Brukeren kan tro at «Lagre» på toppen
  tar med alt. Må gjøres tydelig i UI, og bør vurderes samlet i en senere opprydding.
- **`showInApp` rører appens spørringer** (liste, nærheten, lagret). Detaljsiden og
  direktelenker (`/benefits/[slug]`) filtreres ikke, så en skjult fordel kan fortsatt
  nås via lenke. Bevisst: lagrede og delte lenker skal ikke gi 404. Avklares i åpent punkt 1.
- **Eksisterende demo-fordeler fra seed** har `showInApp = true` og vises fortsatt i appen
  til noen slår dem av i admin (eller seed oppdateres, se åpent punkt 1).
- **Rekkefølge med tall** er uvant (ingen dra-og-slipp), og to like tall gir
  uforutsigbar rekkefølge mellom dem (sekundært etter `createdAt`, som i `getWebFlow`).
- **Slettede sider med plasseringer** blir stående som døde rader. Vises som advarsel i
  admin, ikke ryddet automatisk.
- **Stor CR.** Tre admin-flater, fem nye ruter og en endring i appens spørringer. Kan deles
  i (a) sider og produkter og (b) web-plassering og «Vis i appen» hvis det blir uhåndterlig.
- **UI er kun manuelt testet** (ingen komponenttester).
- **Hardkodede tekster i admin** (norske etiketter i komponenter) følger eksisterende
  admin-mønster. `ui-spec.md` er tom, så det finnes ingen spesifikasjon å matche.

## Antakelser (docs/12: merkes tydelig)
- Hver fordel har høyst én web-plassering (docs/12 spm. 1 uavklart), som i CR-022.
- Soft delete for sider og produkter, siden ordrelinjer refererer dem (CR-024).
- Bilder til sider lastes opp via eksisterende `ImageUploadField` til samme bucket.
- Rekkefølge settes med tall (`sortOrder`), ikke dra-og-slipp.
- `showInApp` er en enkel boolsk, ikke en generell kanalmodell. Når e-post og flere flater
  kommer, kan den erstattes av en mer generell mekanisme (docs/10: «en fordel vises der
  den har en visning»).
- Brukeren har ikke sagt hvilke admin-roller som skal få tilgang. Alle admin-brukere
  (delt passord) kan alt, som i dag.

## Avklarte punkter (bruker, 2026-10-12)
1. **Vis i appen:** med. Svaret var «ja på alt» på et spørsmål med to deler. Tolket som at showInApp bygges, og at seed IKKE endres (demo-fordelene ligger allerede i databasen, så en endret seed ville ikke hatt effekt). De slås av for hånd i admin.
2. **Deling:** greit at dette er første av to CR-er (CR-026 tar innholdsoverstyringer, forhåndsvisning og lagret-siden).
3. **Rekkefølge:** tall (sortOrder) er greit nå.

## Dependencies
Bygger på CR-022 (modellen), CR-024 (produkter refereres av ordrelinjer, derfor soft
delete), CR-012 (bildeopplasting), CR-013 og CR-019 (dirty-tracking). Åpner for CR-026
(visningsoverstyringer, forhåndsvisning, lagret-siden) og senere A/B.

## Implementation Notes (2026-10-12)
- Bruker godkjente alle punkter ("ja på alt"). Punkt 1 hadde to deler (bygge `showInApp`, og
  om seed skal endres). Tolket som: `showInApp` bygges, seed endres IKKE (demo-fordelene
  ligger allerede i databasen, så en endret seed ville ikke hatt effekt). De slås av for hånd
  i admin.
- Nytt: `Benefit.showInApp` (migrasjon `20261012400000_cr025_show_in_app`, additiv, default
  true, ikke kjørt mot DB). Appens liste (`getActiveBenefits`, brukt av forsiden, `/benefits`
  og `/nearby`) og lagret-listen filtrerer på den. Detaljsiden og direktelenker gjør ikke det.
- Nye admin-ruter (alle med `authCheck` fra ny `src/lib/admin/apiAuth.ts`, zod i
  `flowSchemas.ts`, 401/404/400, JSON-feil): `/api/admin/flow-pages` (+ `[id]`),
  `/api/admin/benefits/[id]/products` (+ `[productId]`) og `/api/admin/benefits/[id]/web-placement`.
  `PATCH /api/admin/benefits/[id]` tar imot `showInApp`.
- Produkt-ruten slår opp produktet innenfor fordelen i URL-en (en fordels id kan ikke brukes
  til å endre en annens produkt), og `benefitId` kan ikke settes via body. Testet.
- Web-plassering: «Ikke i løpet» beholder raden og nuller `pageId`. Finnes ingen rad og
  `pageId` er null, opprettes ingen tom rad.
- UI: `/admin/flow-pages` (liste, ny, rediger, slett) følger `CategoryForm` med dirty-tracking
  og `FormSaveBar`. På rediger fordel er det to nye seksjoner under `BenefitForm`:
  «Produkter» (egen lagre-knapp per rad) og «Kanaler» (web-plassering og «Vis i appen», hver
  med egen knapp). `BenefitForm` er uendret. Ny meny «Sider» i sidebaren.
- Seksjonen viser hvorfor fordelen ikke vises i løpet (`getWebPlacementProblems`, ren
  funksjon i `/lib/benefits`). `hasTargeting` er satt til «har targeting og gjelder ikke
  nasjonalt», for å speile `matchesSession`.
- **Kjent konsekvens:** «Vis i appen» lagres via `PATCH /api/admin/benefits/[id]`, som også
  kjører CR-017-sjekken. For en allerede aktiv fordel som mangler påkrevd innhold ("feilet")
  vil lagringen bli avvist med forklaringen fra CR-017, helt til fordelen er rettet.
- Validering: tsc OK, lint 0 feil (3 gamle advarsler), vitest 355/355 (opp fra 303, 52 nye),
  build OK (alle nye ruter vises i build-output).
- **Ikke gjort:** admin-UI-et er ikke sett i nettleser og ikke kjørt mot en database. UI-
  kriteriene (opprett/rediger/slett side, produkter, plassering, forklaringer, dirty-
  tracking) står derfor uavkrysset. Migrasjonen og alle skriveflyter er bare testet med
  mocket Prisma.
- Gjenstår: `/review`, commit, deploy (migrasjonen kjører ved oppstart), og manuell test i
  admin: lag en side, legg produkter på en fordel, plasser den, se `/flytting`, slå av «Vis i
  appen» og sjekk at appen ikke viser fordelen.

## Review-funn (2026-10-12)
- Alle 10 nye handlere sjekker admin-auth (verifisert: 10 handlere, 10 `authCheck`), og alle
  har test for 401. Ingen `any`, ingen forbudte imports, ingen hardkodede farger i nye filer.
- Ingen endringer i admin logges (`AuditLog` finnes i `specs/entities.md` men brukes ikke
  noe sted, heller ikke av eldre admin-ruter). Eksisterende mangel, ikke løst her.
- Admin-cookie har `httpOnly` og `sameSite: lax`, men ikke `secure` satt eksplisitt
  (eksisterende, `src/app/api/admin/auth/login/route.ts`). Rutene parser JSON uavhengig av
  Content-Type, så beskyttelsen mot kryss-side-POST hviler på `sameSite: lax`.
- `console.error` i de nye rutene logger hele feilobjektet. Her er det adminstyrt innhold
  (ikke persondata), men mønsteret er det samme som i eldre ruter.
