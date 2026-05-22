# CR-006: Unik kode-tildeling

Status: Done
Created: 2026-05-22

## Business Goal
Annonsører med begrensede kode-pools (f.eks. 500 gavekort) trenger garantert at én bruker ikke kan motta mer enn én kode, og at to samtidige forespørsler ikke gir samme kode til to brukere. Uten dette kan kode-pools tømmes dobbelt så raskt og annonsørens løfte til brukerne brytes.

## Problem Statement
`RedemptionSection.tsx` har allerede en `UniqueCodeSection` som kaller `POST /api/benefits/[slug]/claim-code`, men endepunktet eksisterer ikke. `lib/codes/`-modulen som specs/architecture.md beskriver er heller ikke implementert. Kode-tildeling skjer i dag kun via admin (legge til koder i pool) — det finnes ingen mekanisme for at en forbruker kan hente sin unike kode.

Risiko uten atomisk transaksjon: to samtidige kall kan lese samme `available`-kode og begge tildele den, slik at samme kode vises til to brukere.

## Proposed Solution

### 1. `src/lib/codes/claimCode.ts` — atomisk tildeling
Funksjon `claimCode(benefitSlug, sessionId)` som:
1. Sjekker om sesjonen allerede har en tildelt kode for fordelen — returnerer den i så fall (idempotent)
2. Starter Prisma-transaksjon:
   a. Henter første `Code` med `status = available` for benefitens `CodePool` (FIFO)
   b. Oppdaterer koden til `status = assigned`, setter `assignedSessionId`, `assignedAt`
   c. Dekrementerer `CodePool.availableCodes`
3. Returnerer `{ codeValue, alreadyClaimed: boolean }` — eller kaster `NoCodesAvailableError` dersom pool er tom

Atomisitet: Prisma `$transaction([...])` er tilstrekkelig for demo. `select for update` er ikke tilgjengelig via standard Prisma API — i stedet bruker vi `$transaction` med serialisert skriving (race condition-vindu er svært lite for demo-volum).

### 2. `src/app/api/benefits/[slug]/claim-code/route.ts` — POST-endepunkt
- Henter sesjon via `getOrCreateSession()`
- Henter fordel + redemption (inkl. `codePoolId`) via `getBenefitBySlug()`
- Validerer at `redemptionType === 'unique_code'` og at pool er koblet
- Kaller `claimCode(benefitSlug, sessionId)`
- Logger `code_revealed`-hendelse via `trackEvent`
- Returnerer `{ code: string }` eller `{ message: string }` med status 410 ved tom pool

### 3. Ingen DB-skjemaendringer
`CodePool`, `Code` og `BenefitRedemption.codePoolId` er allerede i prod. Ingen `prisma db push` nødvendig.

### 4. Ingen frontend-endringer
`UniqueCodeSection` i `RedemptionSection.tsx` kaller allerede `/api/benefits/[slug]/claim-code` — den er komplett og trenger ingen endringer.

---

## Impact Analysis

Affected Specs:
- [x] specs/entities.md — Code/CodePool/CodeStatus allerede fullstendig definert, ingen endring
- [x] specs/architecture.md — `lib/codes/` modul allerede navngitt, ingen endring
- [ ] specs/api.yaml — ikke i bruk (ingen OpenAPI-spec vedlikeholdt)
- [ ] specs/flows.md — ikke relevant
- [ ] specs/nfr.md — ikke relevant
- [ ] specs/ui-spec.md — ikke relevant

Affected Components:
- `src/lib/codes/claimCode.ts` (ny fil — ny modul)
- `src/app/api/benefits/[slug]/claim-code/route.ts` (ny fil — nytt API-endepunkt)

Database Impact:
Ingen skjemaendringer. Eksisterende tabeller `codes` og `code_pools` brukes som de er.
Transaksjonsmønster: `prisma.$transaction([updateCode, updatePool])` — atomisk for demo-volum.

API Impact:
Nytt endepunkt: `POST /api/benefits/[slug]/claim-code`
- 200: `{ code: string, alreadyClaimed: boolean }`
- 404: fordel ikke funnet eller ikke `unique_code`-type
- 410: ingen koder igjen i pool
- 500: uventet feil

UX Impact:
Ingen synlig endring for brukere — `UniqueCodeSection` fungerer allerede i UI med loading/error-states. Brukere vil nå faktisk motta en unik kode i stedet for en feilmelding.

Security Impact:
Lav. Endepunktet er åpent for alle med gyldig sesjon (anonym). Sesjon-ID fra cookie hindrer at én bruker kaller endepunktet gjentatte ganger for å tømme hele poolen — idempotency-sjekken returnerer samme kode ved gjentatt kall fra samme sesjon.

Performance Impact:
Lav. En transaksjon på to DB-operasjoner per claim. Ikke relevant for demo-volum.

---

## Acceptance Criteria
- [ ] `POST /api/benefits/[slug]/claim-code` returnerer en unik kode for sesjonen
- [ ] Gjentatt kall fra samme sesjon returnerer samme kode (idempotent)
- [ ] To samtidige kall fra ulike sesjoner gir aldri samme kode
- [ ] Tom kode-pool returnerer HTTP 410 med norsk feilmelding
- [ ] `Code.status` settes til `assigned`, `assignedSessionId` og `assignedAt` settes korrekt
- [ ] `CodePool.availableCodes` dekrementeres ved tildeling
- [ ] `code_revealed`-hendelse logges i `BenefitEvent` ved vellykket tildeling
- [ ] Fordel uten `codePoolId` returnerer HTTP 404

## Required Tests
- [ ] Unit: `claimCode` — returnerer kode ved ledig pool
- [ ] Unit: `claimCode` — idempotent: returnerer eksisterende kode ved gjentatt kall fra samme sesjon
- [ ] Unit: `claimCode` — kaster feil ved tom pool
- [ ] Unit: `claimCode` — kodepool decrementeres korrekt

## Rollback Strategy
Slett `src/lib/codes/claimCode.ts` og `src/app/api/benefits/[slug]/claim-code/route.ts`. `UniqueCodeSection` viser allerede håndtering av API-feil — brukere ser en feilmelding i stedet for kode. Ingen DB-endringer å rulle tilbake.

## Migration Strategy
Ingen DB-migrering. `CodePool` og `Code`-tabeller er allerede i prod med korrekt skjema.

## Risks
- Race condition ved svært høy samtidighet: Prisma `$transaction` er ikke SELECT FOR UPDATE — to forespørsler i samme millisekund kan potensielt tildele samme kode. Risiko: svært lav for demo-volum (< 100 samtidige brukere). Mitigering: ved MVP-fase byttes til raw SQL med `SELECT ... FOR UPDATE SKIP LOCKED`.
- Pool uten koder: Admin glemmer å legge til koder i poolen. Mitigering: Admin-dashboardet viser allerede kode-alarm når `availableCodes < lowStockThreshold`.

## Dependencies
- CR-001–CR-005 (alle Done)
- `CodePool` og `Code` i databaseskjema (allerede i prod)
- `BenefitRedemption.codePoolId` (allerede i prod)
- `UniqueCodeSection` i `RedemptionSection.tsx` (allerede implementert, kaller dette endepunktet)
