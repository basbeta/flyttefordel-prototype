# CURRENT-STATE.md

> Updated at the end of every session. Read by Claude at startup.

## Current Phase
CR-006 FULLFØRT — Unik kode-tildeling implementert og reviewet. 6 CRs fullført (CR-001–CR-006). Klar for push til prod eller neste CR.

## Current Objectives
Ingen aktive objectives. CR-006 fullført, klar for prod-deploy.

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

## Recently Modified Systems
- `src/lib/codes/claimCode.ts` — ny modul: atomisk kode-tildeling, idempotency per sesjon (2026-05-22)
- `src/lib/codes/claimCode.test.ts` — 4 unit-tester for claimCode (2026-05-22)
- `src/app/api/benefits/[slug]/claim-code/route.ts` — fullstendig implementasjon, erstattet CR-002 stub (2026-05-22)

## Produksjon
- **PWA**: https://flyttefordel-prototype.vercel.app
- **Admin**: https://flyttefordel-prototype.vercel.app/admin
- Admin-brukere: `kvinnesland@gmail.com` og `calle.duvdal@bas.no` — passord: `Demopassord`

## Validation Status
✓ `npx tsc --noEmit` — ingen feil (2026-05-22, etter CR-006)
✓ `npx vitest run` — 22/22 tester bestått (2026-05-22, CR-006)
✓ Vercel production deploy — CR-005 live (2026-05-22, commit 753a7a3)
✓ Prod-verifisering PASS — targeting filtrerer korrekt (2026-05-22)
⏳ CR-006 ikke pushet til prod ennå (commit af43de6 + W4-fix)

## Notes
- `<img>` brukes i stedet for `next/image` — lint warning, akseptabelt for demo
- Targeting er aktivt i prod — fordeler/heroer uten TargetingRule vises for alle (matchesSession(null) = true)
- Supabase free tier pauser etter 1 uke uten aktivitet — se lib/db/client.ts
- Admin-auth: ADMIN_EMAILS (kommaseparert), ADMIN_PASSWORD, ADMIN_JWT_SECRET — alle satt i Vercel
- `prisma db push` brukes for schema-endringer (migrate dev er interaktiv)
- vitest er lagt til som devDependency — `npm test` kjører alle unit-tester

## Next Recommended Actions
1. Push CR-006 til prod: `git push` → Vercel auto-deploy
2. Verifiser i prod: opprett fordel med `redemptionType = unique_code`, legg til koder i pool, test claim-flyt
3. Planlegg neste CR — kandidater:
   a. CR-007: Kategori-administrasjon i admin (CRUD for Category-tabellen)
   b. CR-008: Analytics dashboard (BenefitEvent-aggregering, charts)
4. Vurder Supabase oppgradering til betalt tier for å eliminere pause-problemet
