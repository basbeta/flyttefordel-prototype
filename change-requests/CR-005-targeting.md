# CR-005: Fase 5 — Targeting-logikk

Status: Done
Created: 2026-05-22

## Business Goal
Vis riktig innhold til riktig bruker. Fordeler og heroer som er målrettet mot et spesifikt postnummer, geografisk område, eller flyttesegment skal kun vises til brukere som matcher. Brukere uten profil ser alltid nasjonalt/fallback-innhold — aldri tom side.

## Problem Statement
I dag vises alle aktive fordeler og heroer til alle brukere uavhengig av postnummer og flyttestatus. `TargetingRule`-modellen er i databasen og relasjonene er satt opp, men logikken som evaluerer reglene mot en bruker-sesjon eksisterer ikke. Admin har heller ingen UI for å sette targeting på fordeler eller heroer.

## Proposed Solution

### 1. `src/lib/targeting/index.ts` — ren logikkmodul
Eksporterer `matchesSession(rule, session)`: returnerer `true` dersom sesjonen matcher regelen. Regler:
- Ingen regel → synlig for alle
- `appliesNationally: true` → synlig for alle
- `includeUnknownLocation: true` → brukere uten postnummer/segment ser innholdet
- Postnummer-matching: brukerens postnummer er i `postcodes`-array ELLER innenfor et `postcodeRanges`-intervall
- Segment-matching: brukerens `movingStatus` er i `movingStatuses`-array
- Begge kriterier satt = AND (må matche begge)

### 2. Consumer app — fordeler
`getActiveBenefits` inkluderer `targeting`-relasjon i spørringen. Etter henting filtreres resultatet med `matchesSession`. Ytelse: targeting skjer i minne etter DB-henting (antall aktive fordeler er lite nok).

### 3. Consumer app — heroer
`getActiveHeroes` inkluderer `targeting`-relasjon. Alle heroer som matcher sesjonen returneres, sortert etter prioritet. Fallback-hero (`isFallback: true`) returneres dersom ingen targetede heroer matcher.

### 4. Admin — targeting-UI på fordeler
`BenefitForm` utvides med en ny seksjon «Targeting» med:
- Avkrysning «Nasjonalt (vis for alle)»
- Avkrysning «Inkluder ukjent lokasjon»
- Segment-valg (flervalg: nylig flyttet, tidligere, ikke-flytter)
- Postnummer-felt (kommaseparert, fri tekst for demo)

### 5. Admin — targeting-UI på heroer
`HeroForm` utvides tilsvarende som BenefitForm.

### 6. Admin API — targeting på benefit CREATE/PATCH
`POST /api/admin/benefits` og `PATCH /api/admin/benefits/[id]` aksepterer valgfritt `targeting`-objekt → upsert av `TargetingRule`.

### 7. Admin API — targeting på hero CREATE/PATCH
`POST /api/admin/heroes` og `PATCH /api/admin/heroes/[id]` aksepterer valgfritt `targeting`-objekt → upsert av `TargetingRule`.

---

## Impact Analysis

Affected Specs:
- [ ] specs/requirements.md — FR-040–043 allerede dokumentert, ingen endring nødvendig
- [ ] specs/architecture.md — `/lib/targeting` allerede navngitt i modulkart, ingen endring nødvendig
- [ ] specs/entities.md — `TargetingRule` allerede komplett, ingen endring nødvendig

Affected Components:
- `src/lib/targeting/` (ny modul)
- `src/lib/queries/benefitQueries.ts` (legg til targeting-join + filter)
- `src/lib/queries/heroQueries.ts` (legg til targeting-join + filter)
- `src/app/admin/(protected)/benefits/BenefitForm.tsx` (ny targeting-seksjon)
- `src/app/admin/(protected)/heroes/HeroForm.tsx` (ny targeting-seksjon)
- `src/app/api/admin/benefits/route.ts` og `[id]/route.ts` (targeting-upsert)
- `src/app/api/admin/heroes/route.ts` og `[id]/route.ts` (targeting-upsert)

Database Impact:
Ingen skjemaendringer. `TargetingRule`-tabellen er allerede i prod. Ingen migrering nødvendig.

API Impact:
- `GET`-kall (fordel- og herolister) endrer respons: færre resultater returneres til brukere med profil (riktig adferd, ikke breaking)
- Admin `POST`/`PATCH` for benefits og heroes aksepterer nytt valgfritt `targeting`-objekt (bakoverkompatibelt)

UX Impact:
- Brukere uten profil: ingen synlig endring (ser fortsatt alt nasjonalt innhold)
- Brukere med postnummer/segment: ser kun relevant innhold + nasjonalt fallback
- Admin: ny «Targeting»-seksjon i benefit- og hero-skjema

Security Impact:
Ingen. Targeting er et filter på eksisterende data — ingen nye tilganger eller sensitive data.

Performance Impact:
Lav. Targeting evalueres i minne etter Prisma-henting. Antall aktive fordeler forventes under 500 i demo-fase. Kan optimaliseres til SQL-filter ved behov.

---

## Acceptance Criteria
- [ ] Fordel med `appliesNationally: true` vises for alle brukere uavhengig av profil
- [ ] Fordel med postnummer-targeting vises kun for brukere med matchende postnummer
- [ ] Fordel med segment-targeting vises kun for brukere med matchende flyttestatus
- [ ] Bruker uten postnummer ser fordeler der `includeUnknownLocation: true`
- [ ] Bruker uten profil ser alle fordeler uten targeting-regel (nasjonalt innhold)
- [ ] Hero-karusellen viser kun heroer som matcher brukerens sesjon
- [ ] Minst én fallback-hero vises alltid dersom ingen targetede heroer matcher
- [ ] Admin kan sette targeting på fordel fra BenefitForm — data lagres korrekt
- [ ] Admin kan sette targeting på hero fra HeroForm — data lagres korrekt

## Required Tests
- [ ] Unit: `matchesSession` — alle kombinasjoner av regler og sesjondata
- [ ] Unit: postnummer-range-matching (grenseverdier)
- [ ] Integration: fordelliste returnerer riktig subset for bruker med postnummer
- [ ] Integration: fordelliste returnerer alle nasjonale fordeler for bruker uten profil

## Rollback Strategy
Sett `includeUnknownLocation: true` og `appliesNationally: true` på alle eksisterende `TargetingRule`-rader → alle fordeler vises for alle igjen. Ingen kodeendringer nødvendig for rollback.

## Migration Strategy
Ingen DB-migrering. Eksisterende fordeler uten `TargetingRule` behandles automatisk som nasjonale (synlige for alle) — ingen data-backfill nødvendig.

## Risks
- Utilsiktet skjuling av fordeler dersom targeting settes feil i admin → Mitigeres med «Nasjonalt»-avkrysning som alltid overstyrer
- Ytelsesforringelse dersom fordelsvolum skalerer til 10 000+ → Mitigeres med DB-side filter (fremtidig optimalisering, ikke nødvendig for demo)

## Dependencies
- CR-001, CR-002, CR-003, CR-004 (alle Done)
- `TargetingRule` i databaseskjema (allerede i prod)
- `UserSession.postcode` og `UserSession.movingStatus` (allerede i prod fra CR-003)
