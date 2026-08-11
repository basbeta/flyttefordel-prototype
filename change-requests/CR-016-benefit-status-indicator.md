# CR-016: Tydelig statusindikator for fordeler (Aktiv/Planlagt/Kladd/Feilet)

Status: Implementert — venter på manuell verifisering i nettleser
Created: 2026-08-11

## Business Goal
Admin skal umiddelbart kunne se om en fordel faktisk er live, planlagt frem i tid, en kladd, eller har et reelt konfigurasjonsproblem — uten å måtte tolke rå status-tekst eller grave i detaljfelter.

## Problem Statement
`Rediger fordel`-siden viser i dag ingen statusindikator i det hele tatt øverst — kun tittelen "Rediger fordel". Fordelsoversikten (`/admin/benefits`) har en statuskolonne, men fargekodingen følger den rå databasestatusen (`draft`, `scheduled`, `active`, `paused`, `expired`, `archived`) uten å fange opp at en fordel kan stå som "aktiv"/"planlagt" i databasen mens den i praksis er ødelagt (mangler rabattkode/lenke, tom kodepool, eller har en sluttdato som allerede har passert). Det finnes ingen "feilet"-status i datamodellen i dag.

## Proposed Solution
Innfør en **beregnet visningsstatus** (4 bøtter, ingen ny databasekolonne/enum-verdi) som brukes til farge + etikett på both stedene:

- **Grønn — "Aktiv"**: `status = active`, ingen registrert problem (se under)
- **Gul — "Planlagt"**: `status = scheduled`, ingen registrert problem
- **Grå — "Kladd" / "Pauset" / "Arkivert"**: `status` i (`draft`, `paused`, `archived`, `deleted`) — beholder sin egen tekst-etikett, men samme grå farge for alle (bruker-bekreftet: pauset og arkivert "har samme effekt" som kladd — ikke live)
- **Rød — "Feilet"**: `status` i (`active`, `scheduled`) MEN et reelt problem er oppdaget, ELLER `status = expired` (beholder etiketten "Utløpt", men grupperes visuelt med "feilet"-bøtta siden begge betyr "leverer ikke som konfigurert")

**"Reelt problem" (beregnet, ren funksjon, ingen I/O) foreligger når minst ett av:**
1. `endsAt` er satt og ligger i fortiden, men status fortsatt er `active`/`scheduled` (ville ikke vist seg for sluttbruker, jf. `benefitQueries.ts` sin dato-filtrering — status har ikke fanget opp at fordelen i praksis er utløpt)
2. `status = active` og `startsAt` er satt i fremtiden (datainkonsistens — burde vært `scheduled`)
3. Manglende påkrevd redemption-innhold for `redemptionType`:
   - `generic_code` uten `genericCode`
   - `qr_code` uten `qrValue`
   - `external_link` uten `externalUrl`
   - `unique_code` uten koblet kodepool, ELLER kodepool har `availableCodes <= 0`
   - `lead_form` uten koblet leadform
   - `info_only` sjekkes aldri (krever ingen redemption-innhold)

Ny, ren, testbar funksjon (ingen databasekall) beregner bøtte + evt. problemliste fra data som allerede hentes av `getAdminBenefitById` (rediger-siden). `getAdminBenefits` (oversikten) må utvides til å inkludere `redemption` + `redemption.codePool.availableCodes` i query'en (finnes ikke der i dag) for at oversikten skal kunne beregne samme bøtte.

UI: ny delt badge-komponent brukt på begge steder. Ved "Feilet" vises en kort forklaring (hvilket problem) som tooltip/undertekst, ikke bare fargen — for å faktisk hjelpe admin å rette feilen, ikke bare flagge den.

Ingen endring i selve `BenefitStatus`-enumet, ingen migrasjon, ingen endring i hvordan admin setter status (samme dropdown/handlinger som i dag).

## Impact Analysis

