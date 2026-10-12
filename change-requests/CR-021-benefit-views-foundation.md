# CR-021: Visninger av fordeler, grunnmur (arv med overstyring)

Status: Done (committed 010aeca, pushet, deployet, prod-sjekk OK av bruker 2026-10-12, /review PASSED)
Created: 2026-10-12
Approved: 2026-10-12

## Business Goal
Gjøre fordelen til én entitet som fylles ut én gang, og som kan vises på
flere flater med eget innhold der det trengs, og med varianter for A/B uten
at modellen blir kompleks (docs/10, beslutning 3 og 7, seksjon 3.2 og 5).
Dette er første steg. Det skal bevise modellen med den ene flaten som finnes
i dag (fordelskortet i appen), uten synlig endring for brukeren.

## Problem Statement
Dagens `Benefit` har ett sett innhold (tittel, kort tekst, ett bilde,
merketekst) som brukes overalt. Det finnes ingen måte å si «på denne flaten
skal tittelen eller bildet være et annet», og ingen måte å ha to varianter av
samme flate. `Hero` er en egen entitet med eget innhold. A/B-testing av
innhold og format (docs/10, seksjon 5) er derfor umulig uten å duplisere
fordeler.

## Proposed Solution
Skill **hva fordelen er** fra **hvordan den vises på en flate**:

- **Fordel (`Benefit`) er uendret** og holder kjerneinnholdet:
  `title`, `shortDescription`, `imageUrl`, `imageAlt`, `badgeText`.
- **Ny `BenefitView`**: en flate pluss en variant, som bare inneholder det
  som skal være *annerledes*. Alle innholdsfelt er valgfrie overstyringer.
  Fravær av rad betyr «arv alt fra fordelen», så **ingen bakfylling trengs**.
- **Format-register i kode** (`src/lib/views/formats.ts`): per format hvilke
  felt som kan overstyres og hvilke som kreves. Å legge til en flate senere er
  én ny oppføring, ikke en migrasjon. Dette steget har kun formatet
  `app_card` (fordelskortet i liste og rutenett).
- **Ren funksjon `resolveBenefitView(benefit, views, format, variant)`**
  (`src/lib/views/resolveBenefitView.ts`) som alltid returnerer en fullt
  utfylt visningsmodell. Regler:
  1. Overstyring (ikke tom og ikke bare mellomrom) vinner over kjerneinnhold.
  2. Bilde og alt-tekst løses **som et par**: overstyres `imageUrl`, brukes
     visningens `imageAlt` (kan være tom, da brukes tittelen), aldri
     fordelens alt-tekst sammen med et annet bilde.
  3. Finnes ikke den forespurte varianten, brukes `standard`. Finnes ikke den
     heller, brukes ren arv.
  4. Overstyring av felt som formatet ikke tillater ignoreres.
- **`mapBenefitCard` i `benefitQueries.ts`** går via resolveren for listen.
  Frontend (`BenefitCard.tsx`) og `BenefitCard`-typen er uendret. Frontend vet
  ingenting om arv, varianter eller tester.
- **Detaljsiden er ikke en visning.** `longDescription`, vilkår og innløsning
  forblir på fordelen.

### Utenfor scope (egne CR-er)
- Admin-UI for visninger, forhåndsvisning og «lag variant» (neste CR).
- Test-entitet, tildeling av variant fra person-ID og resultater.
- Flere formater (`app_hero`, `app_intro`, `web_card`, `email`).
- **`Hero` berøres ikke.** Den har egen CTA (fordel, kategori eller URL),
  prioritet, fallback og egen targeting, så heroer uten fordel finnes allerede.
  Om og hvordan hero blir en visning avgjøres sammen med docs/12 spm. 2.
- Kulepunkter og CTA-tekst finnes ikke på `Benefit` i dag og tas ikke med
  (tiltak 18 senere).
- Plassering (side og rekkefølge). Avventer docs/12 spm. 1.

