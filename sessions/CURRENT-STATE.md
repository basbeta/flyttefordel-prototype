# CURRENT-STATE.md

> Updated at the end of every session. Read by Claude at startup.

## Current Phase
FASE 5 FULLFØRT — Targeting-logikk implementert og committed. Klar for Vercel deploy.

## Current Objectives
1. Deploy CR-005 til Vercel prod og verifiser targeting i live-app

## Current Branch
master

## Blockers
Ingen aktive blockers.

## Active Change Requests
- CR-001: Fase 1 — Grunnmur (Status: Done)
- CR-002: Fase 2 — Fordeler i app (Status: Done)
- CR-003: Fase 3 — Anonyme sesjoner, lagrede fordeler, profil (Status: Done)
- CR-004: Fase 4 — Admin-grensesnitt (Status: Done)
- CR-005: Fase 5 — Targeting-logikk (Status: Done — committed afab783)

## Recently Modified Systems
- `src/lib/targeting/index.ts` — ny targeting-modul: matchesSession() ren funksjon (2026-05-22)
- `src/lib/targeting/index.test.ts` — 18 unit-tester for targeting (2026-05-22)
- `src/lib/queries/benefitQueries.ts` — targeting-join + in-memory filter (2026-05-22)
- `src/lib/queries/heroQueries.ts` — targeting-join + fallback-hero-logikk (2026-05-22)
- `src/lib/queries/adminQueries.ts` — targeting inkludert i benefit- og hero-detalj (2026-05-22)
- `src/app/admin/(protected)/benefits/BenefitForm.tsx` — ny Targeting-seksjon (2026-05-22)
- `src/app/admin/(protected)/heroes/HeroForm.tsx` — ny Targeting-seksjon (2026-05-22)
- Admin API benefits + heroes — targeting upsert i POST og PATCH (2026-05-22)

## Produksjon
- **PWA**: https://flyttefordel-prototype.vercel.app
- **Admin**: https://flyttefordel-prototype.vercel.app/admin
- Admin-brukere: `kvinnesland@gmail.com` og `calle.duvdal@bas.no` — passord: `Demopassord`

## Validation Status
✓ `npx tsc --noEmit` — ingen feil (2026-05-22, etter CR-005)
✓ `npx vitest run` — 18/18 tester bestått (2026-05-22, CR-005)
✓ Vercel production deploy — bygget rent, 37 ruter (CR-004 basis)
⏳ Vercel deploy av CR-005 — ikke gjort ennå

## Notes
- `<img>` brukes i stedet for `next/image` — lint warning, akseptabelt for demo
- Targeting ikke aktivt ennå — alle aktive fordeler vises for alle brukere (CR-005)
- Supabase free tier pauser etter 1 uke uten aktivitet — se lib/db/client.ts
- Admin-auth: ADMIN_EMAILS (kommaseparert), ADMIN_PASSWORD, ADMIN_JWT_SECRET — alle satt i Vercel
- `prisma db push` brukes for schema-endringer (migrate dev er interaktiv)
- TargetingRule-tabellen er allerede i prod — ingen DB-migrering nødvendig for CR-005

## Next Recommended Actions
1. Push til Vercel (git push → auto-deploy) for å aktivere targeting i prod
2. Test i prod: opprett fordel med postnummer-targeting i admin, verifiser filtrering i consumer-app
3. Vurder CR-006: Kode-tildeling (unique_code redemption-type) som neste fase
