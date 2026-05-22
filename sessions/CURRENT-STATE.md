# CURRENT-STATE.md

> Updated at the end of every session. Read by Claude at startup.

## Current Phase
FASE 4 FULLFØRT, FASE 5 PLANLAGT — Admin-backoffice i prod (Vercel). CR-005 opprettet og klar for implementering.

## Current Objectives
1. Implementere CR-005: Targeting-logikk (neste sesjon)

## Current Branch
master

## Blockers
Ingen aktive blockers.

## Active Change Requests
- CR-001: Fase 1 — Grunnmur (Status: Done)
- CR-002: Fase 2 — Fordeler i app (Status: Done)
- CR-003: Fase 3 — Anonyme sesjoner, lagrede fordeler, profil (Status: Done)
- CR-004: Fase 4 — Admin-grensesnitt (Status: Done)
- CR-005: Fase 5 — Targeting-logikk (Status: Draft — klar for godkjenning og implementering)

## Recently Modified Systems
- `src/lib/admin/auth.ts` — ADMIN_EMAILS støtter kommaseparert liste med admin-eposter (2026-05-22)
- `change-requests/CR-005-targeting.md` — opprettet, klar for godkjenning (2026-05-22)

## Produksjon
- **PWA**: https://flyttefordel-prototype.vercel.app
- **Admin**: https://flyttefordel-prototype.vercel.app/admin
- Admin-brukere: `kvinnesland@gmail.com` og `calle.duvdal@bas.no` — passord: `Demopassord`

## Validation Status
✓ `npx tsc --noEmit` — ingen feil (2026-05-22)
✓ Vercel production deploy — bygget rent, 37 ruter, 0 TypeScript-feil

## Notes
- `<img>` brukes i stedet for `next/image` — lint warning, akseptabelt for demo
- Targeting ikke aktivt ennå — alle aktive fordeler vises for alle brukere (CR-005)
- Supabase free tier pauser etter 1 uke uten aktivitet — se lib/db/client.ts
- Admin-auth: ADMIN_EMAILS (kommaseparert), ADMIN_PASSWORD, ADMIN_JWT_SECRET — alle satt i Vercel
- `prisma db push` brukes for schema-endringer (migrate dev er interaktiv)
- TargetingRule-tabellen er allerede i prod — ingen DB-migrering nødvendig for CR-005

## Next Recommended Actions
1. Godkjenn CR-005 og kjør `/implement CR-005`
2. Start med `src/lib/targeting/index.ts` (matchesSession — ren funksjon, lett å teste)
3. Integrer i benefitQueries og heroQueries
4. Legg til targeting-seksjon i BenefitForm og HeroForm
5. Test: opprett fordel med postnummer-targeting i admin, verifiser at den filtreres riktig i consumer-app
