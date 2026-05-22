# CURRENT-STATE.md

> Updated at the end of every session. Read by Claude at startup.

## Current Phase
FASE 4 FULLFØRT — Admin-grensesnitt med JWT-auth, fordeler/annonsører/heroer/leads/koder-CRUD implementert og pushet. Vercel deployer automatisk fra master.

## Current Objectives
Ingen aktive objectives. Alle fire faser er fullført.

## Current Branch
master

## Blockers
Ingen aktive blockers.

## Active Change Requests
- CR-001: Fase 1 — Grunnmur (Status: Done)
- CR-002: Fase 2 — Fordeler i app (Status: Done)
- CR-003: Fase 3 — Anonyme sesjoner, lagrede fordeler, profil (Status: Done)
- CR-004: Fase 4 — Admin-grensesnitt (Status: Done)

## Recently Modified Systems
- `src/middleware.ts` — JWT-guard for /admin/**, anon-sesjon for consumer-app (2026-05-22)
- `src/lib/admin/auth.ts` — signAdminJWT, verifyAdminJWT, requireAdminAuth, validateAdminCredentials (2026-05-22)
- `src/lib/queries/adminQueries.ts` — alle admin-dataspørringer (2026-05-22)
- `src/app/admin/(protected)/` — dashboard, fordeler, annonsører, heroer, leads, koder, kategorier, innstillinger (2026-05-22)
- `src/app/admin/login/` — innloggingsside (2026-05-22)
- `src/app/api/admin/` — alle admin-API-ruter (auth, benefits, advertisers, heroes, leads, codes) (2026-05-22)
- `src/components/admin/AdminShell.tsx` — topbar + logout-knapp (2026-05-22)
- `src/components/admin/AdminTable.module.css` — delte admin-stiler (2026-05-22)

## Validation Status
✓ `npx tsc --noEmit` — ingen feil (2026-05-22)
✓ `git push origin master` — pushet, Vercel deployer automatisk

## Notes
- `<img>` brukes i stedet for `next/image` — lint warning, akseptabelt for demo (byttes ved MVP)
- Targeting ikke aktivt — alle aktive fordeler vises for alle brukere (utsatt til fremtidig CR)
- Supabase free tier pauser etter 1 uke inaktivitet — se lib/db/client.ts
- Admin-auth: JWT signert med ADMIN_JWT_SECRET env var (kun .env.local, aldri i kode)
- Admin-innlogging: ADMIN_EMAIL + ADMIN_PASSWORD env vars — MÅ settes i Vercel dashboard
- `prisma db push` brukes for schema-endringer
- NEXT_PUBLIC_ANON_KEY og SUPABASE_SERVICE_ROLE_KEY er fortsatt placeholder

## Next Recommended Actions
1. Sett ADMIN_EMAIL, ADMIN_PASSWORD og ADMIN_JWT_SECRET i Vercel-prosjektets environment variables
2. Test admin-innlogging på produksjons-URL via Vercel
3. Legg til seed-data via admin-grensesnitt (annonsør → fordel → aktiver)
4. Vurder CR-005: Targeting-logikk basert på postnummer og flyttestatus
