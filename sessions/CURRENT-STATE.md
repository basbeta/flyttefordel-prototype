# CURRENT-STATE.md

> Updated at the end of every session. Read by Claude at startup.

## Current Phase
PRD-REVISJON — Nye PRD-versjoner (01–05) mottatt og gjennomgått for intern koherens.
Implementeringsarbeid på vent til PRD-inkonsiстenser er avklart av produkteier.

## Current Objectives
Avklar 4 PRD-inkonsiстenser (ISSUE-009) før neste implementeringssesjon.

## Current Branch
claude/serene-mayer-hfrhU (feature-branch, ikke merget til master)

## Blockers
ISSUE-009 (PRD-inkonsiстenser) — bør avklares før ny CR opprettes for MVP-auth/innlogging.

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
- CR-011: Rate limiting på claim-endepunkt (Status: Draft — avventer Upstash Redis)
- CR-012: Bruker-autentisering (Supabase Auth e-post) (Status: Draft — avventer NEXT_PUBLIC_ANON_KEY)
- CR-013: Varsling ved lav kode-beholdning (Status: Draft — avventer Resend API-nøkkel)
- CR-014: Per-sesjon LTV-estimat på /admin/profitability (Status: Draft — ingen avhengigheter)

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

## New PRD Documents (2026-05-28)
Nye versjoner av PRD 01–05 mottatt. Gjennomgått for intern koherens. Fire inkonsiстenser
identifisert — se ISSUE-009. PRD-ene beskriver en vesentlig annen arkitektur enn nåværende
prototype (fullt påkrevd innlogging, Vipps + SMS, ingen anonyme sesjoner).

Nye PRDs lagres i `docs/` (ikke gjort ennå — avventer beslutning om filstruktur).

## Arkitekturavvik — ny PRD vs nåværende prototype
Nåværende prototype (CR-001–CR-010) er bygget rundt anonyme cookie-sesjoner.
Nye PRD-er (særlig PRD 02) krever obligatorisk innlogging med Vipps/SMS fra start.
Dette er en breaking endring som vil kreve ny CR og vesentlig arkitekturarbeid.

## Next Recommended Actions
1. Avklar PRD-inkonsiстenser (ISSUE-009) — produkteier bestemmer
2. Lagre reviderte PRD-dokumenter i docs/ med versjonsnummer
3. Vurder ny «Arkitektur-gap»-CR for å beskrive delta mellom prototype og MVP-PRD
4. Implementer CR-014 (sesjon-LTV) — kan gjøres parallelt, uavhengig av PRD-avklaring
5. Implementer CR-011 (rate limiting) — krever Upstash Redis-konto + env vars
