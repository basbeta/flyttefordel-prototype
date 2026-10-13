# CR-029: Utvelgelsesfunksjon (hvilke fordeler er en person kvalifisert for)

Status: Implementert, /review PASSED (2026-10-13), IKKE Done: ikke deployet, migrasjon og demo-seed ikke kjørt, e2e ikke kjørt mot prod
Approved: 2026-10-13
Created: 2026-10-13

## Business Goal
Én funksjon som svarer på «gitt person og tidspunkt, hvilke fordeler er personen kvalifisert for»
(docs/10 §4), brukt likt av appen, web-løpet og senere e-post. Nå som innlogget person finnes
(CR-028) kan reglene bruke mer enn postnummer og en grov flyttestatus: tid siden flytting,
boligtype og hva personen har valgt før (kryssalg). Det er forutsetningen for A/B-tildeling og
for e-postkampanjer som «utvalg kjørt mot utvelgelsen».

## Problem Statement
I dag finnes utvelgelsen som `matchesSession` (CR-005): postnummer, postnummerintervall og en
eksplisitt flyttestatus (`recently_moved` osv.), lest fra sesjonen. Den kalles separat fra fire
steder (`getActiveBenefits`, `getWebFlow`, `getActiveHeroes`, «I nærheten»), og hvert sted
gjentar status-, dato- og `showInApp`-filtrene sine. Konsekvenser:
- Regler kan ikke uttrykke tid siden flytting (flyttedatoen på personen brukes ikke), boligtype
  eller tidligere valg.
- Hver flate kan drifte fra de andre, og det finnes ingen måte å svare «hvorfor ser ikke denne
  personen fordel X?».
- `municipalities` og `counties` finnes på `TargetingRule`, men leses aldri.

## Proposed Solution

### 1. Ny modul `src/lib/selection` (ren, ingen I/O)
- Typen `SelectionPerson`: `postcode`, `movingStatus`, `movedAt` (dato), `housingType`,
  `chosenBenefitIds` (hva personen har valgt før).
- `isQualified(rule, person, now)`: ren funksjon. **Supersett av `matchesSession`**: eksisterende
  regler (uten de nye feltene) gir nøyaktig samme svar som i dag.
- `explainSelection(rule, person, now)`: samme logikk, men returnerer hvilke kriterier som
  slo ut (`['postcode', 'daysSinceMove']`), for testing og feilsøking. Brukes av testene og
  kan senere vises i admin.
- `matchesSession` blir en tynn wrapper over den nye funksjonen, så eksisterende kall og tester
  er uendret.

### 2. Nye regeldimensjoner på `TargetingRule` (additivt, alle valgfrie)
| Felt | Betydning |
|---|---|
| `daysSinceMoveMin`, `daysSinceMoveMax` | Heltall dager siden flyttedato, begge grenser inkludert. Negativt = før flytting («skal flytte»). Eksempel: 0 til 60 = første 60 dager etter flytting. |
| `housingTypes` (json) | Tillatte boligtyper (`enebolig`, `leilighet`, `rekkehus`, `annet`). |
| `requiresChosenBenefitIds` (json) | Vises bare for personer som har valgt minst én av disse fordelene (kryssalg). |
| `hideIfChosen` (boolean, default false) | Skjul fordelen for personer som allerede har valgt den. |

Dager regnes som hele kalenderdager i UTC mellom flyttedato og `now`. Uten ny regel er alt som
før.

### 3. Hva «har valgt» betyr
`chosenBenefitIds` = fordelene personen har bestilt i web-løpet (`OrderLine` på ordre med
`personId`, CR-028). Én spørring per forespørsel, bare når personen er innlogget. Lead, lagret og
hentet kode regnes ikke med nå.

### 4. Én inngang for alle flater
- Ny `selectForPerson`-hjelper (i `src/lib/queries`) som laster person og historikk én gang og
  gir `SelectionPerson`.
- `getActiveBenefits`, `getWebFlow`, `getActiveHeroes` og «I nærheten» bruker `isQualified` i
  stedet for `matchesSession` direkte. Live-sjekken for fordeler (status, datoer, `showInApp`)
  samles via den eksisterende `isBenefitLive` der det går uten å endre atferd.
- Hero-reglene bruker samme funksjon (`fallback`-logikken er uendret).

### 5. Admin
Målgruppe-delen av fordelsskjemaet (og hero-skjemaet, siden de deler `TargetingRule`) får de nye
feltene. Zod-validering i eksisterende admin-ruter, samme mønster som dagens targeting-felt.

