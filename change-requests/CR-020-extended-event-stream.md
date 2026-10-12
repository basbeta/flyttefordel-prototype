# CR-020: Utvidet hendelsesstrøm

Status: Implementert (ikke committed, ikke /review, migrasjon ikke kjørt mot DB)
Created: 2026-10-12
Approved: 2026-10-12 (åpne punkt 1-3 besvart ja av bruker)

## Business Goal
Gjøre `BenefitEvent` til den felles hendelsesstrømmen som målbildet
(docs/10, seksjon 6) bygger på. Samme strøm skal kunne brukes av web, app og
e-post, og skal kunne merkes med kanal, visning og A/B-test. Over halvparten
av de 24 tiltakene (docs/11, seksjon 2) avhenger av denne strømmen, blant
annet sosiale bevis, «mest valgt», kryssalg og CPA-prising.

## Problem Statement
Dagens `BenefitEvent` har bare `eventType` (fritekst) og `metadata` (JSON).
Ingen hendelse sier hvilken kanal den kom fra, hvilken visning av fordelen
som ble brukt, eller hvilken A/B-test og variant brukeren så. Konsekvenser:

- Kanal mot kanal og visning mot visning kan ikke rapporteres.
- A/B-testing (beslutning 7 i docs/10) mangler et sted å merke hendelser.
- `eventType` er en ren streng. `/api/track` godtar hva som helst, og
  `TrackableEventType` i `trackEvent.ts` er bare en hint (`| string` slår den
  av). Skrivefeil gir stille datatap i rapportene.
- `trackEvent` setter aldri `sessionId` eller `userId`, selv om kolonnene
  finnes. Hendelsene kan derfor ikke knyttes til en person.
- «Åpnet» finnes ikke som egen hendelse. I dag er `benefit_viewed` det
  nærmeste, men den skiller ikke visning i liste fra åpning av en fordel
  (docs/10 nevner «åpnet» som viktig målepunkt).

## Proposed Solution
Kun additiv utvidelse. Ingen eksisterende kolonner, verdier eller spørringer
endres.

1. **Nye felter på `BenefitEvent`** (alle med trygg standard, ingen backfill-
   jobb nødvendig):
   - `channel` (string, NOT NULL, default `'app'`): `web` | `app` | `email`.
     Eksisterende rader får `'app'` via default.
   - `viewId` (string?): hvilken visning av fordelen som ble vist. Ren
     streng uten fremmednøkkel, se Antakelser.
   - `testId` (string?) og `variant` (string?): plass for A/B-merking. Settes
     ikke av noen kode i denne CR-en.
2. **Typede hendelsestyper** i én modul, `src/lib/tracking/eventTypes.ts`:
   - `EVENT_TYPES` (konstant liste) og `TrackableEventType` utledet av den.
   - Alle eksisterende verdier beholdes uendret (`benefit_viewed`,
     `code_revealed`, `code_copied`, `qr_opened`, `external_link_clicked`,
     `lead_form_started`, `lead_submitted`, `benefit_saved`,
     `benefit_unsaved`, `hero_clicked`), fordi `adminQueries.ts` grupperer på
     dem.
   - Ny: `benefit_opened` («åpnet»), og `benefit_selected` («valgt», web:
     «Ja takk»).
   - Ren hjelpefunksjon `isTrackableEventType(value)` og tilsvarende for
     `channel`.
3. **`trackEvent`** får en valgfri options-parameter
   (`{ channel, viewId, testId, variant, sessionId, userId }`). Eksisterende
   kall med tre argumenter virker uendret. `eventType`-parameteren snevres
   inn til `TrackableEventType` (ikke lenger `| string`).
4. **`/api/track`** aksepterer de nye feltene, validerer `eventType` og
   `channel` mot listene (400 `VALIDATION_ERROR` ved ukjent verdi) og sender
   dem videre. Fravær av `channel` gir `'app'`.
5. **Hendelser knyttes til sesjon:** `trackEvent` får `sessionId` fra kallere
   som allerede har sesjonen i hånden (claim-code, save, lead, `/api/track`).
   Se Åpne punkter for omfang.

Utenfor scope (egne CR-er): person-ID og Vipps, visningsentiteten, A/B-
tildeling og variantvalg, nye rapporter og dashboards, endring av
eksisterende analytics-spørringer.

