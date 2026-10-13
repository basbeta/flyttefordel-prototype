# CR-030: A/B-tildeling fra person-ID (første steg av A/B-laget)

Status: Implementert 2026-10-13, /review PASSED, pushet (ceb27a1), deployet og migrert, e2e mot prod 145/145, IKKE Done (venter på at brukeren tester admin-UI)
Approved: 2026-10-13 («anbefalt på alle», pluss krav om enkel utvidbarhet)
Created: 2026-10-13

## Business Goal
Gjøre A/B-testing enkelt (docs/10 §1 pkt 7, §5): en test velger mellom ting som allerede finnes i
modellen, og samme person får alltid samme variant i alle kanaler uten at tildelingen lagres.
Dette steget leverer selve tildelingen og kobler den til visninger og hendelser, slik at en test
kan kjøres og måles. Rapportering v2 (resultat per variant, signifikans) er et eget steg (docs/10 §10 pkt 6).

## Problem Statement
- `BenefitView.variant` og `BenefitEvent.testId/variant/viewId` finnes (CR-020, CR-021), men ingenting
  velger variant. Appen og web-løpet bruker alltid `standard`.
- Det finnes ingen test-entitet: ingen sted å si hvilke alternativer, fordeling og periode.
- Hendelser merkes ikke med test og variant, så et utfall kan ikke knyttes til en variant.

## Proposed Solution (utkast, se åpne punkter)
1. **Ren funksjon** `assignVariant(personId, testId, variants[{key, weight}])` i ny modul `src/lib/abtest`.
   Deterministisk hash (SHA-256 av `testId:personId`, de første 4 bytene som tall), vektet utvalg.
   Ingen I/O, ingen lagring. Samme input gir alltid samme variant. Uavhengig mellom tester (testId i hashen).
2. **Test-entitet** `AbTest`: id, navn, `kind`, `scope` (JSON), `scope_key`, status
   (`draft`/`running`/`ended`), `starts_at`/`ends_at`, hovedmål, varianter som JSON `[{key, weight, ...}]`. Se «Utvidbarhet».
   Variantene peker på eksisterende `BenefitView.variant`-nøkler (innholdstest). Én kjørende test per fordel og format.
3. **Utvelgelsen velger variant:** der appen og web-løpet i dag kaller `resolveBenefitView(..., 'standard')`
   finnes én inngang som slår opp kjørende test for fordel og format, tildeler variant fra person-ID
   og sender variantnøkkelen til `resolveBenefitView`. Frontend får bare ferdig innhold pluss en ugjennomsiktig
   `viewId` og `testId`/`variant` til sporing. Anonym sesjon uten person-ID får `standard` (ingen test).
4. **Hendelser merkes:** `trackEvent` og `/api/track` sender `viewId` (`{format}:{variant}`), `testId` og
   `variant` for alle hendelser på kort som kom fra en test. Bestillingsruten bruker i dag hardkodet
   `web_card:standard` og må bruke tildelt variant.
5. **Admin:** minimal opprettelse og avslutning av test (ny seksjon «A/B-test» på rediger fordel):
   velg format, to eller flere eksisterende varianter, fordeling, periode, start/stopp.
   Advarsel hvis en valgt variant ikke har en `BenefitView`-rad (faller da tilbake til standard-innhold).

Utenfor scope: format-, plasserings- og strukturtester (docs/10 §5), e-post, rapportering v2 og signifikans.

## Utvidbarhet (bruker, 2026-10-13: «må være enkelt å endre på senere, mange ting skal kunne A/B-testes»)
Designkrav som styrer alle valgene over: å legge til en ny type test senere skal være **én ny
fil og én linje i et register**, uten endring i tildeling, lagring, hendelser eller admin-ruter.

- **Tildeling er uavhengig av hva som testes.** `assignVariant` kjenner bare person, test-ID og
  vektede nøkler. Den vet ingenting om innhold, format eller plassering.
- **Testtype (`kind`) er et register** `src/lib/abtest/kinds.ts`. Hver type definerer: zod-skjema for
  `scope` (hva testen gjelder), validering av varianter, `scopeKey` (brukes til «én kjørende test per
  scope») og `apply` (hva en tildelt variant betyr). Dette steget leverer bare typen `content`
  (fordel + format, variantnøkkel = `BenefitView.variant`). Typene `format`, `placement`, `structure`
  (docs/10 §5) legges til senere som nye oppføringer.
- **Generell datamodell:** `ab_tests.kind` (tekst), `scope` (JSON), `scope_key` (tekst, indeksert),
  `variants` (JSON `[{key, weight, ...kind-spesifikt}]`). Ingen kolonne er knyttet til fordeler
  spesifikt, så senere typer trenger ikke migrasjon.
- **Én inngang for oppslag:** `resolveActiveAssignments(personId, scopeKeys[])` returnerer
  `{testId, variant, viewId}` per scope. Spørringene og bestillingsruten bruker bare den.
