# IMPLEMENTATION-LEDGER.md

> Append-only audit log. Never delete rows.

> Session-1 through Session-9 (CR-001–CR-010, all Done) archived to
> `sessions/IMPLEMENTATION-LEDGER-ARCHIVE.md` (2026-08-10) to keep this
> file cheap to read at every session start. Archive is not read
> automatically — consult only when historical detail is needed.

| Date | Session | Area | Changes | Related CR | Validation Status |
|---|---|---|---|---|---|
| 2026-08-05 | Session-10 | change-requests/ | Opprettet og godkjent CR-011: Migrering fra Vercel/Supabase til Hetzner/Coolify, basert på docs/MIGRATION-PLAYBOOK-HETZNER-COOLIFY.md | CR-011 | — |
| 2026-08-05 | Session-10 | miljø | Node.js 22 installert lokalt via `winget install OpenJS.NodeJS.22 --scope user` (ingen admin-rettigheter tilgjengelig) — gjenbruk av install fra effektbibliotek-økt, oppdaget under `%LOCALAPPDATA%\Microsoft\WinGet\Packages\` | — | node -v ✓ |
| 2026-08-05 | Session-10 | prisma/migrations/ | Regenerert baseline-migrasjon (20260805000000_init, erstatter utdatert 20260522100321_init som manglet CR-003/CR-009/CR-010-felter kun lagt til via db push) via `prisma migrate diff --from-empty` — ingen live DB nødvendig | CR-011 | verifisert mot schema.prisma ✓ |
| 2026-08-05 | Session-10 | Dockerfile, .dockerignore | Nye: single-stage node:22-alpine build | CR-011 | build (lokalt, uten docker) ✓ tsc ✓ |
| 2026-08-05 | Session-10 | src/lib/db/client.ts, client.test.ts | connect_timeout/socket_timeout på DATABASE_URL; build-safe når url mangler (fanget og fikset en selvintrodusert next build-krasj); 4 nye unit-tester | CR-011 | tsc ✓ vitest ✓ 45/45 |
| 2026-08-05 | Session-10 | src/app/api/**/*.ts (16 ruter) | Try/catch lagt til rundt Prisma-kall — 16 av 19 ruter manglet reell feilhåndtering (kun .catch() på request.json()) | CR-011 | tsc ✓ vitest ✓ |
| 2026-08-05 | Session-10 | 4 admin-sider | timeZone: 'Europe/Oslo' lagt til på 6 faktiske datoformateringssteder (2 av 8 opprinnelig flaggede var tallformatering) | CR-011 | tsc ✓ |
| 2026-08-05 | Session-10 | package.json | @supabase/supabase-js fjernet (ubrukt, verifisert via full build) | CR-011 | build ✓ |
| 2026-08-05 | Session-10 | specs/architecture.md, .env.example, sessions/ARCHITECTURE-STATE.md | Oppdatert for ny plattform | CR-011 | — |
| 2026-08-05 | Session-10 | git | Commit 6487619: feat(CR-011) — kodedel, 34 filer | CR-011 | push ✓ |
| 2026-08-05 | Session-10 | package.json | fix: build-script kjørte ikke `prisma generate` — Docker-buildet feilet i Coolify fordi npm ci sin postinstall kjørte før schema.prisma var kopiert inn | CR-011 | Coolify build ✓ etter fix |
| 2026-08-05 | Session-10 | git | Commit fd72641: fix(CR-011) — prisma generate i build-script | CR-011 | push ✓ |
| 2026-08-05 | Session-10 | Dockerfile | fix: `apk add --no-cache openssl` — container crash-loopet 10/10 restarts fordi Prisma sin native schema-engine ikke fant libssl i Alpine | CR-011 | Coolify deploy ✓ etter fix |
| 2026-08-05 | Session-10 | git | Commit d5ecd55: fix(CR-011) — OpenSSL i Alpine-image | CR-011 | push ✓ |
| 2026-08-06 | Session-10 | Prod-verifisering | Bruker opprettet kategori, annonsør og fordel via /admin på https://flyttefordel-prototype.basbeta.no — bekreftet synlig og fungerende i forbrukerappen | CR-011 | prod ✓ |
| 2026-08-06 | Session-11 | change-requests/ | Opprettet og godkjent CR-012: Bildeopplasting i admin-grensesnittet | CR-012 | — |
| 2026-08-06 | Session-11 | sessions/ | CR-011: uptime-monitoring bekreftet (Uptime Kuma), feilsporing fjernet fra scope (bruker-beslutning, se DECISIONS.md) | CR-011 | — |
| 2026-08-06 | Session-11 | infra | Bruker opprettet S3-bucket basbeta-pub-object-storage (Hetzner Object Storage, fsn1, Public read-only), separat fra basbeta-backup; nøkler satt som Coolify-miljøvariabler | CR-012 | — |
| 2026-08-06 | Session-11 | package.json | @aws-sdk/client-s3 lagt til | CR-012 | npm install ✓ |
| 2026-08-06 | Session-11 | src/lib/storage/ | Nytt: client.ts (lazy S3-klient, build-safe), validateImage.ts (magic-byte-validering, maks 5MB, jpg/png/webp), uploadImage.ts, index.ts | CR-012 | tsc ✓ vitest ✓ |
| 2026-08-06 | Session-11 | src/lib/storage/*.test.ts | 18 nye unit-tester (validateImage, client, uploadImage) | CR-012 | vitest ✓ 63/63 |
| 2026-08-06 | Session-11 | src/app/api/admin/upload/route.ts | Ny: POST-rute, admin-auth-guardet, multipart/form-data → S3, JSON-feilrespons. + route.test.ts (5 tester) | CR-012 | tsc ✓ vitest ✓ |
| 2026-08-06 | Session-11 | src/components/admin/ImageUploadField.tsx | Ny: delt opplastingskomponent brukt i alle tre admin-formene | CR-012 | tsc ✓ |
| 2026-08-06 | Session-11 | HeroForm.tsx | URL-tekstfelt for imageUrl/imageAlt byttet til ImageUploadField | CR-012 | tsc ✓ |
| 2026-08-06 | Session-11 | BenefitForm.tsx + admin/benefits route.ts/[id]/route.ts | Lagt til imageUrl/imageAlt-felt (manglet helt før denne CR-en) + Zod-schema-utvidelse | CR-012 | tsc ✓ |
| 2026-08-06 | Session-11 | AdvertiserForm.tsx + admin/advertisers route.ts/[id]/route.ts | Lagt til logoUrl-felt (manglet helt før denne CR-en) + Zod-schema-utvidelse | CR-012 | tsc ✓ |
| 2026-08-06 | Session-11 | specs/architecture.md, specs/entities.md, .env.example (via architecture.md-liste) | Oppdatert for ny S3-storage-modul, nye miljøvariabler, migreringsnotat | CR-012 | — |
| 2026-08-06 | Session-11 | Full validering | npx tsc --noEmit ✓, npx vitest run 63/63 ✓ (opp fra 45), npm run build ✓ | CR-012 | — |
| 2026-08-06 | Session-11 | git | Push 880c408 → Coolify auto-deploy | CR-012 | deploy ✓ |
| 2026-08-06 | Session-11 | ImageUploadField.tsx | 4 UX-fikser etter brukertest i nettleser: linjejustering, fjern-bilde-knapp, format-hint (5 commits: e14f365, 4c180b4, e0c1f35, effe0f3, bf9694a) — se CR-012 "Post-implementation UX-iterasjoner" | CR-012 | tsc ✓ hver commit |
| 2026-08-06 | Session-11 | Prod-verifisering | Bruker testet manuelt i nettleser: opplasting for fordel, annonsørlogo og hero-bilde, samt avvisning av for stor/ugyldig fil — alt bekreftet fungerende | CR-012 | prod ✓ |
| 2026-08-06 | Session-11 | /review | Full review-checklist kjørt — PASSED alle kategorier, RECOMMENDATION: Approve. CR-012 markert Done | CR-012 | — |
| 2026-08-06 | Session-11 | OPEN-ISSUES.md | Funn utenfor scope: admin-formene varsler ikke ved ulagrede endringer (gjennomgående, ikke CR-012-spesifikt) — logget som ISSUE-010 | — | — |
| 2026-08-06 | Session-11 | change-requests/ | Opprettet CR-013: Varsel om ulagrede endringer i admin-former (Status: Draft, adresserer ISSUE-010) | CR-013 | — |
| 2026-08-06 | Session-11 | change-requests/ | CR-013 utvidet med bruker-tillegg (alltid synlig dirty-indikator), godkjent av bruker | CR-013 | — |
| 2026-08-06 | Session-11 | specs/architecture.md | Module Map: ny `/lib/admin`-rad for useUnsavedChangesWarning | CR-013 | — |
| 2026-08-06 | Session-11 | src/lib/admin/useUnsavedChangesWarning.ts | Ny: beforeunload + best-effort intern lenke-avskjæring (capture-fase, respekterer defaultPrevented/modifier-taster/_blank). shouldInterceptClick eksportert som ren, testbar funksjon + 5 tester | CR-013 | tsc ✓ vitest ✓ |
| 2026-08-06 | Session-11 | src/components/admin/UnsavedChangesBadge.tsx + .module.css | Ny: fast posisjonert pille med pulserende rød prikk, prefers-reduced-motion respektert | CR-013 | tsc ✓ |
| 2026-08-06 | Session-11 | CategoryForm/AdvertiserForm/HeroForm/BenefitForm.tsx | payload flyttet fra inline i handleSubmit til useMemo; baseline-ref + isDirty; hook + badge koblet inn i alle fire | CR-013 | tsc ✓ |
| 2026-08-06 | Session-11 | Full validering | npx tsc --noEmit ✓, npx vitest run 68/68 ✓ (opp fra 63), npm run build ✓ | CR-013 | — |
| 2026-08-06 | Session-11 | src/components/admin/FormSaveBar.tsx | UnsavedChangesBadge fjernet, erstattet av FormSaveBar — slår sammen lagre-knapp + dirty-indikator + feilmelding i én flytende bar (bruker-tilbakemelding: gamle statiske knapper virket gammeldagse). Koblet inn i alle fire former, gammel formActions-div fjernet | CR-013 | tsc ✓ vitest 68/68 ✓ build ✓ |
| 2026-08-06 | Session-11 | FormSaveBar.tsx | Skjuler baren (inkl. lagre-knapp) helt når isDirty er false — bevisst avvik fra "alltid klikkbar"-resonnementet, bruker eksplisitt krav | CR-013 | tsc ✓ |
| 2026-08-06 | Session-11 | CategoryForm/AdvertiserForm/HeroForm/BenefitForm.tsx | handleSubmit sin suksess-gren endret: rediger-flyt navigerer ikke bort lenger (kun router.refresh() + setSaving(false)); opprett-flyt navigerer til rediger-siden for den nye posten (bruker id fra POST-responsen) i stedet for til listesiden | CR-013 | tsc ✓ vitest 68/68 ✓ build ✓ |
| 2026-08-06 | Session-11 | FormSaveBar.tsx + alle fire former | Ny grønn "Lagret"-pille (saved-prop) etter vellykket lagring på rediger-sider — justSaved-state per form, nullstilt via useEffect når isDirty blir true igjen. Statisk (ikke pulserende), ingen knapp | CR-013 | tsc ✓ vitest 68/68 ✓ build ✓ |
| 2026-08-06 | Session-11 | Prod-verifisering | Bruker testet manuelt i nettleser: dirty-varsel, navigasjonsvarsel ved intern lenke, ingen navigering bort ved lagring, navigering til rediger-side ved opprettelse, grønn "Lagret"-pille — alt bekreftet fungerende | CR-013 | prod ✓ |
| 2026-08-06 | Session-11 | /review | Full review-checklist kjørt for CR-013 — PASSED alle kategorier, RECOMMENDATION: Approve. CR-013 markert Done, ISSUE-010 markert Resolved | CR-013 | — |
| 2026-08-06 | Session-11 | change-requests/CR-011 | Backup fjernet fra scope (bruker-beslutning, prototype, se DECISIONS.md) — siste gjenstående akseptansekriterium | CR-011 | — |
| 2026-08-06 | Session-11 | change-requests/CR-011 | To manuelle testpunkter (claim-code/lead-flyt + CSV-eksport, tidssone-visning på 4 admin-sider) akseptert som kjent, dokumentert gap — ikke faktisk verifisert (bruker-beslutning, se DECISIONS.md) | CR-011 | — |
| 2026-08-06 | Session-11 | /review | Full review-checklist kjørt for CR-011 — PASSED alle kategorier med 2 dokumenterte WARNINGS (test-gap, feilsporing-fravalg), RECOMMENDATION: Approve. CR-011 markert Done — alle 13 CRs (CR-001–CR-013) nå fullført | CR-011 | — |
| 2026-08-06 | Session-11 | change-requests/ | Opprettet CR-014-utkast: rate limiting på POST /api/admin/auth/login og POST /api/benefits/[slug]/claim-code, Redis-basert (fixed-window via INCR+EXPIRE), fail-open ved Redis-feil. Adresserer ISSUE-008 punkt 3 (rate limiting på claim-code, utsatt siden CR-009) | CR-014 | — |
| 2026-08-06 | Session-11 | change-requests/CR-014 | Godkjent av bruker med bekreftede grenser (5/15min login, 20/time claim-code). Implementasjon eksplisitt stoppet av bruker før den startet — ingen kode skrevet | CR-014 | — |
| 2026-08-06 | Session-11 | sessions/OPEN-ISSUES.md | Logget ISSUE-011: CR-011 sitt aksepterte test-gap (claim-code/lead-flyt, tidssone-visning) formalisert som åpen, lav prioritet | — | — |
| 2026-08-06 | Session-11 | end-session | Økt avsluttet — 13 CRs Done (CR-001–CR-013), CR-014 Approved men ikke implementert. Se CURRENT-STATE.md for full status | — | — |
| 2026-08-07 | Session-12 | package.json | `ioredis` lagt til (npm install, 6 pakker) — UNCOMMITTED | CR-014 | npm install ✓ |
| 2026-08-07 | Session-12 | src/lib/rateLimit/ | Nytt: client.ts (lazy ioredis-klient, build-safe, maxRetriesPerRequest:1+connectTimeout:2000 for rask fail-open), rateLimiter.ts (checkRateLimit — fixed-window INCR+EXPIRE, fail-open ved Redis-feil), getClientIp.ts (x-forwarded-for→x-real-ip→'unknown'), index.ts. UNCOMMITTED | CR-014 | tsc ✓ vitest ✓ |
| 2026-08-07 | Session-12 | src/lib/rateLimit/*.test.ts | 13 nye unit-tester: client (config-resolution, build-safe throw), rateLimiter (under/på/over grense, TTL-beregning, -1/-2-fallback, fail-open ved Redis-feil), getClientIp (fallback-kjede, whitespace-trim). UNCOMMITTED | CR-014 | vitest ✓ |
| 2026-08-07 | Session-12 | src/app/api/admin/auth/login/route.ts | Rate-limit-sjekk (login:{ip}, 5/900s) lagt til FØR validateAdminCredentials — 429+Retry-After ved overskridelse, 401/200 uendret innenfor grensen. + route.test.ts (4 tester). UNCOMMITTED | CR-014 | tsc ✓ vitest ✓ |
| 2026-08-07 | Session-12 | src/app/api/benefits/[slug]/claim-code/route.ts | Rate-limit-sjekk (claim-code:{ip}, 20/3600s) lagt til etter sesjonssjekk — 429+Retry-After ved overskridelse, 401/404/410/200 uendret innenfor grensen. + route.test.ts (6 tester). UNCOMMITTED | CR-014 | tsc ✓ vitest ✓ |
| 2026-08-07 | Session-12 | .env.example, specs/architecture.md | REDIS_URL dokumentert, ny `/lib/rateLimit`-modul-rad i Module Map, ioredis i External Dependencies, migreringsnotat for CR-014. UNCOMMITTED | CR-014 | — |
| 2026-08-07 | Session-12 | Full validering | npx tsc --noEmit ✓, npx vitest run 91/91 ✓ (opp fra 68), npm run build ✓ (bekrefter build-safe uten REDIS_URL) | CR-014 | — |
| 2026-08-07 | Session-12 | /review | Full review-checklist kjørt for CR-014 sin Redis-implementasjon — PASSED alle kode-nivå-kategorier, WARNINGS: ingen commit ennå, infra-avhengige akseptansekriterier uverifiserbare denne økten. RECOMMENDATION: Approve (kode), men IKKE marker Done — CR-014 forblir åpen i påvente av infra + verifisering | CR-014 | — |
| 2026-08-07 | Session-12 | Arkitektursamtale | Bruker spurte midt i økten om Traefik (Coolify sin reverse proxy) sin innebygde rate-limit-middleware kunne erstatte Redis-løsningen. Tradeoffs diskutert (ingen ny infra/avhengighet vs. konfigurasjon utenfor git, in-memory-per-instans vs. Redis, custom feilmelding-kompleksitet). Ingen beslutning tatt — bruker ba eksplisitt om å ikke committe før dette er avklart. Logget som ISSUE-012 | CR-014 | — |
| 2026-08-07 | Session-12 | end-session | Økt avsluttet — CR-014 sin Redis-implementasjon er ferdig kodet, testet (91/91) og bygget, men UNCOMMITTED og IKKE Done, i påvente av Redis-vs-Traefik-avklaring (ISSUE-012). Se CURRENT-STATE.md for full status | — | — |
| 2026-08-07 | Session-13 | Arkitektursamtale | Bruker valgte å beholde Redis-implementasjonen for CR-014 fremfor Traefik-middleware — traceability og full kontroll på feilmelding/Retry-After veide tyngre enn å unngå ny infrastruktur. ISSUE-012 markert Resolved, beslutning dokumentert i DECISIONS.md | CR-014 | — |
| 2026-08-07 | Session-13 | git | Commit 10d9fd1: feat(CR-014) — rate limiting på admin-login og claim-code (Redis), 15 filer. tsc/91 tester re-verifisert rett før commit | CR-014 | tsc ✓ vitest 91/91 ✓ |
| 2026-08-07 | Session-13 | change-requests/CR-014 | Status oppdatert til "committed, venter på infra". Required Tests-punkter for unit-testene krysset av | CR-014 | — |
| 2026-08-10 | Session-14 | change-requests/ | Opprettet og godkjent CR-015: Sikkerhetsoppdatering — next.js og transitive avhengigheter (adresserer ISSUE-009) | CR-015 | — |
| 2026-08-10 | Session-14 | package.json | `next` oppgradert 14.2.3 → 14.2.35 (eksakt pinnet, patch, ikke semver-major) | CR-015 | npm install ✓ |
| 2026-08-10 | Session-14 | package.json, package-lock.json | `npm audit fix` (uten `--force`, kjørt 2x) — løste 6 av 10 opprinnelige dev-transitive sårbarheter (`brace-expansion`, `esbuild`, `js-yaml`, `nanoid`, `vite` + transitive: `picomatch`, `tinyglobby`, `rolldown`, `lightningcss`) | CR-015 | UNCOMMITTED |
| 2026-08-10 | Session-14 | Funn under implementering | `npm audit --omit=dev` viser 2 gjenstående high (`next`, `postcss`) etter oppgradering — krever `next@16.3.0` (major, utenfor scope). Opprinnelig CR-015 AC "0 high i prod" korrigert til å reflektere dette; 0 kritisk oppnådd. ISSUE-009 oppdatert til "delvis løst" | CR-015 | — |
| 2026-08-10 | Session-14 | specs/architecture.md | `next`-versjonsrad oppdatert til 14.2.35 + restrisiko-notat om gjenstående major-oppgradering | CR-015 | — |
| 2026-08-10 | Session-14 | Full validering | `npx tsc --noEmit` ✓, `npx vitest run` 91/91 ✓ (uendret), `npm run build` ✓ (Next.js 14.2.35 bekreftet i output) | CR-015 | tsc ✓ vitest ✓ build ✓ |
| 2026-08-10 | Session-14 | /review | Full review-checklist kjørt for CR-015 — PASSED alle kode-nivå-kategorier, WARNINGS: korrigert AC (2 high i prod gjenstår, kun løsbart via major-bump), ikke committed/deployet ennå ved review-tidspunkt. RECOMMENDATION: Approve (kode) | CR-015 | — |
| 2026-08-10 | Session-14 | git | Commit e3616e7: fix(CR-015) — next 14.2.3→14.2.35 + npm audit fix, 7 filer | CR-015 | push: ikke gjort |
| 2026-08-10 | Session-14 | git | Push origin/master (98373b5→e3616e7) → Coolify auto-deploy trigget | CR-015 | push ✓ |
| 2026-08-10 | Session-14 | Prod-verifisering | Bruker bekreftet Coolify-deploy fullført uten feil, og at admin-innlogging + anonym sesjon (begge Middleware-avhengige) fungerer som normalt i prod på next@14.2.35 | CR-015 | prod ✓ |
| 2026-08-10 | Session-14 | change-requests/CR-015 | Markert Done — alle akseptansekriterier oppfylt (korrigerte, se Implementation Notes: 0 kritisk oppnådd, 2 high i prod akseptert som restrisiko til fremtidig major-CR) | CR-015 | — |