## Impact Analysis

Affected Specs:
- [x] specs/entities.md (BenefitEvent: nye felter og hendelsestyper)
- [x] specs/api.yaml (`/api/track` lagt til)
- [x] specs/flows.md
- [x] specs/architecture.md (`/lib/tracking`-raden)
- [x] specs/nfr.md
- [x] specs/ui-spec.md

Affected Components:
- `prisma/schema.prisma` (model BenefitEvent) og ny migrasjon
- `src/lib/tracking/trackEvent.ts`, ny `src/lib/tracking/eventTypes.ts`
- `src/app/api/track/route.ts`
- Kallere som kan sende `sessionId`: `benefits/[slug]/claim-code`,
  `save`, `lead`, `benefits/[slug]/page.tsx`
- `RedemptionSection.tsx` berøres ikke (sender allerede gyldige typer)

Database Impact: Tre nullable kolonner (`view_id`, `test_id`, `variant`) og
én NOT NULL-kolonne med default (`channel`) på `benefit_events`.
Additiv migrasjon, ingen sletting, ingen omskriving av eksisterende rader
utover at default fylles ut av Postgres. Kjøres via `prisma migrate` ved
deploy. Ingen ny indeks (se Performance).

API Impact: `POST /api/track` får valgfrie felter (`channel`, `viewId`,
`testId`, `variant`). Bakoverkompatibelt for alle kjente klientkall. **Endret
atferd:** ukjent `eventType` gir nå 400 i stedet for å lagres. Alle
nåværende klientkall bruker gyldige verdier.

UX Impact: Ingen synlig endring.

Security Impact: Ingen auth-endring. `/api/track` er åpen og tar klient-
styrt input, så ny input (`channel`, `viewId`, `testId`, `variant`) må
begrenses: `channel` mot liste, øvrige strenger maks lengde (f.eks. 64) og
trimmet. Ingen persondata legges til. Ingen rate limiting finnes på
`/api/track` i dag (eksisterende forhold, ikke endret her).

Performance Impact: Fire ekstra kolonner per rad, ubetydelig. Ingen ny
indeks nå. Bør vurderes når rapporter filtrerer på `channel`/`testId`
(egen CR).

## Acceptance Criteria
- [ ] Migrasjonen kjører mot en database med eksisterende rader uten feil,
      og eksisterende rader får `channel = 'app'`
- [x] Alle eksisterende hendelsestyper er uendret og gyldige
- [x] `benefit_opened` og `benefit_selected` finnes i `EVENT_TYPES`
- [x] `trackEvent` fungerer uendret med de gamle tre argumentene
- [x] `trackEvent` lagrer `channel`, `viewId`, `testId`, `variant`,
      `sessionId` når de oppgis
- [x] `/api/track` avviser ukjent `eventType` og ukjent `channel` med 400
- [x] `/api/track` avviser for lange strenger i `viewId`/`testId`/`variant`
- [x] `/api/track` uten `channel` lagrer `'app'`
- [x] Eksisterende analytics- og lønnsomhetsspørringer gir uendret resultat
- [x] `specs/entities.md` og `specs/architecture.md` er oppdatert før kode
- [x] `npx tsc --noEmit`, `npx vitest run`, `npm run lint` og
      `npm run build` er grønne

## Required Tests
- [x] Unit: `eventTypes` (gyldig/ugyldig type og kanal, alle eksisterende
      verdier godtatt)
- [x] Unit: `trackEvent` (bakoverkompatibelt kall, med options, feil i
      Prisma svelges fortsatt)
- [x] Integration: `/api/track` route (gyldig, ugyldig type, ugyldig kanal,
      for lang streng, uten `channel`, ugyldig JSON)
- [x] Integration: kallere som sender `sessionId` (claim-code, save, lead)
      mot mocket `trackEvent`, uten å endre eksisterende assertions
- [ ] Manuell: migrasjonen kjørt lokalt eller mot Coolify-databasen, og
      én hendelse sett i `benefit_events` med riktig `channel`
      (lokal `DATABASE_URL` finnes ikke, se Risks)

## Rollback Strategy
Revert commit. Kolonnene er nullable eller har default, så gammel kode
fungerer mot det nye skjemaet. Skal kolonnene fjernes, kjøres en ny
migrasjon som dropper dem (bare `channel`, `view_id`, `test_id`, `variant`,
ingen eksisterende data går tapt).

