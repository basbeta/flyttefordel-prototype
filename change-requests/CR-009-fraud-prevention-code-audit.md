# CR-009: Fraud prevention — kode-audit og DB-integritet

Status: Approved
Created: 2026-05-22

## Business Goal
Sikre at kode-pool-systemet er robust nok for produksjon med ekte annonsørkoder.
Gi admin full oversikt over alle koder, hvem som fikk hva, og mulighet til å deaktivere enkelt-koder.

## Problem Statement
ISSUE-008 identifiserte følgende hull:
1. Ingen unique constraint på `codeValue` i Code-tabellen — applikasjonsnivå-sjekk er sårbar for race conditions.
2. Admin har ingen oversikt over hvilke koder som er tildelt, til hvilken sesjon, og når.
3. Ingen mulighet til å deaktivere en enkelt kode uten å slette den.

## Proposed Solution
1. **DB unique constraint** `@@unique([codePoolId, codeValue])` — gir ekte garantier mot duplikater.
2. **Forenklet upload-rute** — nå som DB-constraint finnes, bruk Prisma `skipDuplicates: true` i stedet for manuell dedup-query.
3. **Admin kode-detaljside** `/admin/codes/[poolId]` — liste over alle koder med status, tildelt sesjon (anonymisert), tidspunkt.
4. **Deaktiver enkelt-kode** — `PATCH /api/admin/codes/[poolId]/[codeId]` setter status=disabled og justerer `availableCodes`.

## Impact Analysis

Affected Specs:
- [x] specs/entities.md (Code-modellen endres — ny unique constraint)
- [ ] specs/api.yaml (nytt endepunkt dokumenteres ikke i yaml for demo)
- [ ] specs/flows.md
- [x] specs/architecture.md (ny rute-struktur)
- [ ] specs/nfr.md
- [ ] specs/ui-spec.md

Affected Components:
- `prisma/schema.prisma` — Code model: ny @@unique
- `src/types/admin.ts` — nye typer: AdminCodeRow, AdminCodePoolDetail
- `src/lib/queries/adminQueries.ts` — ny: getAdminCodePoolDetail()
- `src/app/api/admin/codes/[poolId]/route.ts` — forenklet POST
- `src/app/api/admin/codes/[poolId]/[codeId]/route.ts` — ny: PATCH
- `src/app/admin/(protected)/codes/page.tsx` — lenker til detaljside
- `src/app/admin/(protected)/codes/[poolId]/page.tsx` — ny: detaljside
- `src/app/admin/(protected)/codes/[poolId]/DisableCodeButton.tsx` — ny: klient-komponent

Database Impact:
- Ny unique constraint: `@@unique([codePoolId, codeValue])` på Code-tabellen.
- `prisma db push` kreves i prod.
- Eksisterende data: OK dersom ingen duplikater i DB. Duplikater vil blokkere push — sjekkes manuelt.

API Impact:
- Ny rute: PATCH `/api/admin/codes/[poolId]/[codeId]`
- Endret POST `/api/admin/codes/[poolId]`: forenkling, ingen breaking change

UX Impact:
- Ny "Se koder"-lenke i kode-pool-tabellen
- Ny detaljside med kodeliste og deaktiver-knapp

Security Impact:
- Begge nye endepunkter krever admin JWT (som eksisterende kode-ruter)
- Ingen sensitive data eksponeres — sessionId anonymiseres i visning

Performance Impact:
- getAdminCodePoolDetail kan returnere mange rader for store pools
- Paginering er ikke nødvendig for demo (< 1000 koder per pool)

## Acceptance Criteria
- [x] Prisma Code-modellen har @@unique([codePoolId, codeValue])
- [x] prisma db push kjørt mot prod-DB
- [x] POST /api/admin/codes/[poolId] bruker skipDuplicates: true
- [x] PATCH /api/admin/codes/[poolId]/[codeId] deaktiverer kode og justerer availableCodes
- [x] /admin/codes/[poolId] viser alle koder med status og tildelingsinformasjon
- [x] Admin kan trykke "Deaktiver" på en enkelt kode
- [x] Deaktivering av assigned-kode endrer ikke availableCodes (allerede ikke tilgjengelig)
- [x] Unit-tester for PATCH-endepunktet

## Required Tests
- [x] Unit: PATCH /api/admin/codes/[poolId]/[codeId] — 404 kode ikke funnet
- [x] Unit: PATCH — 200 disable available code, decrements availableCodes
- [x] Unit: PATCH — 200 disable assigned code, does NOT decrement availableCodes

## Rollback Strategy
- Fjerne unique constraint: `npx prisma db push --force-reset` (destruktivt) eller manuell SQL `DROP CONSTRAINT`
- Deaktiverte koder re-aktiveres via direkte Prisma-kall

## Migration Strategy
- `prisma db push` (ikke migrate dev — vi bruker push for demo-prosjektet)
- Sjekk for eksisterende duplikater: `SELECT codeValue, codePoolId, COUNT(*) FROM codes GROUP BY codeValue, codePoolId HAVING COUNT(*) > 1`

## Risks
- Duplikater i eksisterende DB vil blokkere db push — usannsynlig siden manuell dedup-sjekk har vært aktiv
- Prisma `skipDuplicates: true` fungerer kun med DB-level unique constraint — nå oppfylt

## Dependencies
- ISSUE-008 (kilde)
- CR-006 (claimCode-implementasjon som berøres)
