# CURRENT-STATE.md

> Updated at the end of every session. Read by Claude at startup.

## Current Phase
CR-011 PÅGÅR — Hetzner/Coolify-migrering. Kodedel (Dockerfile, migrasjonsfix, timeout-herding,
JSON-feilrespons-audit, TZ-fix, fjerning av ubrukt Supabase-SDK) er ferdig og validert lokalt.
Gjenstår: faktisk Coolify/Hetzner-infra-oppsett (utenfor Claude sin kontroll) og cutover.
10 CRs fullført (CR-001–CR-010) før dette.

## Current Objectives
CR-011: fullføre Coolify/Hetzner-infra-oppsett (se checklist i CR-011) og verifisere prod-deploy
før CR-011 markeres Done.

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
- CR-011: Migrering til Hetzner/Coolify (Status: In Progress — kodedel ferdig, infra-oppsett gjenstår)

## Recently Modified Systems
- `Dockerfile`, `.dockerignore` — NYE, single-stage node:22-alpine build (2026-08-05, CR-011)
- `prisma/migrations/20260805000000_init/` — erstatter utdatert `20260522100321_init`; regenerert fra schema.prisma da CR-003/CR-009/CR-010-felter manglet i den gamle (kun kjørt via `db push`, aldri via migrate) (2026-08-05, CR-011)
- `src/lib/db/client.ts` — connect_timeout/socket_timeout lagt til på DATABASE_URL, build-safe når url mangler (2026-08-05, CR-011)
- `src/app/api/**/*.ts` (16 av 19 ruter) — try/catch lagt til rundt Prisma-kall, garantert JSON-feilrespons (2026-08-05, CR-011)
- 6 admin-sider — `timeZone: 'Europe/Oslo'` lagt til på dato-formatering: benefits/page.tsx, heroes/page.tsx, LeadsTable.tsx, codes/[poolId]/page.tsx (2026-08-05, CR-011)
- `package.json` — `@supabase/supabase-js` fjernet (ubrukt) (2026-08-05, CR-011)
- `specs/architecture.md`, `.env.example`, `sessions/ARCHITECTURE-STATE.md` — oppdatert for ny plattform (2026-08-05, CR-011)
- `prisma/schema.prisma` — 4 Decimal prisfelter på Benefit (2026-05-22, CR-010)
- `src/types/admin.ts` — AdminBenefitProfitability, AdminAdvertiserProfitability, AdminTypeProfitability (2026-05-22, CR-010)
- `src/lib/queries/adminQueries.ts` — getProfitabilityData() (2026-05-22, CR-010)
- `src/app/admin/(protected)/profitability/page.tsx` — NY: lønnsomhetsside (2026-05-22, CR-010)

## Produksjon
- **PWA**: https://flyttefordel-prototype.vercel.app (Vercel/Supabase — fortsatt live, urørt fallback til CR-011 er verifisert stabil)
- **Admin**: https://flyttefordel-prototype.vercel.app/admin
- Admin-brukere: `kvinnesland@gmail.com` og `calle.duvdal@bas.no` — passord: `Demopassord`
- CR-011: ny Coolify/Hetzner-URL settes her når infra-oppsettet (se CR-011-checklist) er fullført og verifisert

## Validation Status
✓ `npx tsc --noEmit` — ingen feil (2026-08-05, etter CR-011 kodeendringer)
✓ `npx vitest run` — 41/41 tester bestått (2026-08-05, CR-011)
✓ `npm run build` — bygger rent lokalt med Node 22 (2026-08-05, CR-011)
⚠ `docker build` — IKKE verifisert lokalt (Docker ikke installert på denne maskinen). Coolifys egen build blir første reelle verifisering.
⚠ Coolify/Hetzner-infra — IKKE satt opp av Claude (utenfor verktøytilgang). Se checklist i CR-011.
✓ `npx tsc --noEmit` — ingen feil (2026-05-22, etter CR-010)
✓ Vercel production deploy — CR-010 pushet (commit e5f0c81)
✓ ISSUE-007 resolved — «gratis kaffe» startsAt/endsAt satt til null (2026-05-22)
✓ ISSUE-008 resolved — DB unique constraint + deaktiver-kode + detaljside (2026-05-22, CR-009)

## Notes
- `<img>` brukes i stedet for `next/image` — lint warning, akseptabelt for demo
- Targeting er aktivt i prod — fordeler/heroer uten TargetingRule vises for alle (matchesSession(null) = true)
- Admin-auth: ADMIN_EMAILS (kommaseparert), ADMIN_PASSWORD, ADMIN_JWT_SECRET — må re-provisjoneres som Coolify-miljøvariabler (CR-011), ikke gjenbruk av Vercel sine
- vitest er lagt til som devDependency — `npm test` kjører alle unit-tester
- Node.js er installert lokalt (denne maskinen) via `winget install OpenJS.NodeJS.22 --scope user` — se memory. Bruk `$env:PATH = "C:\Users\haavard.kvinnesland\AppData\Local\Microsoft\WinGet\Packages\OpenJS.NodeJS.22_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v22.23.2-win-x64;$env:PATH"` i hver PowerShell-kommando som trenger node/npm — PATH-endringen fra winget vedvarer ikke i denne økt-typen shell.
- KRITISK: `npm ci` avdekket 12 sårbarheter (1 kritisk, 10 high) i avhengigheter, inkl. en kjent CVE i `next@14.2.3` med patch tilgjengelig. Ikke fikset i CR-011 (utenfor scope — infra-migrering, ikke avhengighetsoppgradering, jf. playbook §6). Se OPEN-ISSUES.md ISSUE-009.

## Next Recommended Actions
1. Fullfør CR-011 sin Coolify/Hetzner-infra-checklist (FQDN før webhook, fersk Postgres, backup-verifisering, uptime-monitoring, HTTPS feilsporing-DSN)
2. Deploy til Coolify, kjør smoke test (innlogging, kjerneflyt, CSV-eksport), verifiser `docker build`/`migrate deploy` fungerer i praksis (ikke lokalt verifiserbart)
3. Kjør `/review` og marker CR-011 Done når infra er stabil
4. ISSUE-009 (ny, høy prioritet): vurder `next@14.2.3` sikkerhetsoppdatering som egen CR
5. Etter CR-011: planlegg neste CR — kandidater:
   a. Rate limiting på claim-endepunkt (krever Redis)
   b. Bruker-autentisering (ny leverandør — Supabase Auth ikke lenger et alternativ, se ARCHITECTURE-STATE.md)
   c. Notifikasjoner ved lav pool-beholdning (e-post / webhook)
   d. Per-sesjon LTV-estimat på /admin/profitability (AdminSessionLTV — type definert, query ikke implementert)