## Migration Strategy
Én additiv Prisma-migrasjon. Deployes på `master` som vanlig. Ingen
bakgrunnsjobb. Skriveveien (`trackEvent`) og migrasjonen går ut samtidig i
samme deploy, siden Coolify kjører migrasjon før appen starter.

## Risks
- **Ingen lokal `DATABASE_URL`.** Migrasjonen kan ikke kjøres lokalt (kjent
  fra CR-016). Verifiseres via `prisma migrate diff` mot schema og i prod
  etter deploy. Dersom migrasjonen feiler i Coolify, stopper deployen.
- **Strengere validering i `/api/track`.** En klient som sender en ukjent
  type mister hendelsen (400). Kjente klientkall er sjekket mot listen.
  Fire-and-forget-kall ser ikke feilen, så en glemt type gir stille tap.
  Dette er hovedgrunnen til at listen må være fullstendig før merge.
- **`sessionId` er ikke person-ID.** Anonyme sesjoner er ikke den endelige
  identiteten (docs/10, 3.3). Feltene `sessionId`/`userId` beholdes, og
  senere CR for person-ID bygger videre.
- **Antakelser** merket under, som kan endres senere uten datatap.

## Antakelser (docs/12: merkes tydelig)
- `viewId` er en ren streng uten fremmednøkkel, fordi visningsentiteten ikke
  er besluttet (docs/12, spørsmål 1 og 4). Når den finnes, kan kolonnen bli
  en FK eller migreres.
- `channel` har default `'app'` fordi hele dagens forbrukerapp er webappen
  (PWA) som målbildet kaller «app». Verdiene `web` og `email` er reservert
  og ikke brukt av noen kode ennå.
- Hendelsesnavn i snake_case beholdes (`benefit_opened`, `benefit_selected`)
  i stedet for norske navn fra docs/10, for å holde samsvar med
  eksisterende verdier som rapportene grupperer på.
- `testId`/`variant` er bare lagringsplass. Hvordan variant tildeles
  (docs/10, seksjon 5) avgjøres i en egen CR.

## Åpne punkter (til godkjenning)
1. **Omfang for `sessionId`:** punkt 5 kan tas med her (små endringer i fire
   kallere) eller skilles ut til en egen CR. Forslag: ta det med, siden en
   hendelsesstrøm uten person/sesjon er lite verdt.
2. **`/api/track` i `specs/api.yaml`:** ruten mangler i dag. Forslag: legg
   den til som del av denne CR-en siden kontrakten endres.
3. **Ukjent `eventType` som 400:** alternativ er å godta og lagre
   uvalidert som før. Forslag: 400, for å hindre skrivefeil.

## Dependencies
Ingen eksterne. Bygger på CR-002 (tracking). Åpner for senere CR-er:
utvelgelse (person og tidspunkt), A/B-tildeling, rapporter v2, og tiltak
3, 5, 9, 17, 19 og 22.

## Implementation Notes (2026-10-12)
- Åpne punkt 1-3 besvart ja av bruker. `sessionId` knyttes i `/api/track`, `save`
  (POST/DELETE), `claim-code`, `lead` og `benefits/[slug]/page.tsx`.
- Ny hjelper `getSessionIdFromRequest` i `src/lib/session` (read-only, aldri
  opprett sesjon, null ved feil). `/api/track` og `lead` bruker den.
- `trackEvent` tar options som fjerde argument (etter `metadata`), slik at
  gamle kall med tre argumenter er uendret. `eventType` er nå strengt typet.
- Migrasjon `20261012000000_cr020_event_dimensions` er skrevet for hånd og
  sammenlignet med `prisma migrate diff` (gammelt mot nytt skjema), SQL er
  identisk. Shadow-DB finnes ikke, så den er ikke kjørt mot en database.
- `specs/api.yaml` er fortsatt en malfil. Bare `/api/track` er lagt til.
- Validering: tsc OK, lint 0 feil (3 gamle advarsler), vitest 162/162 (opp fra
  138, 24 nye), build OK.
- Gjenstår: `/review`, commit, deploy, og sjekk i prod at migrasjonen gikk
  gjennom og at en hendelse får `channel = 'app'`.