### Utenfor scope (egne CR-er)
- Admin-side «forhåndsvis som person» som viser alle fordeler med begrunnelse (bruker
  `explainSelection`, men er egen UI).
- A/B-tildeling og test-entitet.
- Kommune og fylke (krever oppslag fra postnummer, data finnes ikke).
- Samtykke som filter (finnes ikke i modellen ennå).
- Hendelser og rapportering v2, «Mest valgt», sosiale bevis.
- Fortsatt egen definisjon av flyttefaser (`movingStatus` er uendret, den nye dagsregelen
  kommer i tillegg, se åpent punkt 3).
- Utvelgelse før innlogging (app-intro finnes ikke).
- E-post.

## Impact Analysis

Affected Specs:
- [x] specs/entities.md (`TargetingRule` utvidet)
- [ ] specs/api.yaml (ingen nye endepunkter, admin-ruter får flere felt i body)
- [x] specs/flows.md (utvelgelse for en person)
- [x] specs/architecture.md (`/lib/selection`, avhengighetsregel)
- [ ] specs/nfr.md
- [ ] specs/ui-spec.md (tom fra før)

Affected Components:
- Ny `src/lib/selection/` (`isQualified`, `explainSelection`, typer) + tester
- `src/lib/targeting/index.ts` (`matchesSession` blir wrapper)
- `src/lib/queries/benefitQueries.ts`, `flowQueries.ts`, `heroQueries.ts`, nær-deg-siden
- Ny hjelper for person og historikk (`src/lib/queries`), bruker `OrderLine`
- `src/lib/session/index.ts` eller kallesteder som i dag sender `session` som targeting-kontekst
- Admin: `BenefitForm`, `HeroForm`, de fire admin-rutene som skriver targeting, `flowSchemas`/zod, `adminQueries`
- `prisma/schema.prisma` og migrasjon

Database Impact: Additiv migrasjon på `targeting_rules`: `days_since_move_min` og
`days_since_move_max` (int, nullable), `housing_types` og `requires_chosen_benefit_ids` (jsonb,
nullable), `hide_if_chosen` (boolean, default false). Ingen bakfylling, eksisterende regler får
`null`/`false` og oppfører seg som før.

API Impact: Ingen nye endepunkter. Admin-ruter for fordel og hero tar imot de nye feltene.
Offentlige svar er uendret (utvelgelse skjer server-side, begrunnelser forlater aldri serveren).

UX Impact: Appen og web-løpet kan vise andre fordeler for personer som får de nye reglene
(det er hensikten). Uten nye regler ingen endring. Admin får flere felt.

Security Impact: Ingen ny auth-flate. Personens historikk (valg) brukes bare server-side til
utvelgelse og returneres ikke. `explainSelection` brukes ikke i offentlige svar.
Person-ID kommer fra middleware-headeren (verifisert token), aldri fra klienten. Valgte fordeler er
personopplysninger og må ikke logges.

Performance Impact: Én ekstra spørring per forespørsel for innloggede (valgte fordeler).
Utvelgelsen er fortsatt i minnet som i dag (DB-utvalget filtreres etter henting), uendret
skaleringsgrense (se DECISIONS 2026-05-22).

## Acceptance Criteria
- [x] `isQualified` gir samme svar som `matchesSession` for alle eksisterende regler
      (alle dagens targeting-tester består uendret)
- [x] `daysSinceMoveMin/Max` slår til og fra på riktig dag (grenser inkludert), også negative verdier
- [x] `housingTypes`, `requiresChosenBenefitIds` og `hideIfChosen` fungerer, alene og sammen med
      postnummer og flyttestatus
- [x] Manglende persondata (ingen flyttedato eller boligtype) behandles som bestemt i åpent punkt 1
- [x] Appens liste, web-løpet, heroer og «I nærheten» bruker samme funksjon
- [x] `explainSelection` oppgir alle kriterier som slo ut
- [x] Admin kan sette de nye feltene på fordel og hero, med validering
- [x] Person med bestilling på en fordel ser den ikke med `hideIfChosen`, og får kryssalgsfordelen
      med `requiresChosenBenefitIds`
- [x] `specs/*` er oppdatert før kode
- [x] `npx tsc --noEmit`, `npx vitest run`, `npm run lint` og `npm run build` er grønne
- [ ] E2E mot prod (e2e-tester) bekrefter at de seedede personene får forventet utvalg

