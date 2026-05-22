# CR-007: Kategori-administrasjon i admin

Status: Draft
Created: 2026-05-22

## Business Goal

Admins skal kunne opprette, redigere og deaktivere kategorier direkte i admin-grensesnittet — uten å involvere en utvikler. Kategoritaksonomien styrer hva brukeren ser i fordelsfeed og filterchips, og må kunne oppdateres løpende etter hvert som fordelsporteføljen vokser.

## Problem Statement

`/admin/categories` finnes, men er kun en lesevisning med navn og slug. Det er ingen måte å opprette nye kategorier, redigere eksisterende (navn, ikon, rekkefølge, status), eller deaktivere kategorier som ikke lenger er i bruk. Kategorier må i dag settes inn direkte i databasen.

## Proposed Solution

Fullstendig CRUD-grensesnitt for kategorier i admin:

- Listevisning med alle felter og handlingsknapper
- Opprettelse via `/admin/categories/new`
- Redigering via `/admin/categories/[id]`
- Deaktivering (isActive = false) — ingen hard delete siden Category mangler deletedAt i schema
- Nye API-ruter: POST, PATCH, DELETE (deaktivering) på `/api/admin/categories`
- Slug autogenereres fra navn ved opprettelse, kan overstyres manuelt

## Impact Analysis

Affected Specs:
- [ ] specs/entities.md — Category er allerede fullstendig dokumentert, ingen endringer nødvendig
- [ ] specs/api.yaml — ikke i bruk (admin API er intern)
- [ ] specs/flows.md — ikke berørt
- [ ] specs/architecture.md — ingen strukturelle endringer
- [ ] specs/nfr.md — ikke berørt
- [ ] specs/ui-spec.md — ikke berørt

Affected Components:
- `src/app/admin/(protected)/categories/page.tsx` — oppgraderes fra lesevisning til full CRUD-tabell
- `src/app/admin/(protected)/categories/new/page.tsx` — ny side
- `src/app/admin/(protected)/categories/[id]/page.tsx` — ny side
- `src/app/admin/(protected)/categories/CategoryForm.tsx` — ny komponent
- `src/app/api/admin/categories/route.ts` — ny: GET (all) + POST
- `src/app/api/admin/categories/[id]/route.ts` — ny: PATCH + DELETE (deaktivering)
- `src/lib/queries/adminQueries.ts` — ny funksjon getAdminCategoryById(), eksisterende getAdminCategories() beholdes uendret for dropdown-bruk

Database Impact:
- Ingen schemaendringer. Category-tabellen har allerede alle nødvendige felter: name, slug, description, icon, sortOrder, isActive.
- Ingen deletedAt på Category — deaktivering skjer via isActive = false. Hard delete ikke tilbudt i UI.
- Dersom en kategori deaktiveres mens den har aktive fordeler, vil fordelene beholde sin categoryId men kategorien vises ikke i filterchips. Dette er akseptabelt for demo.

API Impact:
- Nye interne admin-endepunkter (bak JWT-guard):
  - GET /api/admin/categories — alle kategorier inkl. antall aktive fordeler
  - POST /api/admin/categories — opprett ny kategori
  - PATCH /api/admin/categories/[id] — oppdater feltene
  - DELETE /api/admin/categories/[id] — sett isActive = false (deaktivering, ikke sletting)
- Eksisterende GET /api/admin/benefits og BenefitForm: ikke berørt (bruker getAdminCategories() for dropdown, som beholdes)

UX Impact:
- Kategori-siden i admin får «Ny kategori»-knapp og handlingskolonne (Rediger / Deaktiver) i tabellen
- CategoryForm: felter for name, slug (auto fra navn, overstyrbar), description, icon (tekstfelt for emoji/ikonkode), sortOrder, isActive
- Samme visuelt mønster som AdvertiserForm og BenefitForm — ingen nye designelementer nødvendig

Security Impact:
- Alle nye ruter er bak eksisterende JWT-guard (requireAdminAuth / verifyAdminJWT). Ingen ny auth-logikk.
- Slug-validering (kun a-z, 0-9, bindestrek) må håndheves server-side for å unngå ugyldig routing i consumer-app.

Performance Impact:
- Neglisjerbar. Admin-sider er server-rendered og Category-tabellen forventes under 50 rader.

## Acceptance Criteria

- [ ] Admin kan opprette ny kategori med name, slug, description, icon, sortOrder — og se den umiddelbart i listen
- [ ] Admin kan redigere alle felter på eksisterende kategori
- [ ] Admin kan deaktivere en kategori (isActive = false) — den forsvinner fra consumer-app filterchips og fordelsopprettelse dropdowns
- [ ] Slug autogenereres fra navn (lowercase, æøå→ae/oe/aa, mellomrom→bindestrek) ved opprettelse, men kan overstyres manuelt
- [ ] Slugvalidering server-side: kun a-z, 0-9 og bindestrek tillatt — duplikat slug gir 409-feil
- [ ] Tabellen viser: navn, slug, ikon, sortering, status (aktiv/inaktiv), antall fordeler tilknyttet
- [ ] Ingen hard delete eksponert i UI
- [ ] Eksisterende BenefitForm og HeroForm kategori-dropdowns er uberørt

## Required Tests

- [ ] Unit: slugify-funksjon (æ→ae, ø→oe, å→aa, mellomrom→bindestrek, lowercase)
- [ ] Unit: POST /api/admin/categories — duplikat slug gir 409
- [ ] Unit: PATCH /api/admin/categories/[id] — ukjent ID gir 404
- [ ] Unit: DELETE /api/admin/categories/[id] — setter isActive = false, ikke hard delete

## Rollback Strategy

Ingen schemaendring — rollback innebærer kun å reverte kode-PR. Eksisterende kategorier i databasen er upåvirket.

## Migration Strategy

Ingen db-migrasjon nødvendig.

## Risks

- **Deaktivering av kategori med aktive fordeler:** Fordelene beholder categoryId men kategorien vises ikke i filter. Adminbrukeren ser ikke tydelig advarsel om dette i første versjon. Lav risiko for demo — noteres som fremtidig forbedring.
- **Slugkollisjon ved rename:** Hvis admin endrer navn og det nye slugget kolliderer med eksisterende, returneres 409. UI må vise feilmeldingen tydelig.

## Dependencies

- Ingen uløste avhengigheter. Bygger på etablert admin-arkitektur fra CR-004.
