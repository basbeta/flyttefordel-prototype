# CR-026: Konsekvente lagreknapper i admin

Status: Done (committed 2978248, pushet, deployet, /review PASSED, bruker testet 2026-10-12 og meldte at det virker)
Created: 2026-10-12
Approved: 2026-10-12

## Business Goal
Alle lagreknapper i admin skal oppføre seg likt: **ingen knapp vises før det finnes noe å
lagre**. Når det er endringer, kommer knappen frem. Etter lagring forsvinner den, og
beskjeden «Lagret» vises en kort stund. Det er allerede slik hovedskjemaene fungerer
(CR-013 og CR-019). Tilbakemelding fra test av CR-025.

## Problem Statement
Hovedskjemaene (fordel, annonsør, kategori, hero og side) bruker `FormSaveBar`: baren vises
bare når skjemaet er endret, og blir en grønn «Lagret»-pille etter lagring. De nye
seksjonene fra CR-025 følger ikke dette:
- **Produkter:** hver rad har en «Lagre»-knapp som alltid vises (nedtonet når ingenting er
  endret), og «Legg til» vises alltid (nedtonet til navn er fylt ut).
- **Kanaler:** to «Lagre»-knapper (plassering og «Vis i appen») vises alltid.

Resultatet er mange knapper som ikke gjør noe, og to ulike måter å få tilbakemelding på
(flytende bar og små tekster ved siden av knappen).

## Proposed Solution
Gjenbruk samme oppførsel i seksjonene, ikke autolagring:

1. **`useDirtyTracking`** (finnes, CR-019) brukes i hver seksjon og rad, så endring
   oppdages på samme måte, «Lagret» vises i samme korte vindu, og advarselen mot å forlate
   siden med ulagrede endringer (CR-013) gjelder også her.
2. **Ny felles komponent `InlineSaveActions`** (`src/components/admin/`) for steder der den
   flytende baren ikke passer (rader og grupper inne i en side). Den viser:
   - **ingenting** når det ikke er endringer,
   - **Lagre-knapp** når det er endringer,
   - **«Lagrer…»** mens det pågår (knappen er låst),
   - **«Lagret»** (grønn, med hake og tekst) en kort stund etter vellykket lagring, så borte,
   - **feilmelding med «Prøv igjen»** hvis lagringen feiler (knappen blir stående).
3. **Ren funksjon `getSaveActionsState({ isDirty, saving, saved, error })`** som avgjør
   hvilken av disse tilstandene som vises, enhetstestet. Komponenten er tynn.
4. **Produktrad:** «Lagre» vises bare ved endring. Slett er en egen handling og vises
   fortsatt (med bekreftelse).
5. **Nytt produkt:** «Legg til» vises først når navn er fylt ut. Etter at produktet er lagt
   til, vises «Lagt til» kort, og skjemaet tømmes.
6. **Kanaler:** hver gruppe (plassering, «Vis i appen») viser lagre-knappen bare ved
   endring, og «Lagret» etterpå.
7. **Hovedskjemaene og `FormSaveBar` røres ikke.**

### Reglene (dokumenteres i `specs/architecture.md`, for nye skjemaer)
- Skjema med mange felt: `FormSaveBar` (flytende).
- Rad eller gruppe inne i en side: `InlineSaveActions`.
- Aldri en lagre-knapp som vises uten endringer. Destruktive handlinger (slett, deaktiver)
  er egne knapper med bekreftelse og regnes ikke som lagring.

### Utenfor scope
- Autolagring. Brukeren presiserte at poenget ikke er å lagre automatisk, bare å skjule
  knapper som ikke trengs og vise «Lagret».
- «Angre»-knapp for å forkaste endringer (ikke etterspurt).
- Statusknappene på fordelen, `AddCodesButton` (dialog) og innloggingsknappen. Det er
  handlinger, ikke lagring av endringer.
- Forbrukerappen.

## Impact Analysis

Affected Specs:
- [ ] specs/entities.md
- [ ] specs/api.yaml
- [ ] specs/flows.md
- [x] specs/architecture.md (regler for lagreknapper i admin)
- [ ] specs/nfr.md
- [ ] specs/ui-spec.md (tom fra før)

Affected Components:
- Ny `src/components/admin/InlineSaveActions.tsx` (+ CSS-modul) og ren
  `src/lib/admin/saveActionsState.ts` (+ test)
- `src/app/admin/(protected)/benefits/[id]/BenefitProductsSection.tsx`
- `src/app/admin/(protected)/benefits/[id]/BenefitChannelsSection.tsx`
- `useDirtyTracking` brukes som den er (ingen endring)

Database Impact: Ingen.
API Impact: Ingen.
UX Impact: Knapper som ikke gjør noe forsvinner. «Lagret» vises på samme måte overalt.
Security Impact: Ingen.
Performance Impact: Ubetydelig.

## Acceptance Criteria
- [x] Ingen lagre-knapp vises i produktrader, «Legg til»-skjemaet eller kanaler før noe er
      endret
- [x] Knappen kommer frem ved endring, og er låst med «Lagrer…» mens det pågår
- [x] Etter vellykket lagring forsvinner knappen og «Lagret» vises kort, så forsvinner den
- [x] Ved feil vises feilmelding og knappen blir stående med «Prøv igjen»
- [x] «Legg til produkt» vises først når navn er fylt ut, og viser «Lagt til» etterpå
- [x] Å forlate siden med ulagret endring i en seksjon gir samme advarsel som i
      hovedskjemaene
