# CR-023: Web-løpet, tynn side

Status: Implementert (ikke committed, ikke /review, UI ikke sett i nettleser, seed ikke kjørt)
Created: 2026-10-12
Approved: 2026-10-12

## Business Goal
Gi en første side man kan åpne og klikke gjennom, som viser Page → Fordel →
Product fra CR-022 som et løp: én side om gangen, kort med produktvalg,
progresjon og en oppsummering. Formålet er å teste om modellen holder mot en
faktisk side før bestilling bygges (CR-024). Ingenting sendes inn.

## Problem Statement
CR-022 leverte modellen og `getWebFlow()`, men ingen side og ingen
konsument. Modellen er kun bevist av tester, og det finnes ingen lenke å
vise frem (docs/10 §7.1: «sidene er bare en rekkefølge av kategorier»).

## Proposed Solution

### Ruter (ny route group `(web)`, samme app, docs/12 spm. 16)
- `/flytting`: sender til første synlige side. Tom løp gir en tom tilstand.
- `/flytting/[pageId]`: én side i løpet. Viser progresjon («Side 2 av 3» og
  «Neste: <sidenavn>»), sidens navn og tekst, og kortene.
- `/flytting/oppsummering`: viser valgene. Ingen «Send inn» (kommer i
  CR-024), men en tydelig tekst om at innsending ikke er bygget ennå.
- `pageId` som ikke finnes i personens synlige løp (inaktiv, utelatt eller
  ukjent) sender til første synlige side. «Neste» regnes ut fra løpet slik
  det er for denne personen, siden sider kan hoppes over.

### Kort og valg
- Kortet viser bilde, merketekst, tittel, tekst, kunde (navn og logo),
  produktene med `priceText`, og vilkårstekst.
- **«Ja takk»** velger et produkt per fordel (første produkt er forhåndsvalgt,
  man kan bytte når det er flere). Valget kan angres.
- Fordel uten produkter vises som ren informasjon, uten «Ja takk».
- Valgene holdes **kun i klienten** (`sessionStorage`, alltid i try/catch,
  siden den kan være blokkert). Ingenting lagres på serveren og det sendes
  ingen hendelser.
- Valg som peker på produkter eller fordeler som ikke lenger er i løpet
  (forsvunnet mellom besøk) droppes ved lesing.

### Ren logikk som enhetstestes
Siden det ikke finnes komponenttest-infrastruktur i repoet, legges logikken i
rene funksjoner i `src/lib/flow/`:
- `flowNavigation.ts`: gitt løpet og en `pageId`, gi indeks, antall, forrige,
  neste og `fallback` (første side) når id-en ikke finnes.
- `flowSelection.ts`: lese og skrive valg (tåler ugyldig JSON), veksle valg,
  rense mot løpet, og bygge oppsummeringen.

### Layout og stil
- Egen `(web)/layout.tsx`: enkel topplinje, responsivt innhold (mobil først,
  bredere på desktop). Gjenbruker `tokens.css`, ingen ny designkontrakt.
  Ingen mobilapp-navigasjon (`MobileShell`).
- CSS Modules som resten av appen, kun eksisterende tokens.
- `export const dynamic = 'force-dynamic'`.

### Utenfor scope (egne CR-er)
- Bestilling, ordre og samtykker (CR-024).
- Innlogging og simulert person-ID. Anonym sesjon brukes (middleware setter
  den allerede for alle ikke-admin-ruter). Sesjonens postnummer og flyttestatus
  styrer targeting via `getWebFlow`.
- Hendelser fra web (`channel: 'web'`, `benefit_viewed`, `benefit_selected`).
- Admin-UI for sider og produkter, If, postkasseskilt, bekreftelsesside.
- Endelig design. Siden er funksjonell, ikke pen.

## Impact Analysis

Affected Specs:
- [ ] specs/entities.md
- [ ] specs/api.yaml (ingen endepunkt)
- [x] specs/flows.md (web-løpets sider og klientvalg)
- [x] specs/architecture.md (`/app/(web)` og `/lib/flow`)
- [ ] specs/nfr.md
- [ ] specs/ui-spec.md (tom fra før, se Risks)

Affected Components:
- Ny `src/app/(web)/` (layout, `flytting/page.tsx`,
  `flytting/[pageId]/page.tsx`, `flytting/oppsummering/page.tsx`, CSS Modules)
- Ny `src/components/web/` (klientkomponenter for kort, valg og oppsummering)
- Ny `src/lib/flow/` (rene funksjoner og tester)
- Utvidet `prisma/seed-web-flow.ts` (ordentlige testdata, se avklart punkt 1)
- Ingen endring i eksisterende app, admin, middleware, schema eller queries

