# CR-017: Sperre mot Aktiv/Planlagt status når fordelen er «Feilet»

Status: Implementert — committed, venter på push/deploy og brukerens verifisering i prod
Created: 2026-08-11

## Business Goal
En fordel som mangler påkrevd redemption-innhold (rabattkode, ekstern lenke, kodepool, leadskjema) skal aldri kunne bli synlig for ekte sluttbrukere i en ødelagt tilstand.

## Problem Statement
CR-016 innførte en beregnet "Feilet"-visning i admin, men endret bevisst ikke selve lagrings-/statusendringslogikken (eksplisitt ikke-mål i CR-016). Bruker påpekte rett etter deploy et reelt hull: **i dag kan en admin faktisk sette `status=active` (eller `scheduled`) på en fordel som mangler påkrevd redemption-innhold** — og forbrukerappen (`benefitQueries.ts`) viser ALLE `status=active`-fordeler til ekte brukere uavhengig av om redemption-innholdet er komplett. En fordel med `redemptionType=generic_code` men uten `genericCode` ville altså vist seg i appen med en "Hent rabattkode"-knapp som ikke virker.

Dette gjelder to distinkte veier:
1. Direkte forsøk på å sette `active`/`scheduled` på en fordel som allerede er ødelagt
2. En allerede aktiv/planlagt fordel som blir ødelagt av en senere redigering (f.eks. admin fjerner rabattkoden ved en feil, uten samtidig å endre status)

## Proposed Solution
Gjenbruk **samme problem-deteksjon som CR-016** (eksporteres fra `displayStatus.ts` som `getBenefitConfigProblems()`, i stedet for en privat funksjon) som eneste kilde til sannhet, og håndhev den server-side på alle tre skrivepunkter:

1. `POST /api/admin/benefits` (opprett) — hvis `status` i payload er `active`/`scheduled`, kjør problemsjekk mot de innsendte feltene. `codePoolId`/`leadFormId` er aldri settbare ved opprettelse via denne ruten, så `unique_code`/`lead_form` vil alltid blokkere ved opprettelse — det er korrekt, siden kodepool/leadskjema uansett må kobles til via andre admin-skjermer først.
2. `PATCH /api/admin/benefits/[id]` (rediger) — beregn *resulterende* status (`payload.status ?? eksisterende.status`) og *resulterende* redemption-innhold (payload-felter overstyrer eksisterende, ellers behold eksisterende). Kjør problemsjekk hvis resulterende status er `active`/`scheduled`. Dette dekker BEGGE hullene over: både direkte statusendring og en redigering som utilsiktet ødelegger en allerede aktiv fordel.
3. `PATCH /api/admin/benefits/[id]/status` (hurtigknappene: Publiser/Aktiver/Aktiver nå) — kjør problemsjekk mot eksisterende redemption-innhold når ny status er `active`/`scheduled`.

Ved brudd: `400` med en norsk feilmelding som lister opp de konkrete problemene (samme tekst som "Feilet"-badgen sine `reasons` — gjenbrukt, ikke duplisert).

**Scope-avklaring (bruker-bekreftet):** Sperren gjelder BÅDE `active` og `scheduled` — ikke bare `active` direkte — siden en `scheduled`-fordel blir `active` av seg selv på startdato uten at noen ser den på nytt da.

**Dato-relaterte "problemer" (fra CR-016 sin liste) inngår også** i sperren for konsistens med én kilde til sannhet — i praksis sjelden utløst ved en bevisst statusendring (man setter normalt ikke `active` med en allerede passert `endsAt`), men det er riktig at det blokkeres om det skjer.

UX-forbedring (valgfri, lav kostnad siden dataene allerede hentes av CR-016): "Publiser"/"Aktiver"/"Aktiver nå"-knappene i `BenefitStatusActions` deaktiveres i oversikten når fordelen ville blitt "Feilet" ved den handlingen — for å unngå en unødvendig tur-retur til serveren for det vanligste tilfellet. Server-sjekken er uansett den autoritative sperren.

## Impact Analysis

Affected Specs:
- [ ] specs/architecture.md — note om at statusendring nå er validert, ikke bare visningen
- [ ] specs/entities.md — ingen endring i selve datamodellen, kun i skrive-validering
- [x] specs/api.yaml — ingen formell OpenAPI-spec i bruk i dette prosjektet per i dag

Affected Components:
- `src/lib/benefits/displayStatus.ts` — `findProblems` eksporteres som `getBenefitConfigProblems` (samme logikk, kun synlighet endres)
- `src/app/api/admin/benefits/route.ts` (POST) — problemsjekk før create
- `src/app/api/admin/benefits/[id]/route.ts` (PATCH) — problemsjekk før update, med merge av eksisterende + payload
- `src/app/api/admin/benefits/[id]/status/route.ts` (PATCH) — problemsjekk før statusendring
- `src/app/admin/(protected)/benefits/BenefitStatusActions.tsx` + `benefits/page.tsx` — deaktiver knapper som ville resultert i "Feilet" (UX, ikke sikkerhetsgrense)