## Impact Analysis

Affected Specs:
- [x] specs/entities.md (ny entitet BenefitView, relasjon på Benefit)
- [x] specs/api.yaml (ingen API-endring)
- [x] specs/flows.md
- [x] specs/architecture.md (ny modul `/lib/views`, `/lib/queries`-notat)
- [x] specs/nfr.md
- [x] specs/ui-spec.md

Affected Components:
- `prisma/schema.prisma` (ny `BenefitView`, enum for format og relasjon) og
  ny migrasjon
- Ny `src/lib/views/` (formats.ts, resolveBenefitView.ts, index.ts)
- `src/lib/queries/benefitQueries.ts` (include av views, mapBenefitCard)
- `src/types/app.ts` berøres ikke (BenefitCard uendret)

Database Impact: Ny tabell `benefit_views` (additiv):
`id`, `benefit_id` FK (uten kaskade, se Risks), `format` (tekst), `variant` (tekst, default
`standard`), nullable `title`, `text`, `image_url`, `image_alt`, `badge_text`,
`created_at`, `updated_at`. Unik på (`benefit_id`, `format`, `variant`).
Ingen endring på eksisterende tabeller og ingen bakfylling. `format` lagres
som tekst validert mot registeret i kode (ikke en Postgres-enum), slik at nye
formater ikke krever migrasjon.

API Impact: Ingen. Responsformen til listen er identisk.

UX Impact: Ingen synlig endring så lenge `benefit_views` er tom, og den er
tom etter dette steget fordi ingen UI skriver til den.

Security Impact: Ingen ny inngang. Ingen ny skrivevei i appen. Overstyringer
er tekst som vises i appen. Samme rendering som i dag (React escaper), og
ingen HTML tillates.

Performance Impact: Listespørringen får én ekstra relasjon (`views`) filtrert
på format og variant. Prisma batcher den som én ekstra spørring, ingen N+1.
Forventet volum er under 500 aktive fordeler.

## Acceptance Criteria
- [x] Uten rader i `benefit_views` er listen byte-for-byte lik dagens
      respons for alle eksisterende fordeler
- [x] En overstyring av tittel, tekst, bilde eller merketekst på
      `app_card/standard` gir det overstyrte innholdet på kortet og lar
      resten arves
- [x] Bilde og alt-tekst løses som par (regel 2)
- [x] Tom streng og bare mellomrom i en overstyring regnes som «ingen
      overstyring»
- [x] Forespurt variant som mangler faller tilbake til `standard`, så til
      ren arv
- [x] Overstyringer av felt formatet ikke tillater ignoreres
- [x] `BenefitCard`-typen og `BenefitCard.tsx` er uendret
- [x] Detaljsiden er uendret
- [x] `Hero` og heroqueries er uendret
- [x] `specs/entities.md` og `specs/architecture.md` er oppdatert før kode
- [x] `npx tsc --noEmit`, `npx vitest run`, `npm run lint` og
      `npm run build` er grønne

## Required Tests
- [x] Unit: `resolveBenefitView` (ren arv, hver overstyring, bilde/alt-par,
      tom og whitespace, variantfallback, ikke-tillatt felt, ukjent format)
- [x] Unit: format-registeret (`app_card` finnes, ukjent format avvises av
      hjelperen)
- [x] Integration: `getActiveBenefits` med mocket Prisma, både uten og med
      views-rad, og uendret respons uten
- [x] Manuell: migrasjonen er gått gjennom i prod etter deploy, og kortlisten
      ser lik ut (ingen lokal `DATABASE_URL`, se Risks)

## Rollback Strategy
Revert commit. Tabellen er ny og ubrukt, så gammel kode virker mot det nye
skjemaet. Skal tabellen fjernes, kjøres en migrasjon som dropper
`benefit_views` (ingen data å tape i dette steget).

## Migration Strategy
Én additiv Prisma-migrasjon, deployes på `master` som vanlig. Coolify kjører
`prisma migrate deploy` før oppstart. Ingen bakfylling, ingen jobb.

