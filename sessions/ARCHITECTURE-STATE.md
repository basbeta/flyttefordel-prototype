# ARCHITECTURE-STATE.md

> Describes current system architecture. Updated on every structural change.
> Read by Claude at session startup.

## Current Phase
FASE 3 FULLFØRT — Anonyme sesjoner, lagrede fordeler, profil og nær-deg ferdig.

## Module Map

| Modul | Status | Ansvar |
|---|---|---|
| `/app/(mobile)` | Fase 3 ✓ | Hjemskjerm, fordelsliste, fordelsdetalj, /saved, /nearby, /profile |
| `/app/admin` | Fase 1 ✓ (placeholder) | Backoffice admin — desktop-first |
| `/app/api/track` | Fase 2 ✓ | POST hendelseslogging |
| `/app/api/benefits/[slug]/lead` | Fase 2 ✓ | POST lead-innsending |
| `/app/api/benefits/[slug]/save` | Fase 3 ✓ | POST/DELETE lagre/avlagre fordel |
| `/app/api/session/profile` | Fase 3 ✓ | PATCH postnummer og segment |
| `/components/mobile` | Fase 2 ✓ | HeroCarousel, BenefitCard, CategoryFilter, MobileShell, BottomNavigation, TopBar |
| `/components/admin` | Fase 1 ✓ | AdminShell, AdminSidebar (placeholder) |
| `/components/shared` | Fase 1 ✓ | Button |
| `/lib/auth` | Utsatt | E-postinnlogging for consumer-app — utsatt. CR-011: kan ikke lenger bygges på Supabase Auth (`@supabase/supabase-js` fjernet, aldri koblet til) — velg ny leverandør når dette prioriteres. |
| `/lib/session` | Fase 3 ✓ | Anonym sesjon via cookie + DB UserSession upsert |
| `/lib/targeting` | Fase 5 ✓ | matchesSession() — ren funksjon, ingen I/O. Importeres av queries. |
| `/lib/db` | Fase 1 ✓ | Prisma client + schema |
| `/lib/queries` | Fase 2 ✓ | benefitQueries, heroQueries |
| `/lib/targeting` | Fase 5 ✓ | Fordel/hero targeting-logikk |
| `/lib/tracking` | Fase 2 ✓ | trackEvent — fire-and-forget BenefitEvent |
| `/lib/validation` | Ikke startet | Zod-schemas (lead-validering inline per nå) |
| `/lib/codes` | Fase 6 ✓ | Atomisk unik kode-tildeling via $transaction |
| `/lib/selection` | CR-029 ✓ | Utvelgelse: ren `isQualified`/`explainSelection` (supersett av `matchesSession`), `loadPerson` (eneste I/O: flyttedato, boligtype, tidligere bestillinger). Alle flater bruker samme funksjon. `/lib/targeting` er en tynn wrapper |
| `/lib/identity` | CR-028 ✓ | Innlogging som person (simulert Vipps bak kontrakten IdentityProvider), person-token (jose, ADMIN_JWT_SECRET, role=person), personas, kobling av sesjon til person. Middleware krever innlogging på forbrukertrafikk |
| `/styles` | Fase 1 ✓ | Design tokens og globals |

## Dependency Rules
Avhengigheter flyter kun nedover:
`API-ruter → Service/lib → Prisma → Database`

Ingen komponent importerer fra `/lib/db` direkte.
Ingen `/mobile`-komponent importerer fra `/admin` (og omvendt).
Forretningslogikk er DB-agnostisk — kun Prisma-abstraksjon.

## External Dependencies
- Next.js 14 (App Router)
- Prisma 5.x + @prisma/client
- Zod (validering)
- qrcode (QR-generering)
- papaparse (CSV-parsing)
- CR-011: `@supabase/supabase-js` fjernet — var installert men aldri importert noe sted i `src/`.

## Tech Stack
Next.js 14 + TypeScript | Selvhostet PostgreSQL (Hetzner/Coolify) | Prisma ORM | Coolify på Hetzner

## Last Structural Change
2026-08-05 — CR-011 (Hetzner/Coolify-migrering, kodedel ferdig — infra-oppsett og cutover gjenstår):
Dockerfile lagt til (node:22-alpine, single-stage). Baseline-migrasjon i `prisma/migrations/`
regenerert fra `schema.prisma` (den gamle `20260522100321_init` var utdatert — manglet CR-003/CR-009/
CR-010-endringer som kun var kjørt via `db push`). `connect_timeout`/`socket_timeout` lagt til på
Prisma-tilkoblingen i `src/lib/db/client.ts`. Alle 19 API-ruter under `src/app/api/` garanterer nå
JSON-feilrespons ved uventet feil. `timeZone: 'Europe/Oslo'` lagt til på 6 datoformateringssteder.
`@supabase/supabase-js` fjernet. Se `change-requests/CR-011-hetzner-coolify-migration.md`.

Tidligere: 2026-05-22 — CR-007: admin/categories CRUD (ny: CategoryForm, DeactivateCategoryButton, new/page, [id]/page), nye API-ruter GET+POST+PATCH+DELETE, getAdminCategoriesFull/getAdminCategoryById i adminQueries, AdminCategoryRow i types/admin.
