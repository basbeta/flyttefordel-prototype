# CURRENT-STATE.md

> Updated at the end of every session. Read by Claude at startup.

## Current Phase
CR-009 IMPLEMENTERT — Fraud prevention og kode-detaljside fullstendig. 9 CRs fullført (CR-001–CR-009).

## Current Objectives
Ingen aktive objectives. ISSUE-008 lukket.

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
- CR-008: Analytics dashboard (Status: Done — committed 220f558)
- CR-009: Fraud prevention — kode-audit og DB-integritet (Status: Done — committed c1cf64c)

## Recently Modified Systems
- `prisma/schema.prisma` — @@unique([codePoolId, codeValue]) på Code (2026-05-22, CR-009)
- `src/types/admin.ts` — AdminCodeRow + AdminCodePoolDetail lagt til (2026-05-22, CR-009)
- `src/lib/queries/adminQueries.ts` — getAdminCodePoolDetail(poolId) (2026-05-22, CR-009)
- `src/app/api/admin/codes/[poolId]/route.ts` — forenklet med skipDuplicates: true (2026-05-22, CR-009)
- `src/app/api/admin/codes/[poolId]/[codeId]/route.ts` — ny: PATCH disable (2026-05-22, CR-009)
- `src/app/admin/(protected)/codes/[poolId]/` — ny: detaljside + DisableCodeButton (2026-05-22, CR-009)

## Produksjon
- **PWA**: https://flyttefordel-prototype.vercel.app
- **Admin**: https://flyttefordel-prototype.vercel.app/admin
- Admin-brukere: `kvinnesland@gmail.com` og `calle.duvdal@bas.no` — passord: `Demopassord`

## Validation Status
✓ `npx tsc --noEmit` — ingen feil (2026-05-22, etter CR-009)
✓ `npx vitest run` — 35/35 tester bestått (2026-05-22, CR-009)
✓ `prisma db push` — unique constraint lagt til uten duplikat-feil (2026-05-22, CR-009)
✓ Vercel production deploy — CR-009 pushet (commit c1cf64c)
✓ ISSUE-007 resolved — «gratis kaffe» startsAt/endsAt satt til null (2026-05-22)
✓ ISSUE-008 resolved — DB unique constraint + deaktiver-kode + detaljside (2026-05-22, CR-009)

## Notes
- `<img>` brukes i stedet for `next/image` — lint warning, akseptabelt for demo
- Targeting er aktivt i prod — fordeler/heroer uten TargetingRule vises for alle (matchesSession(null) = true)
- Supabase free tier pauser etter 1 uke uten aktivitet — se lib/db/client.ts
- Admin-auth: ADMIN_EMAILS (kommaseparert), ADMIN_PASSWORD, ADMIN_JWT_SECRET — alle satt i Vercel
- `prisma db push` brukes for schema-endringer (migrate dev er interaktiv)
- vitest er lagt til som devDependency — `npm test` kjører alle unit-tester

## Next Recommended Actions
1. Verifiser CR-009 i prod: åpne /admin/codes, klikk «Se koder» på en pool, test «Deaktiver»-knapp
2. Verifiser CR-008 i prod: åpne /admin/analytics og sjekk at data vises korrekt per periode
3. Planlegg neste CR — kandidater:
   a. Rate limiting på claim-endepunkt (serverless-kompatibel, krever Upstash Redis eller lignende)
   b. Bruker-autentisering (Supabase Auth e-post-innlogging) — CR-010
   c. Notifikasjoner ved lav pool-beholdning (e-post / webhook)
4. Vurder Supabase oppgradering til betalt tier for å eliminere pause-problemet