## Required Tests
- [x] Unit: `isQualified` per dimensjon og kombinasjoner, grensedager (inkl. skuddår og
      månedsskifte), negative dager, tomme/ugyldige json-felt, `null`-regel, `appliesNationally`
- [x] Unit: `explainSelection` (hvilke kriterier, flere samtidig)
- [x] Unit: regresjon, `matchesSession` mot `isQualified` for et sett eksisterende regler
- [x] Integration (mocket Prisma): `getActiveBenefits`, `getWebFlow` og `getActiveHeroes` for
      personer med ulike data, inkl. person med og uten tidligere valg
- [x] Integration: admin-ruter validerer og lagrer de nye feltene
- [ ] E2E: smoke-suiten utvides med forventet utvalg per seedet person (krever at seeden har regler
      som bruker de nye dimensjonene)
- [ ] Manuell: sett en regel i admin og se effekten som to ulike testpersoner

## Rollback Strategy
Revert commit(s). Migrasjonen er additiv og kan bli liggende. Lagrede regler med de nye feltene
ignoreres da av gammel kode (feltene leses ikke), og oppfører seg som uten de nye kriteriene.

## Migration Strategy
Additiv migrasjon, kjøres ved deploy. Ingen bakfylling. Ingen ny miljøvariabel. Hvis seeden
utvides med regler som bruker de nye feltene, må `db:seed-flow` kjøres på nytt (idempotent).

## Risks
- **Atferdsendring i fire flater samtidig.** Mitigert av at `matchesSession` blir wrapper og
  eksisterende tester ikke endres, men en feil i den nye funksjonen treffer alle flater.
- **Avvikende definisjon av «nylig flyttet».** `movingStatus` (eksplisitt, 60 dager i prototypen)
  og dagsregelen (fra `movedAt`) kan gi motstridende svar for samme person, særlig for
  testpersoner som er opprettet med feil kombinasjon. Faseenhetlig definisjon er egen CR.
- **Manglende data gir stille utelukkelse.** En regel med dagsgrense skjuler fordelen for alle uten
  flyttedato. Det er riktig etter åpent punkt 1, men kan overraske i admin.
- **Historikk er bare web-bestillinger.** Personer som har fått fordelen på andre måter (lead,
  kode) regnes ikke som «har valgt».
- **Admin-skjemaet blir større.** Flere felt i en seksjon som allerede er tung.
- **Persondata:** Valg per person brukes til utvelgelse. Ingen avklart lagringstid (samme åpne
  punkt som CR-024 og CR-028).
- **Ytelse:** Utvelgelse i minnet, én spørring til per forespørsel. Uendret grense.
- **Ingen lokal `DATABASE_URL`.** Testes mot mocket Prisma og e2e i prod.

## Antakelser (docs/12: merkes tydelig)
- Boligtype-listen er den samme faste listen som i CR-028 (en gjetning).
- Dagsregelen bruker UTC-kalenderdager. Tidssone er en gjetning for prototypen.
- «Valgt» betyr bestilt i web-løpet. Definisjonen kan utvides senere uten å endre kontrakten.
- Eksisterende regler uten de nye feltene skal oppføre seg identisk.

## Avklarte punkter (bruker, 2026-10-13: «anbefalt på alle»)
1. **Avklart: streng** (personen kvalifiserer ikke), unntatt postnummer som beholder `includeUnknownLocation`. (Spørsmål: Manglende data:) Hva skal skje når en regel krever flyttedato eller boligtype og personen
   mangler den? Anbefaling: personen kvalifiserer **ikke** (streng), unntatt postnummer som
   beholder dagens `includeUnknownLocation`.
2. **Avklart: bare web-bestillinger.** (Spørsmål: «Har valgt»:) Bare bestillinger i web-løpet (anbefalt nå), eller skal også lead, lagret og
   hentet kode regnes med?
3. **Avklart: behold `movingStatus`, dagsregelen kommer i tillegg.** (Spørsmål: Flyttefaser:) Beholde `movingStatus` som den er og legge dagsregelen i tillegg (anbefalt), eller
   la dagsregelen erstatte `movingStatus` slik at det blir én definisjon? (docs/10 §3.4 nevner 60
   mot 180 dager.)
4. **Avklart: admin-felt tas med i samme CR.** (Spørsmål: Admin i samme CR:) Ta de nye feltene i målgruppe-seksjonen med her (anbefalt, ellers kan
   reglene ikke settes), eller dele i utvelgelse nå og admin-felt som egen CR?