- **Hendelser** bruker eksisterende generelle felt (`testId`, `variant`, `viewId`), ingen nye per type.
- **Admin:** API-et er generisk (`/api/admin/ab-tests`, validert via registeret). Fordelsseksjonen er
  bare ett skall rundt det for typen `content`, og andre typer får egne skall senere.

## Impact Analysis

Affected Specs:
- [x] specs/entities.md (AbTest, bruk av BenefitEvent.test_id/variant/view_id)
- [x] specs/api.yaml (admin-ruter for test, utvidet response med viewId/testId/variant på kort)
- [x] specs/flows.md (flyt: opprette og kjøre test, tildeling ved visning)
- [x] specs/architecture.md (ny modul /lib/abtest)
- [ ] specs/nfr.md
- [ ] specs/ui-spec.md

Affected Components:
`src/lib/abtest` (ny: assign, kinds-register, resolveActiveAssignments), `src/lib/queries/benefitQueries.ts` og `flowQueries.ts` (variantvalg),
`src/lib/tracking`, `/api/track`, `/api/flow/order`, kort-komponenter som sender hendelser,
admin: ny seksjon og to ruter, `prisma/schema.prisma`.

Database Impact: ny tabell `ab_tests`, additiv migrasjon. Ingen endring i eksisterende kolonner.
API Impact: nye `/api/admin/ab-tests` og `/api/admin/ab-tests/[id]` (opprett/rediger/start/avslutt, per-rute auth, zod via kind-registeret). Kort-responser får tre valgfrie felt.
UX Impact: forbruker ser ingen forskjell. Admin får én seksjon.
Security Impact: ingen persondata i hendelsene utover eksisterende person-ID. Tildeling regnes server-side, klienten kan ikke velge variant. Hash av person-ID lekker ikke ID-en (bare variantnøkkel sendes ut).
Performance Impact: én ekstra spørring per liste for kjørende tester (kan hentes sammen med fordelene). Hashing er ubetydelig.

## Acceptance Criteria
- [ ] Samme person og test gir alltid samme variant (deterministisk, ingen lagring).
- [ ] Fordelingen over mange person-ID-er er innenfor toleranse av vektene.
- [ ] To tester på ulike fordeler gir ikke korrelert tildeling for samme person.
- [ ] En kjørende test endrer innholdet til kortet for tildelt variant, ellers `standard`.
- [ ] Test utenfor perioden, ikke `running`, eller uten person-ID gir `standard`.
- [ ] Hendelser fra kort i en test har `testId`, `variant` og `viewId`. Øvrige hendelser er uendret.
- [ ] Admin kan opprette, starte og avslutte en test og ser advarsel ved manglende visning.
- [ ] Kun én kjørende test per fordel og format (409 ellers).

## Required Tests
- [ ] Unit: kinds-register (ukjent kind avvises, content-skjema, scopeKey), assignVariant (determinisme, vekter, uavhengighet, ugyldig input), variantvalg i spørringene, validering av test (zod, periode, vekter summerer > 0).
- [ ] Integration: admin-ruter (auth, validering, 409), `/api/track` og bestillingsrute med test/variant.
- [ ] E2E: utvid `scripts/qa/smoke.py`: testperson A og B får forventet variant, samme variant ved gjentatt kall, hendelse lagret med variant.

## Rollback Strategy
Revert commit. Migrasjonen er additiv, tabellen kan bli stående ubrukt. En kjørende test kan stoppes ved å sette status `ended`, da faller alt tilbake til `standard`.

## Migration Strategy
Én ny tabell, ingen backfill. Ikke kjørt mot DB før deploy.

## Risks
- Hendelser fra før testen har ingen variant, rapporteringen må kunne ekskludere dem.
- Endrer man vektene midt i en test flyttes personer mellom varianter og dataene blir forurenset. Admin bør låse vekter og varianter mens testen kjører (foreslått).
- Utvelgelsen bruker person-ID, så anonym trafikk testes ikke. Bevisst: appen krever innlogging siden CR-028.
- Hashfunksjonen er en kontrakt: endres den, endres alles variant. Fryses med snapshot-test.

## Dependencies
CR-020 (hendelsesfelt), CR-021 (visninger/varianter), CR-028 (person-ID), CR-029 (utvelgelse).

## Åpne punkter (anbefaling først)
1. **Omfang:** bare innholdstest på ett format per test (anbefalt), eller også hero mot normal i dette steget?
2. **Testen peker på:** fordel + format + variantnøkler (anbefalt), eller egen liste av visninger på tvers av fordeler?
3. **Admin i denne CR-en:** minimal seksjon på rediger fordel (anbefalt), eller bare API og seed, UI senere?
4. **Test-ID i hashen:** `AbTest.id` (anbefalt), slik at en ny test på samme fordel gir ny fordeling.
5. **Låsing:** varianter og vekter låses mens testen kjører (anbefalt).
6. **Kontrollgruppe:** `standard` er alltid en av variantene som må inkluderes (anbefalt), slik at det alltid finnes en referanse.

