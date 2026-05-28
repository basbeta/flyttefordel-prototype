# CR-014: Per-sesjon LTV-estimat på /admin/profitability

Status: Draft
Created: 2026-05-28

## Business Goal
Gi admin innsikt i hvilke bruker-segmenter (postnummer, flyttestatus) som genererer
høyest livstidsverdi — slik at targeting-strategi og annonsørprising kan optimaliseres.

## Problem Statement
`AdminSessionLTV`-typen er definert i `src/types/admin.ts` og LTV-formelen er dokumentert
i CR-010, men `getProfitabilityData()` returnerer en tom liste for `sessionLtv`.
Per-sesjon LTV er ikke implementert (CR-010 scope-kutt).

## Proposed Solution

### 1. LTV-beregning per sesjon
I `adminQueries.ts` — `getProfitabilityData()`:

```
LTV_sesjon = Σ fordeler der sesjon har events:
  views_per_benefit × pricePerView
  + leads_per_benefit × pricePerLead
  + redemptions_per_benefit × pricePerRedemption
```

Implementeres via:
1. Hent alle `BenefitEvent`-rader med `sessionId` + `benefitId` + `eventType`
2. Join med `Benefit` for prisfelter
3. Aggreger per `UserSession`

### 2. LTV-aggregering per segment
Grupper sessions etter `movingStatus` og `postcode`-prefix (første 2 siffer = region):
- Snitt-LTV per segment
- Antall sessions per segment
- Høyest enkelt-sesjon-LTV

### 3. Visning på /admin/profitability
Ny seksjon "Sesjon-LTV" under eksisterende tabeller:
- **Oversiktskort**: snitt-LTV alle sessions, maks LTV, antall sessions med > 0 LTV
- **Segment-tabell**: movingStatus × region → snitt-LTV, antall sessions
- **Topp 20 sessions** (valgfritt): anonym sesjon-ID, LTV, antall events

### 4. Type-kobling
`AdminSessionLTV` (allerede definert):
- `sessionId: string`
- `estimatedLtv: number`
- `viewCount: number`
- `leadCount: number`
- `redemptionCount: number`

`AdminProfitabilityData.sessionLtv` fylles nå ut (var tom array).

## Impact Analysis

Affected Specs:
- [ ] specs/entities.md — ingen nye entiteter

Affected Components:
- `src/lib/queries/adminQueries.ts` — `getProfitabilityData()`: implementer sessionLtv-query
- `src/app/admin/(protected)/profitability/page.tsx` — ny seksjon for LTV-visning
- `src/types/admin.ts` — evt. nye aggregerings-typer for segment-visning

Database Impact:
- Ingen schema-endringer
- Ny query: `BenefitEvent` JOIN `Benefit` GROUP BY `sessionId` — lesetung, men OK for admin-side

API Impact:
- Ingen endringer i API-lag — `getProfitabilityData()` returnerer allerede `sessionLtv`

Security Impact:
- Sessions vises med anonym ID — ingen PII eksponeres
- Kun bak admin JWT

Performance Impact:
- LTV-query kan være tung ved mange events — bør begrenses (f.eks. siste 30 dager)
- Vurder paginering på topp-sessions-tabellen

## Acceptance Criteria
- [ ] `getProfitabilityData().sessionLtv` returnerer beregnet LTV per sesjon
- [ ] LTV-formel korrekt: views×pricePerView + leads×pricePerLead + redemptions×pricePerRedemption
- [ ] Sessions uten events får LTV = 0 (ekskluderes fra visning)
- [ ] Segment-aggregering: snitt-LTV per movingStatus
- [ ] Oversiktskort viser snitt-LTV, maks LTV, antall sessions med LTV > 0
- [ ] `tsc --noEmit` uten feil
- [ ] Unit-tester for LTV-beregningen

## Required Tests
- [ ] Unit: sesjon med én view på benefit med pricePerView=10 → LTV = 10
- [ ] Unit: sesjon med view + lead + redemption → LTV = sum av alle komponenter
- [ ] Unit: sesjon uten events → LTV = 0
- [ ] Unit: benefit uten prisfelter → bidrar ikke til LTV
- [ ] Unit: segment-aggregering — snitt over flere sessions

## Rollback Strategy
Ingen schema-endringer — rollback er å returnere tom liste for sessionLtv igjen og
fjerne LTV-seksjonen fra profitability-siden.

## Migration Strategy
Kun kode- og query-endringer — ingen db push nødvendig.

## Risks
- LTV er approksimativt: bruker snitt-priser, ikke per-benefit-priser per faktisk event
- Queries kan bli trege ved høyt event-volum — begrens til 30/90 dager
- Sessions med bare views på fordeler uten prisfelter får LTV = 0 (korrekt, men kan misforstås)

## Dependencies
- CR-010 (prisfelter på Benefit + AdminSessionLTV-type allerede definert)
- CR-008 (BenefitEvent-tracking komplett)
