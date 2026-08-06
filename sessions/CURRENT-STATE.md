# CURRENT-STATE.md

> Updated at the end of every session. Read by Claude at startup.

## Current Phase
CR-011 PÅGÅR — Hetzner/Coolify-migrering. App er LIVE på
https://flyttefordel-prototype.basbeta.no og verifisert med reell data
(kategori, annonsør, fordel opprettet og vist korrekt i forbrukerappen).
To reelle deploy-blokkerende bugs ble funnet og fikset under selve
utrullingen (se Recently Modified Systems). Uptime-monitoring bekreftet
aktiv på Uptime Kuma (2026-08-06). Feilsporing fjernet fra scope
(bruker-beslutning 2026-08-06, se DECISIONS.md). Gjenstår før CR-011 kan
markeres Done: backup-verifisering ("Backup Now") og en avsluttende
`/review`.
CR-012 (bildeopplasting) opprettet og godkjent 2026-08-06. Bucket
`basbeta-pub-object-storage` opprettet av bruker på Hetzner Object Storage
(Public read-only, fsn1), nøkler satt som Coolify-miljøvariabler.
Kodedelen er FERDIG og validert lokalt (tsc/vitest/build alle grønne,
18 nye tester) — se Recently Modified Systems. Gjenstår: manuell
smoke test mot ekte bucket i prod, deretter `/review` og CR-012 Done.
10 CRs fullført (CR-001–CR-010) før dette.

## Current Objectives
CR-011: bekreft backup med "Backup Now", deretter kjør `/review` på nytt
og marker CR-011 Done.
CR-012: deploy kodeendringene til prod, kjør manuell smoke test (last opp
bilde for fordel/annonsør/hero, bekreft synlig i forbrukerappen og at
ugyldige filer avvises med tydelig feilmelding), deretter `/review` og
CR-012 Done.

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
- CR-011: Migrering til Hetzner/Coolify (Status: In Progress — LIVE og verifisert i prod, kun backup-verifisering gjenstår før Done)
- CR-012: Bildeopplasting i admin-grensesnittet (Status: In Progress — kode ferdig og validert lokalt, manuell smoke test mot ekte bucket gjenstår)

## Recently Modified Systems
- `package.json` — `@aws-sdk/client-s3` lagt til (2026-08-06, CR-012)
- `src/lib/storage/` — NYE: client.ts (lazy S3-klient, build-safe), validateImage.ts (magic-byte-validering, maks 5MB, jpg/png/webp), uploadImage.ts, index.ts + 18 unit-tester (2026-08-06, CR-012)
- `src/app/api/admin/upload/route.ts` — NY: admin-auth-guardet opplastingsrute + 5 tester (2026-08-06, CR-012)
- `src/components/admin/ImageUploadField.tsx` — NY: delt opplastingskomponent for alle tre admin-formene (2026-08-06, CR-012)
- `HeroForm.tsx`, `BenefitForm.tsx`, `AdvertiserForm.tsx` + tilhørende API-ruter — bilde-/logo-felt lagt til (imageUrl/imageAlt manglet helt i BenefitForm, logoUrl manglet helt i AdvertiserForm før denne CR-en) (2026-08-06, CR-012)
- `specs/architecture.md`, `specs/entities.md`, `.env.example` — oppdatert for ny S3-storage-modul (2026-08-06, CR-012)
- `Dockerfile`, `.dockerignore` — NYE, single-stage node:22-alpine build (2026-08-05, CR-011)
- `Dockerfile` — fix: `RUN apk add --no-cache openssl` — Prisma 5.x sin native schema-engine fant ikke libssl i Alpine, containeren crash-loopet 10/10 restarts inntil fikset (2026-08-05, CR-011, commit d5ecd55)
- `package.json` — fix: `"build": "prisma generate && next build"` — Docker-buildet feilet fordi npm ci sin Prisma-postinstall kjørte før schema.prisma var kopiert inn (2026-08-05, CR-011, commit fd72641)
- `prisma/migrations/20260805000000_init/` — erstatter utdatert `20260522100321_init`; regenerert fra schema.prisma da CR-003/CR-009/CR-010-felter manglet i den gamle (kun kjørt via `db push`, aldri via migrate) (2026-08-05, CR-011)
- `src/lib/db/client.ts`, `client.test.ts` — connect_timeout/socket_timeout lagt til på DATABASE_URL, build-safe når url mangler, 4 nye unit-tester (2026-08-05, CR-011)
- `src/app/api/**/*.ts` (16 av 19 ruter) — try/catch lagt til rundt Prisma-kall, garantert JSON-feilrespons (2026-08-05, CR-011)
- 4 admin-sider — `timeZone: 'Europe/Oslo'` lagt til på 6 dato-formateringssteder: benefits/page.tsx, heroes/page.tsx, LeadsTable.tsx (2 kall), codes/[poolId]/page.tsx (2 kall) (2026-08-05, CR-011)
- `package.json` — `@supabase/supabase-js` fjernet (ubrukt) (2026-08-05, CR-011)
- `specs/architecture.md`, `.env.example`, `sessions/ARCHITECTURE-STATE.md` — oppdatert for ny plattform (2026-08-05, CR-011)
- `prisma/schema.prisma` — 4 Decimal prisfelter på Benefit (2026-05-22, CR-010)
- `src/types/admin.ts` — AdminBenefitProfitability, AdminAdvertiserProfitability, AdminTypeProfitability (2026-05-22, CR-010)
- `src/lib/queries/adminQueries.ts` — getProfitabilityData() (2026-05-22, CR-010)
- `src/app/admin/(protected)/profitability/page.tsx` — NY: lønnsomhetsside (2026-05-22, CR-010)