## Avklarte punkter (bruker, 2026-10-13: «anbefalt på alle»)
1–6 som anbefalt. I tillegg utvidbarhetskravet over.

## Implementation Notes (2026-10-13)
- **Spec først:** entities (AbTest), flows (A/B-tildeling og måling), architecture (/lib/abtest), api.yaml (`/api/admin/ab-tests`, `/api/admin/ab-tests/{id}`, valgfri `variant` i views-PUT).
- **`src/lib/abtest`:** `assignVariant` (SHA-256 av `testId:personId`, vektet, sortert på nøkkel, hashen frosset av snapshot-test), `kinds.ts` (register, bare `content`; `parseTestDefinition`, `viewIdFor`, `checkTestStart`), `resolve.ts` (`assignmentsFromTests` ren, `resolveActiveAssignments` fail-open), `tracking.ts` (`testDimensionsFor`), `schemas.ts`.
- **Ny testtype = én ny oppføring i `TEST_KINDS`** (scope-skjema, scopeKey, validateVariants, viewId, valgfri checkStart). Tildeling, lagring, hendelser og admin-API er uendret.
- **Tabell `ab_tests`** (migrasjon `20261013200000_cr030_ab_tests`, additiv, IKKE kjørt mot DB). Ingen kolonne er fordelsspesifikk.
- **Valg av variant:** app-liste (`getActiveBenefits`), lagret (`getSavedBenefits(sessionId, personId)`) og web-løp (`getWebFlow(session, now, personId)`, variantrader hentes bare for tildelte variant ≠ standard, plassering alltid fra standard-raden). `SessionData.personId` er ny. Kortene får ingen test-/variantfelt (testet).
- **Hendelser:** `benefit_viewed` og klienthendelser på fordelssiden (kode vist/kopiert, ekstern lenke), `benefit_saved/unsaved`, `code_revealed`, `lead_submitted` og `benefit_selected` (web) får `testId`/`variant`/`viewId`. Uten test er hendelsene som før.
- **Admin:** generisk API (lås av varianter/vekter mens running, ett running per scope_key, ended er endelig, start krever innhold i alle varianter). Views-PUT tar valgfri `variant`. Ny seksjon «A/B-test» på rediger fordel (opprett, innhold i variant B med forhåndsvisning, start, avslutt).
- **Validering:** tsc OK, lint 0 feil (3 gamle advarsler), vitest 664/664 (opp fra 596, 68 nye), build OK. Alt mot mocket Prisma. Migrasjon, admin-UI og skriveflyt IKKE verifisert mot DB eller i nettleser.

## /review (2026-10-13): PASSED
Funn fikset: å avslutte en allerede avsluttet test ga 409 (nå ufarlig gjentakelse, testet).
Advarsler (akseptert for prototypen):
- «Ett running per scope» er sjekket i kode, ikke med unik indeks (Prisma kan ikke uttrykke delvis unik indeks uten drift). To samtidige starter kan i teorien begge lykkes. Første test på scope vinner da i `assignmentsFromTests`.
- `/api/track` tar `testId`/`variant`/`viewId` fra klienten (eksisterende design fra CR-020). Kan forfalskes av en innlogget bruker og forurense rapportering. Serverhendelser regnes på serveren.
- Hendelser fra før en test har ingen variant, rapporteringen (egen CR) må ekskludere dem.
- e2e mot prod ikke skrevet ennå: krever deploy og migrasjon først. Neste: legg A/B-seksjon i `scripts/qa/smoke.py` (opprett test, variant B-innhold, start, kryss-sjekk at hver testperson får variant lik `assignVariant`, avslutt).

## E2E mot prod (2026-10-13, etter deploy av ceb27a1)
smoke.py 145/145 (ny seksjon «A/B-tildeling», 16 sjekker: tildeling lik SHA-256-kontrakten for alle seedede personer, stabil, låst mens running, 409 på andre test på samme scope, B borte etter avslutning). Agenten utforsket i tillegg 97 sjekker: auth (401 for anonym og persontoken), validering (24 ugyldige POST-varianter), statusflyt, `variant` i views-PUT, admin-sider 200, ingen lekkasje av testId/viewId/variant i HTML. Ingen funn.
Ikke testet: admin-UI visuelt, hendelsesmerking i DB, web_card-variant i web-løpet mens en test kjører, tidsstyring med startsAt/endsAt. Kjent svakhet i smoke.py: «minst én person fikk B» kan gi falsk grønn hvis fordelen er utenfor alles utvalg (var reell denne gangen).
Testdata i prod: avsluttede tester «QA A/B …», «QA val …», «QA flyt …» og variantrader (b, qa-x) på én fordel. Variantradene vises bare mens en test kjører.