Affected Specs:
- [x] specs/entities.md — lagt til note under `BenefitStatus` som dokumenterer den beregnede visningsstatusen som UI-konsept, ikke et lagret felt
- [x] specs/architecture.md — ny `/lib/benefits`-modul-rad i Module Map + migreringsnotat
- [x] specs/api.yaml — ingen endring (ingen ny/endret API-kontrakt, kun ekstra felter i eksisterende admin-query)
- [ ] specs/ui-spec.md — ikke oppdatert. Filen er en ufylt mal (kun placeholder-tokens) og har aldri blitt populert av noen tidligere admin-CR (CR-012/CR-013 har heller ikke krysset av her) — samme, allerede eksisterende gap, ikke noe denne CR-en introduserer

Affected Components:
- `src/lib/benefits/displayStatus.ts` (NY) — ren funksjon `getBenefitDisplayStatus(input, now)` + `displayStatus.test.ts` (24 tester)
- `src/lib/queries/adminQueries.ts` — `getAdminBenefits()` include utvidet med `redemption: { include: { codePool: { select: { availableCodes: true } } } }`; `AdminBenefitRow`-typen (`src/types/admin.ts`) utvidet med `redemptionType` + `redemption`. Ny `src/lib/queries/benefits.test.ts` (3 tester, følger eksisterende mock-mønster fra `analytics.test.ts`/`profitability.test.ts`)
- `src/components/admin/BenefitStatusBadge.tsx` + `BenefitStatusBadge.module.css` (NYE) — delt badge-komponent med **egne** bucket-CSS-klasser (`.bucket-active/-scheduled/-draft/-failed`), IKKE en utvidelse av `AdminTable.module.css` sine `.status-*`-klasser som opprinnelig antatt — de klassene gjenbrukes fortsatt uendret av Heroer-siden (`heroes/page.tsx`) med rå `HeroStatus`-verdier, og å endre dem der ville regredert Hero-fargekodingen (utenfor denne CR-ens scope)
- `src/app/admin/(protected)/benefits/[id]/page.tsx` — badge + reasons-liste rett under page header
- `src/app/admin/(protected)/benefits/page.tsx` — badge i statuskolonnen, gjenbruker samme komponent (uten reasons-liste, kun tooltip via `title`)
- `specs/architecture.md`, `specs/entities.md` — se Affected Specs

Database Impact: Ingen. Ingen migrasjon, ingen nytt felt/enum-verdi.
API Impact: Ingen endring i eksisterende endepunkter/kontrakter. `getAdminBenefits()` sitt Prisma-query utvides internt (samme funksjonssignatur).
UX Impact: Fargen på "Pauset" endres fra gul til grå — admin som er vant til gul for pauset må venne seg til ny farge. "Planlagt" endres fra blå til gul. Nytt: en fordel som står som "Aktiv"/"Planlagt" i databasen kan nå vises som rød "Feilet" med forklaring — dette er en ny, synlig advarsel admin ikke har sett før (positivt — avdekker eksisterende, usynlige feilkonfigurasjoner).
Security Impact: Ingen — ren lesing/visning, ingen nye tilganger eller datalekkasje (samme felter er allerede admin-synlige i dag).
Performance Impact: Marginalt — `getAdminBenefits()` sitt query henter nå også `redemption`+`codePool`-relasjonen for hver fordel i listen (samme mønster som `getAdminBenefitById` allerede gjør for én fordel). Ubetydelig ved forventet volum (< 500 fordeler).

