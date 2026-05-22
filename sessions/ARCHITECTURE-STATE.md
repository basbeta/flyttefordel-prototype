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
| `/lib/auth` | Utsatt | Supabase Auth (e-postinnlogging) — utsatt, krever NEXT_PUBLIC_ANON_KEY |
| `/lib/session` | Fase 3 ✓ | Anonym sesjon via cookie + DB UserSession upsert |
| `/lib/targeting` | Fase 5 ✓ | matchesSession() — ren funksjon, ingen I/O. Importeres av queries. |
| `/lib/db` | Fase 1 ✓ | Prisma client + schema |
| `/lib/queries` | Fase 2 ✓ | benefitQueries, heroQueries |
| `/lib/targeting` | Fase 5 ✓ | Fordel/hero targeting-logikk |
| `/lib/tracking` | Fase 2 ✓ | trackEvent — fire-and-forget BenefitEvent |
| `/lib/validation` | Ikke startet | Zod-schemas (lead-validering inline per nå) |
| `/lib/codes` | Fase 6 ✓ | Atomisk unik kode-tildeling via $transaction |
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
- @supabase/supabase-js (auth og storage — ikke DB)
- Zod (validering)
- qrcode (QR-generering)
- papaparse (CSV-parsing)

## Tech Stack
Next.js 14 + TypeScript | Supabase (PostgreSQL + Auth + Storage) | Prisma ORM | Vercel Hobby

## Last Structural Change
2026-05-22 — CR-007: admin/categories CRUD (ny: CategoryForm, DeactivateCategoryButton, new/page, [id]/page), nye API-ruter GET+POST+PATCH+DELETE, getAdminCategoriesFull/getAdminCategoryById i adminQueries, AdminCategoryRow i types/admin.
