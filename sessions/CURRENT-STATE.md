# CURRENT-STATE.md

> Updated at the end of every session. Read by Claude at startup.

## Current Phase
CR-007 IMPLEMENTERT — Kategori-administrasjon fullstendig CRUD i admin. 7 CRs fullført (CR-001–CR-007). Klart for push og prod-deploy.

## Current Objectives
Ingen aktive objectives. Åpent støttespørsmål: «gratis kaffe»-fordel vises ikke i appen (ISSUE-007).

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
- CR-006: Unik kode-tildeling (Status: Done — committed af43de6)
- CR-007: Kategori-administrasjon i admin (Status: Done)

## Recently Modified Systems
- `src/types/admin.ts` — AdminCategoryRow lagt til (2026-05-22, CR-007)
- `src/lib/queries/adminQueries.ts` — getAdminCategoriesFull() + getAdminCategoryById() (2026-05-22, CR-007)
- `src/app/api/admin/categories/` — ny: GET+POST+PATCH+DELETE for kategorier (2026-05-22, CR-007)
- `src/app/admin/(protected)/categories/` — CRUD-sider: liste, ny, rediger, deaktiver (2026-05-22, CR-007)

## Produksjon
- **PWA**: https://flyttefordel-prototype.vercel.app
- **Admin**: https://flyttefordel-prototype.vercel.app/admin
- Admin-brukere: `kvinnesland@gmail.com` og `calle.duvdal@bas.no` — passord: `Demopassord`

## Validation Status
✓ `npx tsc --noEmit` — ingen feil (2026-05-22, etter CR-007)
✓ `npx vitest run` — 28/28 tester bestått (2026-05-22, CR-007)
⏳ Vercel production deploy — CR-007 ikke pushet ennå
✓ ISSUE-007 resolved — «gratis kaffe» startsAt/endsAt satt til null (2026-05-22)

## Notes
- `<img>` brukes i stedet for `next/image` — lint warning, akseptabelt for demo
- Targeting er aktivt i prod — fordeler/heroer uten TargetingRule vises for alle (matchesSession(null) = true)
- Supabase free tier pauser etter 1 uke uten aktivitet — se lib/db/client.ts
- Admin-auth: ADMIN_EMAILS (kommaseparert), ADMIN_PASSWORD, ADMIN_JWT_SECRET — alle satt i Vercel
- `prisma db push` brukes for schema-endringer (migrate dev er interaktiv)
- vitest er lagt til som devDependency — `npm test` kjører alle unit-tester

## Next Recommended Actions
1. Løs ISSUE-007: åpne «gratis kaffe»-fordelen i admin og verifiser status (må være `active`), targeting (sjekk `includeUnknownLocation`), og datoer (startsAt/endsAt)
2. Verifiser CR-006 i prod: opprett fordel med `redemptionType = unique_code`, legg til koder i pool via admin /codes, test claim-flyt i appen
3. Planlegg neste CR — kandidater:
   a. CR-007: Kategori-administrasjon i admin (CRUD for Category-tabellen)
   b. CR-008: Analytics dashboard (BenefitEvent-aggregering, charts)
   c. CR-009: Rate limiting på claim-endepunkt (ISSUE-007-relatert risiko)
4. Vurder Supabase oppgradering til betalt tier for å eliminere pause-problemet
