# ARCHITECTURE-STATE.md

> Describes current system architecture. Updated on every structural change.
> Read by Claude at session startup.

## Current Phase
FASE 2 FULLFØRT — Consumer-app med herokarusell, fordelsliste og detaljside ferdig.

## Module Map

| Modul | Status | Ansvar |
|---|---|---|
| `/app/(mobile)` | Fase 2 ✓ | Hjemskjerm, fordelsliste, fordelsdetalj |
| `/app/admin` | Fase 1 ✓ (placeholder) | Backoffice admin — desktop-first |
| `/app/api/track` | Fase 2 ✓ | POST hendelseslogging |
| `/app/api/benefits/[slug]/lead` | Fase 2 ✓ | POST lead-innsending |
| `/components/mobile` | Fase 2 ✓ | HeroCarousel, BenefitCard, CategoryFilter, MobileShell, BottomNavigation, TopBar |
| `/components/admin` | Fase 1 ✓ | AdminShell, AdminSidebar (placeholder) |
| `/components/shared` | Fase 1 ✓ | Button |
| `/lib/auth` | Ikke startet | Auth (Supabase Auth — isolert for migrering) |
| `/lib/db` | Fase 1 ✓ | Prisma client + schema |
| `/lib/queries` | Fase 2 ✓ | benefitQueries, heroQueries |
| `/lib/targeting` | Ikke startet | Fordel/hero targeting-logikk |
| `/lib/tracking` | Fase 2 ✓ | trackEvent — fire-and-forget BenefitEvent |
| `/lib/validation` | Ikke startet | Zod-schemas (lead-validering inline per nå) |
| `/lib/codes` | Ikke startet | Atomisk unik kode-tildeling |
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
2026-05-22 — CR-002: lib/queries/ og lib/tracking/ lagt til. Consumer-app ruter live.