Database Impact: Ingen migrasjon.
API Impact: De tre eksisterende endepunktene kan nå returnere `400` i et nytt scenario (tidligere alltid gyldig hvis Zod-validering passerte). Dette er en **breaking-ish** endring for eksisterende admin-brukerflyt: en admin som i dag (feilaktig) klarer å aktivere en ufullstendig fordel vil heretter få en tydelig feilmelding i stedet.
UX Impact: Admin får en ny, forklarende feilmelding ved forsøk på å aktivere/planlegge en ufullstendig fordel, i stedet for at det stille lykkes og går live ødelagt. Knapper kan bli deaktivert i oversikten.
Security Impact: Ingen ny angrepsflate — strammer faktisk inn en eksisterende svakhet (data-integritet). Ren server-side forretningsregel, ingen ny autentisering/autorisasjon involvert.
Performance Impact: Ubetydelig — samme query-mønster som CR-016, kjøres kun ved skriving (lav frekvens), ikke ved lesing.

## Acceptance Criteria
- [x] `POST /api/admin/benefits` med `status=active` og manglende påkrevd redemption-innhold returnerer 400 med forklarende melding, oppretter IKKE fordelen
- [x] `PATCH /api/admin/benefits/[id]` som ville satt/beholdt `active`/`scheduled` med manglende innhold returnerer 400, endrer IKKE fordelen
- [x] `PATCH /api/admin/benefits/[id]/status` til `active`/`scheduled` på en fordel med manglende innhold returnerer 400, endrer IKKE status
- [x] En fordel med KOMPLETT redemption-innhold kan fortsatt settes til `active`/`scheduled` helt normalt (ingen falske positiver)
- [x] En allerede aktiv fordel hvor admin fjerner rabattkoden UTEN å endre status, blokkeres av `PATCH /api/admin/benefits/[id]` (dekker "utilsiktet ødelagt"-scenarioet)
- [x] Draft/Paused/Archived/Deleted/Expired-transisjoner er upåvirket — sperren gjelder kun `active`/`scheduled` som målstatus

## Required Tests
- [x] Unit: `getBenefitConfigProblems` — samme dekning som `getBenefitDisplayStatus` (eksporten er kun et synlighetsskifte, eksisterende 24 tester dekker fortsatt logikken via `getBenefitDisplayStatus`)
- [x] Integration: alle tre ruter — happy path (komplett innhold → 200/201), blokkert path (mangler innhold → 400, ingen DB-endring) per redemptionType, samt "fjern kode fra allerede aktiv fordel"-scenarioet for PATCH `[id]` — 15 nye tester på tvers av 3 testfiler

## Implementation Notes (2026-08-27)
Koden, testene og `vitest.config.mts` (ny — la til manglende `@/*`-alias-
oppløsning for vitest, avdekket av CR-017 sine ikke-mockede integrasjonstester)
lå allerede ferdig i arbeidskatalogen fra en tidligere, avbrutt økt (aldri
committed, session-filene var ikke oppdatert for CR-017 i det hele tatt).
Verifisert på nytt før commit: `npx tsc --noEmit` (0 feil), `npx vitest run`
(133/133, inkl. 15 CR-017-spesifikke tester), `npm run build` (44 routes,
rent). Kildekoden lest og kryssjekket linje for linje mot Proposed Solution
og Acceptance Criteria over — samsvarer. Ikke gjort: push, deploy, manuell
verifisering i nettleser (denne CR-en har ingen manuell test i Required
Tests-listen, kun unit/integration — betraktes som funksjonelt ferdig når
disse er grønne).

## Rollback Strategy
Revert commit. Ingen migrasjon.

## Migration Strategy
Ingen.

## Risks
- Falske positiver ville blokkert legitime lagringer — samme risiko som CR-016, samme avbøtende tiltak (grundig testdekning av alle redemptionType-grener)
- En admin som i dag har en (allerede eksisterende) aktiv fordel som teknisk er "feilet" (f.eks. tom kodepool oppstått etter publisering, ikke ved en admin-handling) rammes IKKE av denne sperren før neste gang noen redigerer/endrer status på akkurat den fordelen — sperren er skrive-tidsvalidering, ikke en bakgrunnsjobb som aktivt overvåker og demoterer allerede-publiserte fordeler. Det sistnevnte ville vært en betydelig større endring (krever infrastruktur for periodisk sjekk) og vurderes som utenfor scope her — CR-016 sin visning i admin ("Feilet") er fortsatt det som fanger opp dette tilfellet i mellomtiden.

## Dependencies
Bygger direkte på CR-016 sin `getBenefitDisplayStatus`/problem-logikk — implementeres ikke uavhengig av den.