5. **Avklart: heroer bruker samme funksjon og felt.** (Spørsmål: Heroer:) Bruke samme funksjon og de nye feltene også for heroer (anbefalt, de deler
   `TargetingRule`)?
6. **Avklart: seeden utvides med fordeler som bruker de nye reglene.** (Spørsmål: Seed:) Skal jeg utvide `db:seed-flow` med et par fordeler som bruker de nye reglene, så
   e2e-testen kan bevise effekten per testperson (anbefalt)?

## Dependencies
Bygger på CR-005 (targeting), CR-022 (web-løpets lesemodell), CR-024 og CR-028 (bestilling og
person-ID), CR-025/027 (admin og visninger). Åpner for A/B-tildeling og e-postkampanjer.

## Implementation Notes (2026-10-13)
- Alle seks åpne punkter avklart («anbefalt på alle»).
- Ny `src/lib/selection/`: `isQualified`/`explainSelection` (ren), `types`, `loadPerson` (eneste I/O,
  leser flyttedato, boligtype og tidligere bestillinger, logger bare feilnavn), `demo` (delt data for
  seed, test og e2e). `matchesSession` er en tynn wrapper. Regresjonstest sammenligner mot en frossen
  kopi av den gamle funksjonen over 5000+ kombinasjoner av regel og person: ingen avvik.
- Semantikk: gammel del (postnummer, status, `appliesNationally`, `includeUnknownLocation`) og nye kriterier
  må alle bestå. De nye er uavhengige av `appliesNationally` (flagget handler om lokasjon).
  Streng på manglende data. Dager er hele UTC-kalenderdager.
- `getOrCreateSession` henter nå ekstradata for innlogget person (to spørringer per forespørsel), og
  `SessionData` har valgfrie felt. **Funn under implementering:** bestillingsruten sendte bare postnummer
  og status til linjevalideringen, så en person som så et kryssalgskort ville fått bestillingen avvist.
  Ruten sender nå hele utvelgelsesdataen (testet).
- Admin: fire ruter hadde hver sin kopi av targeting-skjemaet, samlet i `lib/admin/targetingSchema.ts`
  (nye felt utelatt = uendret ved oppdatering, så en gammel admin-side ikke nullstiller dem). Delt
  komponent `SelectionFields` brukes i fordels- og hero-skjemaet (hero uten «skjul etter valg»).
  Ren hjelper `selectionFields.ts` er testet.
- Migrasjon `20261013100000_cr029_selection_rules` er additiv (5 kolonner på `targeting_rules`), SQL fra
  `prisma migrate diff`, IKKE kjørt mot DB.
- Ny seed `npm run db:seed-selection` (idempotent per slug) med seks demo-fordeler. En enhetstest beviser at
  personas og regler gir nøyaktig tabellen i seeden. Den eksisterende `db:seed-flow` er uendret (den hopper
  over når `demo-`-fordeler finnes, så den ville ikke fått med de nye).
- E2E: `scripts/qa/smoke.py` har ny seksjon som sjekker forventet utvalg per seedet person i appen og i
  web-løpet, og kryssalg med en ny testperson hver gang (bestiller grunnpakken, den skjules, kryssalget
  vises og kan bestilles, uten grunnpakke avvises det med 400). Hoppes over til seeden er kjørt.
- Validering: tsc OK, lint 0 feil (3 gamle advarsler), vitest 596/596 (opp fra 574, 90 nye siden CR-028),
  build OK, suiten mot prod 98/98 (utvelgelsesdelen hoppet over).
- **Kjente begrensninger:** (1) Skjult betyr ikke utilgjengelig: detaljsiden `/benefits/[slug]`, lagring og
  claim-code har aldri brukt targeting, og gjør det fortsatt ikke. (2) Testpersonenes flyttedatoer eldes
  (kjør `db:seed-persons` på nytt, ellers faller «første 60 dager» bort for de to «nylig flyttet»-personene
  etter 50 og 20 dager). (3) E-post, A/B og admin-forhåndsvisning «som person» er ikke med.
- **Ikke gjort:** UI ikke sett i nettleser, migrasjon og seed ikke kjørt mot DB, e2e ikke kjørt mot prod.
- **Utrulling:** (1) push (Coolify kjører migrasjonen), (2) `npm run db:seed-persons` (oppdaterer datoene,
  hvis ikke kjørt nylig), (3) `npm run db:seed-selection`, (4) kjør e2e-tester.