## Acceptance Criteria
- [x] Rediger fordel-siden viser en tydelig fargekodet statusbadge øverst (grønn/gul/grå/rød) som matcher reglene over — verifisert via `tsc`/build, IKKE ennå sett i faktisk nettleser (se Validation Notes)
- [x] Fordelsoversikten viser samme fargekoding i statuskolonnen for alle fordeler — samme forbehold som over
- [x] En fordel med `status=active` men manglende redemption-innhold (f.eks. `generic_code` uten kode) vises rød "Feilet" med forklaring, på begge steder — dekket av unit-tester, ikke av manuell test
- [x] En fordel med `status=scheduled` og fremtidig `startsAt` vises gul "Planlagt", ikke rød, når ingen andre problemer foreligger — dekket av unit-test
- [x] Pauset og arkivert vises grå, ikke gul/lilla som tidligere for pauset — dekket av unit-test (bucket `draft`)
- [x] Ingen endring i faktisk lagret `status`-verdi eller i admin sine eksisterende handlinger (Publiser/Pause/Arkiver-knappene i `BenefitStatusActions`) — `BenefitStatusActions.tsx` ikke rørt i det hele tatt

## Required Tests
- [x] Unit: `getBenefitDisplayStatus` — 24 tester, alle 4 bøtter + samtlige problem-regler (dato i fortiden, startsAt i fremtiden ved active, hvert redemptionType sin manglende-innhold-sjekk inkl. `mixed`, `info_only` aldri flagget, tom kodepool vs. manglende kodepool, flere samtidige problemer)
- [x] Integration: `getAdminBenefits()` — 3 tester i `src/lib/queries/benefits.test.ts` (mocket Prisma, følger eksisterende mønster), verifiserer at `redemption`/`codePool`-felter mappes riktig

## Rollback Strategy
Revert commit. Ingen migrasjon å rulle tilbake — endringen er ren kode/UI, ingen databaseskjema påvirket.

## Migration Strategy
Ingen — ingen skjemaendring.

## Risks
- Feil i "problem"-logikken kan produsere falske positiver (viser "Feilet" på en fordel som faktisk fungerer) — dekkes av grundig unit-testing av alle redemptionType-grener og datogrenser (inkl. akkurat nå / grensetilfeller)
- `getAdminBenefits()` sitt utvidede query kan i teorien påvirke ytelse ved svært mange fordeler — akseptabel risiko gitt dagens volum, ikke en hastesak å optimalisere

## Dependencies
Ingen — bygger på eksisterende `BenefitStatus`-enum, `BenefitRedemption`/`CodePool`-modeller og eksisterende design-tokens (`--color-success/-warning/-error`, `--color-surface-muted`) fra `styles/tokens.css`.

## Implementation Notes
- Problem-regel 3 i Proposed Solution listet ikke opp `BenefitRedemptionType.mixed` eksplisitt (finnes i enumet, brukes trolig ikke i praksis i dag). For at funksjonen skal håndtere samtlige enum-verdier konsekvent er en regel lagt til: `mixed` flagges som problem hvis INGEN av `genericCode`/`externalUrl`/`qrValue` er satt. Dekket av 2 unit-tester.
- `BenefitStatusBadge` ble bygget med egen `.module.css` (ikke en utvidelse av `AdminTable.module.css`) etter å ha oppdaget at Heroer-siden (`heroes/page.tsx`) gjenbruker nøyaktig de samme `.status-*`-klassene med rå `HeroStatus`-verdier — å endre dem der ville regredert Hero-fargekodingen. Dette var ikke forutsett i opprinnelig Affected Components-liste, men endrer ikke akseptansekriteriene.

## Validation Notes
- `npx tsc --noEmit` — ingen feil
- `npx vitest run` — 118/118 bestått (opp fra 91: +24 `displayStatus.test.ts`, +3 `benefits.test.ts`)
- `npm run build` — bygger rent, kun de 2 forhåndseksisterende `<img>`-lint-warningene (urelatert til denne CR-en)
- **Ikke gjort:** manuell verifisering i nettleser. Lokalt dev-miljø har ingen `DATABASE_URL` konfigurert (kun `.env.example` finnes) — appen kan ikke kjøres mot en reell database uten Coolify-tilkobling. Bruker må verifisere visuelt i prod/staging etter deploy før CR-en markeres Done, i tråd med samme mønster som CR-013.