## Produksjon
- **Ny plattform (CR-011)**: https://flyttefordel-prototype.basbeta.no — LIVE på Coolify/Hetzner,
  fresh postgres:18-alpine, verifisert med reell admin-opprettet data (2026-08-06)
- **Admin (ny plattform)**: https://flyttefordel-prototype.basbeta.no/admin
- **Gammel plattform (fallback, urørt)**: https://flyttefordel-prototype.vercel.app — behold kjørende
  til ny plattform har vært stabil over flere dager, se Rollback Strategy i CR-011
- Admin-brukere: `kvinnesland@gmail.com` og `calle.duvdal@bas.no` — passord satt på nytt i Coolify
  sine miljøvariabler (ikke gjenbrukt fra Vercel)

## Validation Status
✓ `npx tsc --noEmit` — ingen feil (2026-08-06, etter CR-012 kodeendringer)
✓ `npx vitest run` — 63/63 tester bestått (2026-08-06, CR-012 — 45 eksisterende + 18 nye for storage/upload)
✓ `npm run build` — bygger rent lokalt med Node 22, `/api/admin/upload` med i rute-listen (2026-08-06, CR-012)
⚠ CR-012: manuell smoke test mot ekte bucket (`basbeta-pub-object-storage`) — IKKE gjort ennå
✓ Coolify-deploy bekreftet LIVE (2026-08-06) — tok 2 fix-iterasjoner (se Recently Modified Systems):
  manglende `prisma generate` i build-script, manglende OpenSSL i Alpine-image
✓ Smoke test: kategori, annonsør og fordel opprettet i /admin, bekreftet synlig i forbrukerappen (2026-08-06)
✓ Uptime-monitoring bekreftet aktiv på Uptime Kuma (2026-08-06, CR-011)
⚠ Backup ("Backup Now") — IKKE gjort ennå, se CR-011 checklist. Feilsporing fjernet fra scope (se DECISIONS.md)
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
1. Deploy CR-012 sine kodeendringer til prod (git push → Coolify auto-deploy), deretter kjør
   manuell smoke test: last opp bilde for en fordel, en annonsørlogo og et hero-bilde i /admin,
   bekreft synlig i forbrukerappen, og bekreft at en for stor/ugyldig fil avvises med tydelig
   feilmelding. Kjør `/review` og marker CR-012 Done når dette er bekreftet.
2. Fullfør CR-011 sin siste gjenstående infra-oppgave: daglig backup + "Backup Now"-verifisering.
   Kjør `/review` på nytt og marker CR-011 Done.
3. Utvid smoke-testen for CR-011: test lagre/hent-kode-flyt og lead-innsending (kun kategori/
   annonsør/fordel er testet så langt), sjekk at admin-sider viser korrekte norske klokkeslett
4. ISSUE-009 (høy prioritet): vurder `next@14.2.3` sikkerhetsoppdatering som egen CR
5. Vurder Prisma 5→7-migrering som egen fremtidig CR — ville eliminert Alpine/OpenSSL-feilklassen
   permanent (se DECISIONS.md 2026-08-05), men er en breaking-change-oppgradering, ikke en hastesak
6. Etter CR-011/CR-012 er Done: planlegg neste CR — kandidater:
   a. Rate limiting på claim-endepunkt (krever Redis)
   b. Bruker-autentisering (ny leverandør — Supabase Auth ikke lenger et alternativ, se ARCHITECTURE-STATE.md)
   c. Notifikasjoner ved lav pool-beholdning (e-post / webhook)
   d. Per-sesjon LTV-estimat på /admin/profitability (AdminSessionLTV — type definert, query ikke implementert)
   e. Presigned direct-upload til S3 i stedet for server-side proxy, hvis bildevolum/frekvens øker
      (se CR-012 Performance Impact)