## Risks
- **Ingen lokal `DATABASE_URL`.** Migrasjonen verifiseres med
  `prisma migrate diff` mot gammelt skjema og i prod etter deploy (som for
  CR-020).
- **Sletting av fordel.** `Benefit` bruker soft delete (`deletedAt`), så
  visninger blir stående. Spørringene filtrerer allerede på `deletedAt`.
  Relasjonen settes uten kaskade.
- **Ubrukt modell i dette steget.** Ingen UI skriver til tabellen ennå, så
  overstyringsstien dekkes av enhets- og integrasjonstester, ikke av
  brukerbruk. Bevisst valg: modellen og resolveren bevises først, admin-UI
  kommer i neste CR. Bør ikke ligge ubrukt lenge.
- **To kilder til sannhet for kort-innhold** kan forvirre i admin til UI-et
  finnes. Mitigert ved at tabellen er tom og ingen skriver til den.
- **Hero som visning er foreløpig ikke avklart** og er holdt utenfor. Dok 10
  sier at hero blir en visning av en fordel, men prototypen har heroer uten
  fordel (CTA til kategori eller URL).

## Antakelser (docs/12: merkes tydelig)
- Første format er kun `app_card`. Øvrige formater i docs/10 (`app_hero`,
  `app_intro`, `web_card`, `email`) legges til som registeroppføringer når de
  trengs. Docs/12 spm. 3 sier at endelige flater ikke er bestemt.
- Visningens identitet i hendelser (`BenefitEvent.viewId`, CR-020) er
  `{format}:{variant}`, for eksempel `app_card:standard`, siden `benefitId`
  allerede ligger på hendelsen og implisitte visninger ikke har rad. Ikke
  tatt i bruk i dette steget.
- Visningen arver status, periode, regler og innløsning fra fordelen. Ingen
  egen periode per visning.
- Innholdsfelt som felter (kolonner), ikke JSON, siden settet er lite og
  stabilt og gir typing.

## Dependencies
Bygger på CR-020 (hendelser med `viewId`, `testId`, `variant`). Åpner for
neste CR-er: admin-UI for visninger, test og tildeling, flere formater, og
avklaring av hero.

## Implementation Notes (2026-10-12)
- Nytt: `src/lib/views/` (`formats.ts`, `resolveBenefitView.ts`, `index.ts`),
  `BenefitView` i schema, migrasjon `20261012100000_cr021_benefit_views`
  (SQL tatt fra `prisma migrate diff`, ikke kjørt mot DB), og
  `getActiveBenefits` går via resolveren med `views: { where: { format:
  'app_card' } }`. `BenefitCard`-typen og `BenefitCard.tsx` er uendret.
- Variantvalg gjøres i resolveren: forespurt variant, ellers `standard`, ellers
  ren arv. En variant arver fra fordelen, ikke fra `standard`-raden (testet).
  Alle kall bruker `standard` i dette steget.
- Alt-tekst alene kan overstyres uten nytt bilde (da brukes fordelens bilde).
  CR-teksten sa bare at bilde og alt løses som par når bildet overstyres.
- **Ikke dekket, bevisst:** de lagrede fordelene (`savedQueries`
  via `mapBenefitCardFromSaved`) viser fortsatt kjerneinnhold og ikke
  visningen, siden CR-en kun nevnte listen. Bør tas med når admin-UI kommer,
  ellers viser lagret-siden annen tekst enn listen når en overstyring finnes.
  Sidene `/`, `/benefits` og `/nearby` bruker `getActiveBenefits` og får
  visningen.
- Validering: tsc OK, lint 0 feil (3 gamle advarsler), vitest 187/187 (opp
  fra 162, 25 nye), build OK.
- Gjenstår: `/review`, commit, deploy, og sjekk i prod at migrasjonen gikk
  gjennom og at kortlisten ser lik ut.
