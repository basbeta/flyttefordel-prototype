# CR-027: Innholdsoverstyring per flate i admin

Status: Implementert, /review PASSED (2026-10-13), committed. Bruker har sjekket admin-UI ("det går nok greit"), men ikke eksplisitt bekreftet alle punktene i den manuelle testen. Ikke Done før bruker bekrefter.
Created: 2026-10-12
Approved: 2026-10-12

## Business Goal
Gjøre at en fordel fylles ut én gang, men kan få eget innhold der det trengs: egen tittel,
tekst, bilde og merketekst på kortet i appen og på kortet i web-løpet, med en forhåndsvisning
som viser resultatet mens man skriver (docs/10 §3.2 og §8). Dette er hovedmålet med
visningsmodellen fra CR-021, og grunnlaget for A/B senere. Gjør også at appens lagret-side
bruker samme visning som listen (kjent hull fra CR-021).

## Problem Statement
Modellen støtter overstyring (`BenefitView` med `resolveBenefitView`, CR-021, og `web_card`,
CR-022), men det finnes ingen måte å sette overstyringer i admin. Den eneste veien er SQL.
I tillegg viser lagret-siden fortsatt fordelens kjerneinnhold, selv om listen viser
overstyringen, så en overstyring ville gitt ulik tekst på to steder i appen.

## Proposed Solution

### 1. Seksjonen «Visninger» på rediger fordel
- To grupper, én per format: **App-kort** (`app_card`) og **Web-kort** (`web_card`). Feltene
  kommer fra format-registeret (`overridable`): tittel, tekst, bilde (+ alt-tekst) og
  merketekst.
- **Tomt felt betyr «arv fra fordelen».** Feltet viser fordelens verdi som plassholder
  («Arves: …»), så man ser hva som gjelder uten overstyring. Bilde bruker
  `ImageUploadField` (CR-012), og regelen fra CR-021 gjelder: nytt bilde bruker visningens
  alt-tekst, aldri fordelens.
- **Forhåndsvisning** per format som oppdateres mens man skriver. Den bruker den rene
  `resolveBenefitView` i nettleseren med utkastet, så den viser nøyaktig det
  forbruker-koden ville løst. Se åpent punkt 1 om hvor nøyaktig utseendet er.
- **«Tilbakestill til fordelens innhold»** tømmer alle overstyringene for formatet.
- Lagring per format følger CR-026: knappen kommer først frem ved endring, så «Lagret».
- Kun variant `standard`. Varianter og A/B kommer senere.

### 2. API
- `PUT /api/admin/benefits/[id]/views/[format]`: setter overstyringene
  (`title`, `text`, `imageUrl`, `imageAlt`, `badgeText`, alle nullable) for
  `(benefit, format, 'standard')`. Oppretter raden om den mangler. Tomme strenger lagres
  som `null`.
- **Rører aldri placering.** For `web_card` ligger `pageId` og `sortOrder` på samme rad.
  Overstyrings-ruten oppdaterer bare innholdsfeltene, og plasserings-ruten (CR-025)
  oppdaterer bare plassering, slik at de ikke overskriver hverandre. Testes begge veier.
- `[format]` valideres mot format-registeret (`isViewFormat`), ukjent format gir 404.
  Admin-auth i ruten, zod med lengdegrenser, 401/404/400, `try/catch` med JSON-feil.
- «Tilbakestill» er et `PUT` der alle felt er `null` (ingen egen `DELETE`).

### 3. Lagret-siden bruker visningen
- `getSavedBenefits` henter `app_card`-visninger og løser innholdet med
  `resolveBenefitView`, på samme måte som `getActiveBenefits` (CR-021). Samme kort på alle
  flater i appen.
- Detaljsiden er fortsatt ikke en visning (uendret).

### Utenfor scope (egne CR-er)
- Varianter og A/B-testing (tildeling, test-entitet, resultater).
- Flere formater (`app_hero`, `app_intro`, `email`) og hero som visning.
- Kulepunkter, knappetekst og beskjæring av bilder.
- Bilde-beskjæring og automatiske formater fra ett hovedbilde.
- Lead-eksport med kontaktfelt, person-ID og innlogging.
- Endring av hvordan detaljsiden vises.

## Impact Analysis

Affected Specs:
- [ ] specs/entities.md (BenefitView er allerede beskrevet)
- [x] specs/api.yaml (`PUT .../views/{format}`)
- [x] specs/flows.md (sette overstyring, tilbakestill)
- [x] specs/architecture.md (`/lib/views` brukes også i admin-forhåndsvisning)
- [ ] specs/nfr.md
- [ ] specs/ui-spec.md (tom fra før)