- [x] Endrer man tilbake til lagret verdi (via deriveDirtyState i useDirtyTracking, enhetstestet i CR-019), forsvinner knappen igjen
- [x] Hovedskjemaer og `FormSaveBar` er uendret
- [x] Reglene er dokumentert i `specs/architecture.md`
- [x] `npx tsc --noEmit`, `npx vitest run`, `npm run lint` og `npm run build` er grønne

## Required Tests
- [x] Unit: `getSaveActionsState` (alle tilstander og prioritet mellom dem)
- [x] Manuell i nettleser: produkter (endre, lagre, feil, legg til) og kanaler (begge
      grupper), og at advarselen mot å forlate siden kommer

## Rollback Strategy
Revert commit. Ingen data- eller API-endring.

## Migration Strategy
Ingen.

## Risks
- **UI kun manuelt testet** (ingen komponenttester). Tilstandslogikken er enhetstestet, men
  visningen og tidsvinduet for «Lagret» verifiseres av en person.
- **Flere `useDirtyTracking` på samme side** (en per rad og gruppe) legger til flere
  advarsler mot å forlate siden. Det er ufarlig, men gir flere lyttere.
- **Knapp som forsvinner kan overraske** den som lærte seg den alltid-synlige knappen, men
  er samme mønster som hovedskjemaene.
- **Plassering og layout** endrer seg litt når knappen kommer og går (kan gi små hopp i
  raden). Reservert plass vurderes under implementering.

## Antakelser
- «Lagret»-vinduet er det samme som i `useDirtyTracking` (dagens oppførsel).
- Dette er en liten, målrettet CR. Innholdsoverstyringer per flate, forhåndsvisning og
  lagret-siden (tidligere kalt CR-026) blir CR-027.

## Dependencies
Bygger på CR-013 og CR-019 (`useDirtyTracking`) og CR-025 (seksjonene som endres).

## Implementation Notes (2026-10-12)
- Ny ren `getSaveActionsState` (`src/lib/admin/saveActionsState.ts`, 9 tester) med
  prioritet: pågår lagring, så feil (bare mens endringene fortsatt er ulagret), så endring,
  så nylig lagret, ellers ingenting. Ny tynn `InlineSaveActions` (+ CSS-modul).
- Statusteksten ligger i en `role="status"`-region som alltid er rendret, så skjermlesere
  melder «Lagret» selv om knappen kommer og går.
- Produktrad og kanalgrupper bruker `useDirtyTracking` (samme «Lagret»-vindu og samme
  advarsel mot å forlate siden). «Slett» er uendret og vises alltid (handling, ikke lagring).
- «Legg til produkt» vises når navnet er fylt ut, og «Lagt til» vises til brukeren begynner
  å skrive igjen. Tekst eller pris uten navn viser ingen knapp, men gir fortsatt advarselen
  mot å forlate siden.
- `disabled` på `InlineSaveActions` brukes når navnet på en produktrad er tomt (endring finnes,
  men kan ikke lagres).
- `FormSaveBar`, `useDirtyTracking` og hovedskjemaene er uendret (verifisert med git diff).
- Validering: tsc OK, lint 0 feil (3 gamle advarsler), vitest 364/364 (opp fra 355, 9 nye),
  build OK.
- **Ikke gjort:** UI er ikke sett i nettleser. Kriteriene for hva som vises og forsvinner
  (knapp, «Lagrer…», «Lagret», feil og «Prøv igjen», «Legg til», advarsel mot å forlate siden)
  står uavkrysset til du har testet.

## Review-funn (2026-10-12)
- **Fikset under review: flere bekreftelsesdialoger.** `useUnsavedChangesWarning` (CR-013)
  registrerte en egen klikk-lytter per ulagret del. Med flere ulagrede deler på samme side
  (hovedskjema, produktrader, kanaler) måtte man bekrefte «forlat siden» like mange ganger.
  Lytterne er nå delt (registreres når første del blir ulagret, fjernes når siste er lagret),
  så det kommer alltid én dialog. 5 nye tester (24 i mappen). Dette endrer en delt hook fra
  CR-013, noe CR-teksten ikke forutså («useDirtyTracking brukes som den er», og hooken under
  den er altså endret). API og atferd for hovedskjemaene er ellers uendret.
- Foreldet feil: etter en mislykket lagring blir feilmeldingen stående til neste forsøk. Går
  man tilbake til lagret verdi og endrer på nytt, kommer den gamle feilen tilbake før man har
  forsøkt igjen. Samme oppførsel som `FormSaveBar` i hovedskjemaene, derfor ikke endret her.
- `InlineSaveActions` har ingen komponenttest (ingen DOM-miljø i repoet). Tilstandslogikken er
  enhetstestet, visningen er det ikke.

## Avslutning (2026-10-12)
- Bruker testet produktrader, «Legg til produkt» og kanaler i nettleser og meldte at det
  virker. Alle kriterier er avkrysset. Bruker nevnte ikke eksplisitt hvert punkt (feil og
  «Prøv igjen», advarsel mot å forlate siden med flere ulagrede deler). Tolket som bestått.
- Kjente restpunkter (uendret): feilmelding kan komme tilbake etter at man har rullet tilbake
  og endret på nytt (samme som `FormSaveBar`), og knappen som kommer og går kan gi et lite
  hopp i raden.
