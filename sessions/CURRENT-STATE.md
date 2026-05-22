# CURRENT-STATE.md

> Updated at the end of every session. Read by Claude at startup.

## Current Phase
CR-010 IMPLEMENTERT — Lønnsomhetsanalyse fullstendig. 10 CRs fullført (CR-001–CR-010).

## Current Objectives
Ingen aktive objectives.

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
- CR-010: Lønnsomhetsanalyse (Status: Done — committed e5f0c81)

## Recently Modified Systems
- `prisma/schema.prisma` — 4 Decimal prisfelter på Benefit (2026-05-22, CR-010)
- `src/types/admin.ts` — AdminBenefitProfitability, AdminAdvertiserProfitability, AdminTypeProfitability (2026-05-22, CR-010)
- `src/lib/queries/adminQueries.ts` — getProfitabilityData() (2026-05-22, CR-010)
- `src/app/api/admin/benefits/route.ts` — prisfelter i POST Zod-schema (2026-05-22, CR-010)
- `src/app/api/admin/benefits/[id]/route.ts` — prisfelter i PATCH Zod-schema (2026-05-22, CR-010)
- `src/app/admin/(protected)/benefits/BenefitForm.tsx` — Økonomi-seksjon med 4 prisfelter (2026-05-22, CR-010)
- `src/app/admin/(protected)/benefits/[id]/page.tsx` — Decimal→number konvertering (2026-05-22, CR-010)
- `src/app/admin/(protected)/profitability/page.tsx` — NY: lønnsomhetsside (2026-05-22, CR-010)
- `src/components/admin/AdminSidebar.tsx` — Lønnsomhet nav-lenke (2026-05-22, CR-010)

## Produksjon
- **PWA**: https://flyttefordel-prototype.vercel.app
- **Admin**: https://flyttefordel-prototype.vercel.app/admin
- Admin-brukere: `kvinnesland@gmail.com` og `calle.duvdal@bas.no` — passord: `Demopassord`

## Validation Status
✓ `npx tsc --noEmit` — ingen feil (2026-05-22, etter CR-010)
✓ `npx vitest run` — 41/41 tester bestått (2026-05-22, CR-010)
✓ `prisma db push` — 4 Decimal prisfelter lagt til (2026-05-22, CR-010)
✓ Vercel production deploy — CR-010 pushet (commit e5f0c81)
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
1. Verifiser CR-010 i prod: åpne /admin/profitability og sjekk at tabellene vises
2. Legg inn prisfelter på en fordel i /admin/benefits for å verifisere at inntekt beregnes
3. Planlegg neste CR — kandidater:
   a. Rate limiting på claim-endepunkt (serverless-kompatibel, krever Upstash Redis)
   b. Bruker-autentisering (Supabase Auth e-post-innlogging)
   c. Notifikasjoner ved lav pool-beholdning (e-post / webhook)
   d. Per-sesjon LTV-estimat på /admin/profitability (AdminSessionLTV — type definert, query ikke implementert)
4. Vurder Supabase oppgradering til betalt tier for å eliminere pause-problemet