Affected Components:
- Ny rute `src/app/api/admin/benefits/[id]/views/[format]/route.ts` (+ test)
- Nytt zod-skjema i `src/lib/admin/flowSchemas.ts` (eller egen fil)
- Ny `BenefitViewsSection.tsx` under `benefits/[id]` (+ forhåndsvisning-komponent)
- Ny admin-spørring for en fordels visningsrader (`adminQueries.ts`)
- `src/app/admin/(protected)/benefits/[id]/page.tsx` (laster og viser seksjonen)
- `src/lib/queries/savedQueries.ts` (og dens test)
- Ingen endring i `resolveBenefitView`, format-registeret eller skjemaet

Database Impact: Ingen skjemaendring. Skriver til eksisterende `benefit_views`.

API Impact: Ny admin-rute. Ingen endring i offentlige endepunkter.

UX Impact: Ny seksjon på rediger fordel. Appens lagret-side kan endre tekst/bilde for
fordeler som får overstyring (det er hensikten).

Security Impact: Ny admin-skriverute med auth per rute (middleware beskytter ikke
`/api/admin`). Zod, lengdegrenser, bilde-URL begrenset til http(s)/relativ (som CR-025).
Overstyrt tekst rendres som tekst, ingen HTML.

Performance Impact: Ubetydelig. `getSavedBenefits` får én ekstra relasjon (som listen).

## Acceptance Criteria
- [ ] Admin kan sette og fjerne overstyring av tittel, tekst, bilde, alt-tekst og merketekst
      for app-kort og web-kort, uavhengig av hverandre
- [ ] Tomt felt arver fra fordelen, og plassholderen viser den arvede verdien
- [ ] Forhåndsvisningen viser det `resolveBenefitView` ville gitt, og oppdateres mens man skriver
- [ ] «Tilbakestill» fjerner alle overstyringer for formatet
- [x] Lagring av overstyring for `web_card` endrer ikke `pageId` eller `sortOrder`, og lagring
      av plassering endrer ikke overstyringene
- [x] Ukjent format gir 404, ugyldig input gir 400, uten innlogging gir 401
- [x] Lagret-siden viser samme kortinnhold som listen (overstyring når den finnes)
- [ ] Appens liste og web-løpet bruker de nye overstyringene (verifisert på `/`, `/benefits`,
      `/saved` og `/flytting`)
- [ ] Lagreknappen følger CR-026 (ingen knapp uten endring, så «Lagret»)
- [x] `specs/api.yaml`, `specs/flows.md` og `specs/architecture.md` er oppdatert før kode
- [x] `npx tsc --noEmit`, `npx vitest run`, `npm run lint` og `npm run build` er grønne

## Required Tests
- [x] Integration (route-test med mocket Prisma): 401, 404 ukjent fordel og ukjent format,
      400, suksess, tomme strenger blir `null`, oppdaterer bare innholdsfeltene (rører ikke
      `pageId`/`sortOrder`), oppretter raden når den mangler
- [x] Integration: plasserings-ruten (CR-025) rører fortsatt ikke overstyringene
- [x] Integration: `getSavedBenefits` løser overstyring, og er uendret uten visninger
- [x] Unit: eventuell ren hjelper for utkast til rad (tom streng til `null`, trimming)
- [ ] Manuell i nettleser: sette overstyring, se forhåndsvisning, se resultatet på listen,
      lagret og i web-løpet, og tilbakestille

## Rollback Strategy
Revert commit. Ingen skjemaendring. Overstyringer som allerede er lagret blir liggende og
brukes av appen (CR-021 leser dem uavhengig av admin-UI), så en revert fjerner bare
muligheten til å endre dem. De kan slettes direkte i databasen om nødvendig.

## Migration Strategy
Ingen migrasjon, ingen bakfylling.

## Risks
- **Forhåndsvisningen er en tilnærming** hvis den ikke gjenbruker de ekte kort-komponentene
  (se åpent punkt 1). Innholdet er nøyaktig (samme funksjon), men utseendet kan avvike litt.
- **Overstyring kan gi motstridende budskap** mellom flater (annen tittel i appen enn på web).
  Det er hensikten, men admin bør se begge forhåndsvisninger samtidig.
- **Lagret-siden endrer innhold** for brukere som har lagret fordeler som nå får overstyring.
- **Delt rad for plassering og innhold** (`web_card`). Hver rute rører bare sine egne felt, men en
  fremtidig endring som erstatter hele raden vil nullstille det andre. Dekket av tester nå.
- **Tomme overstyringsrader** blir liggende etter «Tilbakestill» (alle felt `null`, uten
  plassering). Ufarlig, men støy i databasen. Kan ryddes senere.
- **Ingen lokal `DATABASE_URL`.** Skriveflyten er bare testet med mocket Prisma og
  verifiseres manuelt i admin.