Database Impact: Ingen. Leser kun via `getWebFlow` (CR-022).

API Impact: Ingen.

UX Impact: Ny, offentlig side på `/flytting`. Ingen endring i
mobilappen. Tomme, ugyldige og tilgjengelige tilstander dekkes (se
Acceptance Criteria).

Security Impact: Ingen ny skrivevei. Siden viser data fra `getWebFlow`, som
er en avgrenset visningsmodell. All tekst rendres som tekst (React escaper),
ingen HTML fra data. Ingen persondata samles eller lagres.

Performance Impact: Én `getWebFlow`-kall per sidevisning (nested spørring,
ingen N+1). Hver sidevisning henter hele løpet for å regne ut neste og
progresjon. Akseptabelt ved titalls sider.

## Acceptance Criteria
- [ ] `/flytting` sender til første synlige side, og viser en tom tilstand
      når løpet er tomt
- [ ] `/flytting/[pageId]` viser sidens kort, progresjon og «Neste»
- [ ] Ukjent, inaktiv eller utelatt `pageId` sender til første synlige side
- [ ] Siste side har «Til oppsummering» i stedet for «Neste»
- [ ] «Ja takk» velger og angrer et produkt per fordel, og bytte av produkt
      virker når det er flere
- [ ] Fordel uten produkter vises uten «Ja takk»
- [x] Valg overlever sidebytte i samme fane (`sessionStorage`) og siden virker (lagringslogikk enhetstestet, ikke sett i nettleser)
      også når `sessionStorage` ikke er tilgjengelig
- [x] Valg mot forsvunnet produkt eller fordel droppes (enhetstestet)
- [ ] Oppsummeringen lister valgene og sier tydelig at innsending ikke er
      bygget ennå. Tom oppsummering har en egen tilstand
- [ ] Siden bruker sesjonens targeting via `getWebFlow`
- [ ] Utvidet seed gir et realistisk, åpenbart fiktivt testsett (flere sider, fordeler med og uten produkter, web-overstyring, targeting), er fortsatt idempotent og transaksjonell
- [x] Ingen endring i eksisterende ruter, admin eller mobilapp
- [ ] Siden er brukbar uten mus (tastatur) og knapper har tilgjengelig navn
- [x] `specs/flows.md` og `specs/architecture.md` er oppdatert før kode
- [x] `npx tsc --noEmit`, `npx vitest run`, `npm run lint` og
      `npm run build` er grønne

## Required Tests
- [x] Unit: `flowNavigation` (første, midten, siste, ukjent id, tomt løp,
      én side)
- [x] Unit: `flowSelection` (veksle, bytte produkt, angre, ugyldig JSON,
      rensing mot løpet, oppsummering, fordel uten produkter)
- [ ] Manuell i nettleser: gå gjennom løpet på mobil og desktop, med og uten
      data, tastaturnavigasjon (ingen komponenttest-infrastruktur finnes)

## Rollback Strategy
Revert commit. Ingen skjemaendring, ingen delt kode endret, så bare de nye
rutene forsvinner.

## Migration Strategy
Ingen migrasjon. Siden er tom til treet har data.

## Risks
- **Treet er tomt i prod.** Siden viser den tomme tilstanden til noen har
  kjørt seed (`npm run db:seed-flow`) eller lagt inn data. Se avklart punkt 1.
- **Demo-fordeler i mobilappen** hvis seed kjøres mot prod (appens lister
  filtrerer ikke på `visibility`). Kjent fra CR-022.
- **UI er kun manuelt testet.** Repoet mangler komponenttester, så kun
  navigasjon og valg-logikken er enhetstestet. Layout, tilgjengelighet og
  `sessionStorage`-atferd verifiseres av en person i nettleser.
- **`sessionStorage` er per fane.** Åpnes en ny fane, er valgene borte.
  Akseptabelt siden ingenting sendes inn ennå.
- **Siden er offentlig og indekserbar** (`/flytting`). Bruker valgte å ikke sette noindex.
- **ui-spec.md er tom fra før.** Ingen spesifikasjon å matche. Designet er
  funksjonelt og bruker eksisterende tokens.

## Antakelser (docs/12: merkes tydelig)
- URL-en er `/flytting` og bruker `pageId` (ikke indeks), siden sider kan
  hoppes over per person.
- Ett valgt produkt per fordel (radiovalg). Flervalg per kort er ikke avklart
  og bygges ikke.