- **UI kun manuelt testet** (ingen komponenttester).
- **Ingen lengdegrenser for fordelens kjerneinnhold i dag.** Overstyringer får grenser
  (tittel 120, tekst 500, merketekst 40, alt 200), som kan være strengere enn kjerneinnholdet.

## Antakelser (docs/12: merkes tydelig)
- Kun variant `standard` i admin. Varianter er lagringsplass og resolver-støtte fra CR-021,
  men uten UI inntil A/B bygges.
- Bildebeskjæring er ikke med. Overstyrt bilde brukes som det er (`object-fit: cover`).
- Overstyring gjelder bare kortene (`app_card` og `web_card`). Detaljsiden og `Hero` er uendret.
- Grensene (tittel 120, tekst 500, merketekst 40, alt 200) er gjetninger inntil ui-spec finnes.

## Avklarte punkter (bruker, 2026-10-12)
1. **Forhåndsvisning:** svaret «ja på alle» på et valg mellom to alternativer. Tolket som det anbefalte: en forenklet admin-visning (tittel, tekst, bilde, merketekst, samme tokens), ikke de ekte kortene. Innholdet er nøyaktig (samme `resolveBenefitView`), utseendet er en tilnærming.
2. **«Tilbakestill»:** ja, knapp som tømmer alle overstyringer for formatet.
3. **Lagret-siden:** ja, tas med her.
4. **Plassering:** «Visninger» mellom «Produkter» og «Kanaler» på rediger fordel.

## Dependencies
Bygger på CR-021 (`BenefitView`, `resolveBenefitView`), CR-022 (`web_card`), CR-025
(plasseringsrute som deler rad), CR-026 (lagreknapper) og CR-012 (bildeopplasting). Åpner
for varianter og A/B-testing.

## Implementation Notes (2026-10-12)
- Bruker svarte «ja på alle». Punkt 1 var et valg mellom forenklet og ekte forhåndsvisning,
  tolket som det anbefalte (forenklet admin-visning). Punkt 2 til 4 ja.
- Ny rute `PUT /api/admin/benefits/[id]/views/[format]` (auth, zod `.strict()`, 401/404/400,
  bare variant standard). Tomme felt og bare mellomrom blir null (arv). Ukjent format (også
  `app_hero`, `email`, `toString`) gir 404. Felt formatet ikke tillater lagres som null.
- Ruten oppdaterer og oppretter **bare innholdsfelt** (testet: `update` har kun title, text,
  imageUrl, imageAlt, badgeText, og `create` har verken `pageId` eller `sortOrder`). Plasserings-
  ruten er tilsvarende testet (kun `pageId` og `sortOrder`). De deler rad og kan ikke
  overskrive hverandre.
- Ny `src/lib/admin/viewOverrides.ts` (ren, 10 tester): `toOverrideBody`, `fieldsFromRow`,
  `hasOverrides`, `VIEW_OVERRIDE_LIMITS`. Grensene (tittel 120, tekst 500, merketekst 40, alt 200,
  URL 500) er gjetninger inntil ui-spec finnes.
- **Lagret-siden:** `withAppCardView` er trukket ut i `benefitQueries.ts` og brukes nå av både
  listen (inkl. «I nærheten») og `getSavedBenefits`, så kortet er likt på alle flater i appen.
  `savedQueries` henter `app_card`-visninger. Eksisterende lagret-tester fikk `views: []`.
- UI: ny seksjon «Visninger» (mellom Produkter og Kanaler) med en gruppe per format (App-kort,
  Web-kort), plassholdere som viser arvet verdi, forhåndsvisning som løses med
  `resolveBenefitView` på utkastet, «Tilbakestill til fordelens innhold» og lagring etter
  CR-026 (`InlineSaveActions` + `useDirtyTracking`). Ny `ViewPreview` i `components/admin`
  (forenklet kort, ingen import fra mobil- eller web-komponenter, verifisert).
- `ViewPreview`-gradienten har en `rgba(...)` (samme mønster som BenefitCard). Ingen hex-farger.
- Validering: tsc OK, lint 0 feil (3 gamle advarsler), vitest 394/394 (opp fra 369, 25 nye),
  build OK (ny rute vises).
- **Ikke gjort:** admin-UI er ikke sett i nettleser og skriveflyten er ikke kjørt mot en
  database (mocket Prisma). UI-kriteriene og den manuelle testen står uavkrysset.
- Gjenstår: `/review`, commit, deploy (ingen migrasjon), og manuell test: sett overstyring på
  app-kort og web-kort, se forhåndsvisningen, sjekk `/`, `/benefits`, `/saved` og `/flytting`,
  og tilbakestill.