- Anonym sesjon er nok til å vise løpet. Innlogging kommer senere (docs/10
  §3.3, simulert Vipps).
- Samtykker, `Order` og innsending er med vilje utsatt til CR-024.

## Avklarte punkter (bruker, 2026-10-12)
1. **Testdata:** ordentlige testdata fremfor en egen demo-rute. Seed-skriptet fra CR-022 utvides i denne CR-en til et realistisk (men åpenbart fiktivt) testsett: flere sider som følger eksempelkategoriene i docs/09 (til hjemmet, streaming og bredbånd, strøm, lokale tilbud, solskjerming, aviser, lesestoff, diverse), flere fordeler per side, noen med flere produkter og noen uten, og minst én fordel med web-overstyring og én med targeting. Ingen bilder (ingen opplasting er mulig fra seed), kortene har bilde-fallback. Seed kjøres manuelt og kjøres ikke av meg (ingen DB).
2. **Valg i klienten:** bruker var usikker på hva sessionStorage betyr. Forklart: valgene huskes bare i nettleseren mens fanen er åpen, og ingenting lagres hos oss. Beholdes slik som standard og kan endres senere.
3. **noindex:** bruker sa nei. Siden får ikke noindex.

## Dependencies
Bygger på CR-022 (`getWebFlow`, `WebFlow*`-typer) og CR-021 (`web_card`).
Åpner for CR-024 (bestilling) og admin-UI for sider og produkter.

## Implementation Notes (2026-10-12)
- Nytt: `src/app/(web)/` (layout, `flytting`, `flytting/[pageId]`,
  `flytting/oppsummering`), `src/components/web/` (FlowCard, FlowProgress,
  FlowNav, FlowEmpty, FlowSummary, `useFlowSelection`) og `src/lib/flow/`
  (`flowNavigation`, `flowSelection`, `selectionStore`). Ingen endring i
  eksisterende app, admin, middleware, schema eller queries.
- **Avvik fra CR-teksten (rettet i /review: knappetekst er konstant, «✓» er kun visuelt):** «første produkt er forhåndsvalgt» er ikke
  bygget. I stedet har hvert produkt sin egen knapp («Ja takk» ved ett
  produkt, «Velg» ved flere). Trykk velger, trykk igjen angrer, trykk på et
  annet produkt bytter. Det matcher dok 09 (lokalavis med to knapper) og
  unngår skjulte forhåndsvalg. Vil du ha forhåndsvalg, er det en liten endring.
- `sessionStorage` leses via `useSyncExternalStore` (ikke setState i effect,
  som lint-reglene fra CR-019 avviser). Verdien holdes også i minnet, så
  klient-navigasjon beholder valgene selv når lagring er blokkert. Dette er
  litt mer enn CR-teksten sa («virker også uten lagring»).
- Alle tre rutene bruker `getOrCreateSession()` og dermed sesjonens targeting.
- `<img>` er brukt med `eslint-disable`-kommentar slik at lint holder seg på
  de samme 3 gamle advarslene.
- Seed utvidet til et ordentlig testsett: 8 sider (eksempelkategoriene fra
  docs/09), 8 fiktive kunder, 13 fordeler. Dekker ett produkt, flere produkter
  og ingen produkter, web-overstyring av tittel, tekst og merketekst,
  vilkårstekst, targeting kun for Oslo-området (postnummer 0001-1299, krever
  postnummer i profilen) og en kladd som ikke skal vises. Transaksjonell og
  idempotent. **Ikke kjørt** (ingen DB).
- **Ikke gjort:** komponentene er ikke sett rendret og ikke klikket i
  nettleser. `/flytting` er ikke kjørt mot en database. Redirect, tom
  tilstand, tastatur og layout er derfor ikke verifisert, bare typesjekket,
  linted og bygget. Kryss av disse først når du har testet.
- Validering: tsc OK, lint 0 feil (3 gamle advarsler), vitest 233/233 (opp
  fra 203, 30 nye), build OK (rutene `/flytting`, `/flytting/[pageId]`,
  `/flytting/oppsummering` vises i build-output).
- Gjenstår: `/review`, commit, deploy, seed mot en database, og manuell test.

## Etterskrift (2026-10-12)
- Bruker bekreftet at det utvidede seed-skriptet er kjørt og fungerte. UI-kriteriene
  (redirect, tom tilstand, progresjon, valg, oppsummering, tastatur, mobil og desktop)
  er fortsatt ikke eksplisitt bekreftet i nettleser og står uavkrysset.
