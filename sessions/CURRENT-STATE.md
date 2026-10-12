# CURRENT-STATE.md

> Updated at the end of every session. Read by Claude at startup.

## Current Phase
**CR-022 (treet Page, Fordel, Product, backend for web-løpet) er DONE (0d31820, deployet, prod-sjekk OK av bruker 2026-10-12, /review PASSED).** Nye tabeller flow_pages og products, BenefitView.pageId/sortOrder, format web_card, getWebFlow(session) (ingen HTTP-endepunkt) og valgfri seed (npm run db:seed-flow, ikke kjørt). Treet er tomt i prod til seed kjøres. Neste: CR-023 (tynn webside, Draft), deretter bestilling.

**CR-021 (visninger av fordeler, grunnmur) er DONE (010aeca, deployet, prod-sjekk OK av bruker 2026-10-12, /review PASSED).** BenefitView, format-register og resolveBenefitView i src/lib/views. Kjent hull: lagret-siden viser fortsatt kjerneinnhold (tas i admin-UI-CR-en).

**CR-020 (utvidet hendelsesstrøm, første steg mot målbildet i docs/10) er DONE (127f972, deployet 2026-10-12). Opprinnelig status:
implementert 2026-10-12 (Session-19) men UNCOMMITTED, uten /review og IKKE
Done.** `BenefitEvent` har nye felter `channel`/`viewId`/`testId`/`variant`,
typede hendelsestyper i `src/lib/tracking/eventTypes.ts`, `/api/track` validerer
(ukjent type/kanal gir 400), og hendelser knyttes til sesjon. Additiv
migrasjon `20261012000000_cr020_event_dimensions` er IKKE kjørt mot noen
database (ingen lokal DATABASE_URL). tsc OK, lint 0 feil, vitest 162/162,
build OK. Se CR-020 Implementation Notes.

18 av 23 CRs er Done (CR-001–CR-013, CR-015, CR-017, CR-020, CR-021, CR-022). CR-023 er Draft (tynn webside). CR-016 og CR-018 er
implementert/deployet og venter kun på brukerens verifisering i prod (ikke
kodearbeid). **CR-019 er committed (12b49e6) men IKKE Done** — ny delt hook
`src/lib/admin/useDirtyTracking.ts` erstatter baselineRef/justSaved-mønsteret
i alle 4 admin-skjemaer; lint 0 feil, tsc OK, vitest 138/138, build OK. Venter
på brukerens manuelle nettleserverifisering av dirty-/«Lagret»-indikator i
alle fire skjemaer, deretter Done. (Teksten sa tidligere «UNCOMMITTED»;
rettet i Session-19, git viser commit 12b49e6.)
Liten kjent atferdsforskjell: «Lagret»-badgen vises igjen hvis feltet
redigeres tilbake til nøyaktig lagret verdi (se CR-019 Implementation Notes).
CR-014 (rate limiting) er
**implementert (Redis-basert), fullt validert og committed (10d9fd1)**.
Arkitekturspørsmålet fra forrige økt (Redis vs. Traefik, ISSUE-012) er
avklart — bruker valgte å beholde Redis (se DECISIONS.md 2026-08-07).
CR-014 er IKKE markert Done ennå — gjenstår Infra-checklist (Redis
provisjonert i Coolify, REDIS_URL satt, x-forwarded-for verifisert,
prod-smoke-test av 429-responser).

CR-016 (beregnet statusindikator for fordeler — aktiv/planlagt/kladd/feilet)
er **implementert, fullt unit-testet (118/118), committed (e906eb8, 390e844)
og pushet (Coolify auto-deploy trigget)**. Ny `src/lib/benefits/displayStatus.ts`
grupperer BenefitStatus i 4 fargebøtter og oppdager reelle konfigurasjons-
problemer (manglende redemption-innhold, tom kodepool, inkonsistente datoer)
— "Feilet" er en beregnet UI-tilstand, ingen ny databasestatus. `/review`
kjørt — PASSED (kode), men CR-016 er IKKE markert Done ennå: ingen lokal
`DATABASE_URL` finnes så funksjonen kunne ikke testes visuelt i nettleser
denne økten. Venter kun på brukerens visuelle bekreftelse av de 4 fargene
i prod.

CR-017 (skrive-sperre mot ugyldig Aktiv/Planlagt status) er **FULLFØRT og
markert Done 2026-08-27**. Fullt testet (133/133 inkl. 15 nye), committed
(3ec4625) og pushet (4a30c11) — Coolify auto-deploy trigget. Ingen manuell
verifisering kreves per CR-en (kun unit/integration).
Gjenbruker CR-016 sin problem-deteksjon (nå eksportert som
`getBenefitConfigProblems`) som skrive-tidsvalidering på alle tre steder en
fordel kan bli `active`/`scheduled` (opprett, rediger, hurtig-statusknapper) —
dekker både direkte forsøk og "utilsiktet ødelagt av en senere redigering".
Denne CR-en har ingen manuell nettleser-test i sitt Required Tests-krav (kun
unit/integration), så den regnes som funksjonelt ferdig når testene er
grønne — se CR-017 Implementation Notes.

CR-018 (Next.js major-oppgradering 14.2.35→16.3.1, løser ISSUE-009 helt) er
**implementert, committed OG pushet (e7cc47c) — Coolify auto-deploy trigget**.
`npm audit` viser 0 vulnerabilities (ned fra 8 high). Gjort med multi-agent
orkestrering i en isolert worktree i en tidligere økt; commit+push skjedde
UTEN at `/end-session` ble kjørt, så dette var udokumentert inntil nå (se
Prosessnotat 2026-08-27 under). Reell kodeendring (async
`params`/`searchParams`/`cookies()`/`headers()`-migrering i 21 filer), ikke
bare en versjonsbump — se CR-018 for full detalj, inkl. et code-review-funn
(10 side-komponenter opprinnelig oversett i migreringen, fikset i samme
økt). **Prod-smoke-test (admin-innlogging, anonym sesjon, minst én dynamisk
route i admin og forbruker-app) er IKKE bekreftet av bruker ennå** — appen
er allerede deployet med denne endringen.

CR-019 (fiks 8 React Hooks-lint-feil avdekket av CR-018 sin strengere
`eslint-config-next`) er **Approved, IKKE implementert**. `npm run lint`
viser nå nøyaktig de 8 feilene (2 hver i 4 admin-skjemakomponenter:
`AdvertiserForm`/`BenefitForm`/`CategoryForm`/`HeroForm`) + 3 forhåndseksisterende,
urelaterte advarsler CR-en beskriver.

Prosessnotat (2026-08-27, Session-17): Denne økten startet med å oppdage at
`sessions/CURRENT-STATE.md` var betydelig utdatert — CR-017 lå ferdig
implementert og testet i arbeidskatalogen (delvis staged) uten at
CR-017.md/session-filene noen gang ble oppdatert, og CR-018 var allerede
committed OG pushet til `origin/master` uten at noen session-fil nevnte det.
En tidligere økt ble tydelig avbrutt før `/end-session` ble kjørt. Alt
uverifisert arbeid ble kryssjekket linje for linje mot sine respektive
CR-er (kode lest, `tsc`/`vitest`/`build` re-kjørt selv) før noe ble stolt
på. CR-017 sitt arbeid ble committed separat (3ec4625) fra denne
sesjonsopprydningen. Se DECISIONS.md 2026-08-27.

CR-015 (next.js-sikkerhetsoppdatering, adresserer ISSUE-009) FULLFØRT og
markert Done 2026-08-10. `next` oppgradert 14.2.3→14.2.35 (patch, ikke
major) — fjerner den kritiske CVE-sekken (0 kritisk, ned fra 1). `npm
audit fix` løste 6 av 10 gjenstående dev-transitive høy-sårbarheter.
2 high i produksjon (`next`, `postcss`) og 4 dev-only (eslint-config-next-
familien) krever en fremtidig next@16/eslint-config-next@16-major-
oppgradering — bevisst utenfor scope, dokumentert restrisiko (se
DECISIONS.md 2026-08-10, ISSUE-009 status "delvis løst"). Committed
(e3616e7), pushet, deployet via Coolify, admin-login og anonym sesjon
verifisert uendret i prod av bruker. `/review` kjørt — PASSED, Approve.

CR-011 (Hetzner/Coolify-migrering) FULLFØRT og markert Done 2026-08-06.
App er LIVE på https://flyttefordel-prototype.basbeta.no og verifisert
med reell data (kategori, annonsør, fordel opprettet og vist korrekt i
forbrukerappen). To reelle deploy-blokkerende bugs ble funnet og fikset
under selve utrullingen (se Recently Modified Systems). Uptime-monitoring
bekreftet aktiv på Uptime Kuma. Feilsporing og backup begge bevisst
fjernet fra scope (bruker-beslutninger 2026-08-06, prototype — se
DECISIONS.md). To manuelle testpunkter (full claim-code/lead-flyt +
CSV-eksport, tidssone-visning på 4 admin-sider) er akseptert som kjent,
udekket gap — ikke faktisk verifisert i prod. `/review` kjørt — PASSED,
Approve.

CR-012 (bildeopplasting) FULLFØRT og markert Done 2026-08-06. Bucket
`basbeta-pub-object-storage` på Hetzner Object Storage, admin kan laste
opp bilder for fordel/annonsør/hero, verifisert manuelt i prod av bruker
inkl. avvisning av ugyldige filer. 4 UX-fikser landet etter brukertesting
(se Recently Modified Systems). `/review` kjørt — PASSED, Approve.
Et funn utenfor CR-012 sitt scope ble logget som ISSUE-010: admin-formene
varsler generelt ikke ved ulagrede endringer — adressert i CR-013.

CR-013 (varsel om ulagrede endringer) FULLFØRT og markert Done 2026-08-06.
Ny FormSaveBar-komponent (nedre høyre hjørne) i alle fire admin-former —
viser rød pulserende "Ulagrede endringer" + lagre-knapp når formet er
dirty, grønn statisk "Lagret"-pille etter vellykket lagring. Rediger-
sider navigerer ikke bort ved lagring lenger; opprett-sider navigerer
til rediger-siden for den nye posten. Iterert 4 ganger etter brukertest
samme dag (se Recently Modified Systems). `/review` kjørt — PASSED, Approve.

Prosessendring (bruker-forespørsel, 2026-08-10, ikke en CR — ren
governance/tooling-endring, ingen app-kode): sesjons-workflowen i
CLAUDE.md ble for kostbar å kjøre (mye å lese ved hver sesjonsstart, full
CR-mal brukt selv for en ren versjonsbump). Løsning: arkiverte gammel,
lukket historikk (Session-1–9/CR-001–010 fra IMPLEMENTATION-LEDGER.md,
ISSUE-001–008 fra OPEN-ISSUES.md) til nye `*-ARCHIVE.md`-søsterfiler som
ikke leses automatisk, la til en Micro-CR-mal for trivielle/mekaniske
endringer, og presiserte i CLAUDE.md at "aktive CR-er" betyr status ≠
Done. Committed og pushet (1666936). Se DECISIONS.md 2026-08-10.

## Current Objectives
CR-014 sin Redis-baserte implementasjon er committed (10d9fd1). Neste
skritt er brukerens Infra-checklist i Coolify (se Next Recommended
Actions) — Claude har ikke tilgang til å utføre disse selv:
1. Provisjonér Redis-ressurs i Coolify
2. Sett `REDIS_URL` som miljøvariabel på app-ressursen
3. Bekreft at Coolify/Traefik faktisk videresender ekte klient-IP via
   `x-forwarded-for`
4. Smoke-test: trigger faktisk 429 på begge endepunkter i prod

Når disse er utført og verifisert, kan CR-014 markeres Done.

CR-016 er committed og pushet (390e844) — Coolify auto-deploy trigget. Neste skritt:
1. Bruker verifiserer visuelt i nettleser: grønn (aktiv), gul (planlagt),
   grå (kladd/pauset/arkivert), rød (feilet — med forklaring) på både
   `/admin/benefits` og `/admin/benefits/[id]`
2. Når verifisert: marker CR-016 Done

CR-017 er Done (committed 3ec4625, pushet 4a30c11 2026-08-27).

CR-018 er committed og pushet (e7cc47c) — allerede LIVE i prod via Coolify
auto-deploy. Neste skritt: bruker smoke-tester admin-innlogging, anonym
sesjon og minst én dynamisk route i både admin og forbruker-app → marker
CR-018 Done.

## Current Branch
master (010aeca CR-021 pushet; CR-022 uncommitted i arbeidskatalogen: schema + migrasjon, views/benefits/queries, seed, tester, specs, CR-022.md, sessions/*). tsconfig.json og docs er urørt.

## Blockers
Ingen kodeblokker. To brukeroppgaver gjenstår før respektive CR-er kan
markeres Done: CR-014 sin Infra-checklist i Coolify, og CR-018 sin
prod-smoke-test (allerede deployet). CR-016 venter på visuell bekreftelse
fra bruker (se Next Recommended Actions).

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
- CR-011: Migrering til Hetzner/Coolify (Status: Done — LIVE og verifisert i prod 2026-08-06, /review PASSED)
- CR-012: Bildeopplasting i admin-grensesnittet (Status: Done — verifisert i prod 2026-08-06)
- CR-013: Varsel om ulagrede endringer i admin-former (Status: Done — verifisert i prod 2026-08-06, /review PASSED)
- CR-014: Rate limiting på innlogging og kode-tildeling (Status: Implementert (Redis), committed 10d9fd1, IKKE Done — venter på Infra-checklist i Coolify)
- CR-015: Sikkerhetsoppdatering — next.js og transitive avhengigheter (Status: Done — committed e3616e7, deployet og verifisert i prod 2026-08-10)
- CR-016: Beregnet statusindikator for fordeler (Status: Implementert, committed+pushet, IKKE Done — venter på brukerens visuelle verifisering i prod)
- CR-017: Sperre mot ugyldig Aktiv/Planlagt status (Status: Done — committed 3ec4625, pushet 4a30c11, 2026-08-27)
- CR-018: Next.js major-oppgradering 14.2.35→16.3.1 (Status: Implementert, committed+pushet e7cc47c, LIVE i prod, IKKE Done — venter på prod-smoke-test)
- CR-019: Fiks React Hooks-lint-feil i 4 admin-skjemaer (Status: Implementert, committed 12b49e6, IKKE Done — venter på manuell nettleserverifisering)
- CR-023: Web-løpet, tynn side (Status: Draft, åpne punkt besvart av bruker 2026-10-12, venter på godkjenning)
- CR-022: Treet Page, Fordel, Product (Status: Done, committed 0d31820, deployet og prod-sjekk OK 2026-10-12, /review PASSED)
- CR-021: Visninger av fordeler, grunnmur (Status: Done, committed 010aeca, deployet og prod-sjekk OK 2026-10-12, /review PASSED)
- CR-020: Utvidet hendelsesstrøm (Status: Done — committed 127f972, pushet og deployet 2026-10-12, /review PASSED. Rad-sjekk av channel i benefit_events ikke eksplisitt bekreftet)

- `prisma/schema.prisma` + `prisma/migrations/20261012000000_cr020_event_dimensions/` (BenefitEvent: channel default 'app', viewId, testId, variant), NY `src/lib/tracking/eventTypes.ts` (+ test), `trackEvent.ts` (options som 4. argument, strengt typet eventType, + test), `src/lib/session/index.ts` (`getSessionIdFromRequest`), `src/app/api/track/route.ts` (validering, 400 ved ukjent type/kanal, + test), `save`/`claim-code`/`lead` routes + `benefits/[slug]/page.tsx` (sessionId på hendelser, 3 route-tester), `specs/entities.md`, `specs/architecture.md`, `specs/api.yaml` (2026-10-12, CR-020, UNCOMMITTED)

- `src/lib/admin/useDirtyTracking.ts` (NY: `useDirtyTracking(payload)` → `{isDirty, showSaved, markSaved}`, wrapper `useUnsavedChangesWarning`, ren `deriveDirtyState`) + `useDirtyTracking.test.ts` (5 tester), `AdvertiserForm`/`BenefitForm`/`CategoryForm`/`HeroForm` migrert (baselineRef + justSaved/useEffect fjernet), `specs/architecture.md` /lib/admin-rad (2026-10-12, CR-019, UNCOMMITTED)

- `src/lib/benefits/displayStatus.ts` (`findProblems` eksportert som `getBenefitConfigProblems`), `src/app/api/admin/benefits/route.ts` + `[id]/route.ts` + `[id]/status/route.ts` (skrive-tidsvalidering: 400 ved manglende redemption-innhold på `active`/`scheduled`), `BenefitStatusActions.tsx` (Aktiver-knapp deaktiveres når aktivering ville feile), ny `vitest.config.mts` (root, `@/*`-alias for vitest), 3 nye route.test.ts (15 tester) (2026-08-11/2026-08-27, CR-017, commit 3ec4625 — kode skrevet 2026-08-11 i en økt som ble avbrutt før commit/dokumentasjon, verifisert på nytt og committed 2026-08-27)
- `package.json`/`package-lock.json` — `next`/`eslint-config-next` 14.2.35→16.3.1 (major), `eslint` `^8`→`^9` (peer-dep), `eslint.config.mjs` ny (erstatter `.eslintrc.json`, `next lint` fjernet i Next 16), async-migrering av `params`/`searchParams`/`cookies()`/`headers()` i 21 filer (11 API-ruter, 10 sider inkl. `generateMetadata`), `src/lib/session/index.ts` + `src/lib/admin/auth.ts` (await på `cookies()`/`headers()`) (2026-08-18, CR-018, commit e7cc47c). `npm audit`: 0 vulnerabilities (ned fra 8 high) — løser ISSUE-009 helt
- `package.json`/`package-lock.json` — `next` oppgradert 14.2.3→14.2.35 (eksakt pinnet, patch, ikke major), `npm audit fix` (uten `--force`) for 6 dev-transitive pakker (`brace-expansion`, `esbuild`, `js-yaml`, `nanoid`, `vite` + transitive), `next-env.d.ts` auto-oppdatert av `next build`, `specs/architecture.md` versjonsnotat (2026-08-10, CR-015, commit e3616e7). Fjerner den kritiske next-CVE-en; 2 high (`next`/`postcss`) og 4 dev-only (`eslint-config-next`-familien) gjenstår, krever fremtidig major-oppgradering — se ISSUE-009, DECISIONS.md
- `src/lib/rateLimit/` (NY: client.ts lazy ioredis-klient, rateLimiter.ts checkRateLimit fixed-window via INCR+EXPIRE fail-open, getClientIp.ts x-forwarded-for→x-real-ip→'unknown', index.ts + 13 unit-tester), `src/app/api/admin/auth/login/route.ts` (rate-limit-sjekk 5/15min per IP, 429+Retry-After, FØR validateAdminCredentials) + route.test.ts, `src/app/api/benefits/[slug]/claim-code/route.ts` (rate-limit-sjekk 20/time per IP, 429+Retry-After, etter sesjonssjekk) + route.test.ts, `package.json`/`package-lock.json` (ioredis lagt til), `.env.example` + `specs/architecture.md` (REDIS_URL, ny /lib/rateLimit-modul-rad) (2026-08-07, CR-014, commit 10d9fd1). Fullt validert (tsc/91 tester/build), `/review` PASSED kode-nivå. Redis vs. Traefik-arkitekturvalg (ISSUE-012) avklart 2026-08-07 — bruker valgte Redis, se DECISIONS.md
- `src/lib/admin/useUnsavedChangesWarning.ts` — NY: beforeunload + best-effort intern lenke-avskjæring (capture-fase), shouldInterceptClick eksportert som ren, testbar funksjon + 5 tester (2026-08-06, CR-013)
- `src/components/admin/FormSaveBar.tsx` — NY: flytende bar (nedre høyre hjørne) som slår sammen lagre-knapp + rød pulserende dirty-indikator + grønn statisk "Lagret"-pille + feilmelding. Erstatter både den gamle statiske `formActions`-knappen og en tidligere, nå fjernet `UnsavedChangesBadge`. Iterert 4 ganger samme dag etter brukertest (2026-08-06, CR-013, commits 99817da/c797ab9/ba5aaac/4b79784/f84e879)
- `CategoryForm.tsx`, `AdvertiserForm.tsx`, `HeroForm.tsx`, `BenefitForm.tsx` — payload flyttet fra inline i handleSubmit til useMemo (for isDirty-sammenligning), rediger-lagring navigerer ikke bort lenger, opprett-lagring navigerer til rediger-siden for den nye posten i stedet for til listen (2026-08-06, CR-013)
- `specs/architecture.md` — Module Map: ny `/lib/admin`-rad for useUnsavedChangesWarning (2026-08-06, CR-013)
- `src/components/admin/ImageUploadField.tsx` — 4 UX-fikser etter brukertest: linjejustering, skjult native filinput → egen-stilt knapp, "Fjern bilde", lightbox-popup for full størrelse, "Velg fil" skjules når bilde er satt (2026-08-06, CR-012, commits e14f365/4c180b4/e0c1f35/effe0f3/bf9694a)
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
✓ CR-022: tsc OK, lint 0 feil (3 gamle advarsler), vitest 203/203 (opp fra 187, 16 nye), build OK (2026-10-12). Migrasjon-SQL fra prisma migrate diff og seed IKKE kjørt mot DB. /review ikke kjørt
✓ CR-021: tsc OK, lint 0 feil (3 gamle advarsler), vitest 187/187 (opp fra 162, 25 nye), build OK (2026-10-12). Migrasjon-SQL fra prisma migrate diff, IKKE kjørt mot DB. /review ikke kjørt
✓ CR-020: `npx tsc --noEmit` OK, `npm run lint` 0 feil (3 gamle advarsler), `npx vitest run` 162/162 (opp fra 138, 24 nye), `npm run build` OK (2026-10-12). Migrasjon-SQL sammenlignet med `prisma migrate diff`, IKKE kjørt mot DB. /review ikke kjørt
✓ CR-019: `npm run lint` 0 feil (3 urelaterte advarsler: 2× `<img>`, 1× ubrukt eslint-disable), `npx tsc --noEmit` OK, `npx vitest run` 138/138 (opp fra 133, 5 nye), `npm run build` OK (2026-10-12). Manuell nettleserverifisering IKKE gjort
✓ CR-018: `npm audit` viser 0 vulnerabilities (ned fra 8 high) — løser ISSUE-009 helt (2026-08-18)
✓ CR-018: `npx tsc --noEmit`, `npx vitest run` (118/118), `npm run build` (44 routes) —
  alle grønne, inkl. adversarial sikkerhetsgjennomgang av auth-koden (2026-08-18)
✓ CR-018: `/code-review` avdekket 10 sideskomponenter opprinnelig oversett i
  async-migreringen (stille runtime-bug, ikke en kompileringsfeil) — fikset samme
  økt, "completeness scan"-agent bekreftet 0 gjenværende synkron params-bruk (2026-08-18)
✓ CR-018: committed OG pushet (e7cc47c) — oppdaget denne økten (2026-08-27), IKKE
  tidligere dokumentert i denne filen. Prod-smoke-test gjenstår
✓ CR-017: `npx tsc --noEmit`, `npx vitest run` (133/133, opp fra 118 — 15 nye), `npm run build` —
  alle re-verifisert (2026-08-27) rett før commit, koden lå ferdig fra en avbrutt økt
  (2026-08-11) uten at session-filene noen gang ble oppdatert for CR-017
✓ CR-015: `npx tsc --noEmit`, `npx vitest run` (91/91, uendret), `npm run build`
  (Next.js 14.2.35 bekreftet i output) — alle grønne (2026-08-10)
✓ CR-015: `npm audit --omit=dev` viser 0 kritisk (ned fra 1), 2 high (`next`,
  `postcss`) akseptert som restrisiko — se ISSUE-009, DECISIONS.md (2026-08-10)
✓ CR-015: Coolify-deploy bekreftet, admin-innlogging og anonym sesjon
  (Middleware-avhengige) verifisert uendret i prod av bruker (2026-08-10)
✓ CR-015: `/review` PASSED, CR-015 Done (2026-08-10)
✓ `npx tsc --noEmit` — ingen feil (2026-08-07, CR-014 rate-limit-kode, UNCOMMITTED)
✓ `npx vitest run` — 91/91 tester bestått (2026-08-07, CR-014 — 68 eksisterende + 23 nye:
  rateLimiter (fail-open, TTL-edge-cases), getClientIp (header-fallback-kjede), client
  (build-safe uten REDIS_URL), login-rute 429/401/200-regresjon, claim-code-rute
  429/404/410/200-regresjon)
✓ `npm run build` — bygger rent lokalt med Node 22, bekrefter lazy Redis-klient ikke
  krasjer build uten REDIS_URL satt (2026-08-07, CR-014)
✓ `npx tsc --noEmit` og `npx vitest run` (91/91) re-kjørt rett før commit som sanity-sjekk
  (2026-08-07, CR-014, commit 10d9fd1)
✓ `npx tsc --noEmit` — ingen feil (2026-08-06, etter CR-013 kodeendringer)
✓ `npx vitest run` — 68/68 tester bestått (2026-08-06, CR-013 — 63 eksisterende + 5 nye for shouldInterceptClick)
✓ `npm run build` — bygger rent lokalt med Node 22 (2026-08-06, CR-013)
✓ CR-013: manuell test i nettleser bekreftet av bruker (dirty-varsel, navigasjonsvarsel, ingen
  navigering bort ved lagring, navigering til rediger-side ved opprettelse, grønn "Lagret"-pille),
  `/review` PASSED, CR-013 Done. IKKE eksplisitt verifisert: native beforeunload-dialog ved
  refresh/fane-lukking, prefers-reduced-motion (lav risiko, standard nettleser-API/CSS)
✓ CR-012: manuell smoke test mot ekte bucket (`basbeta-pub-object-storage`) — bekreftet av bruker
  (fordel/annonsør/hero-opplasting + avvisning av ugyldig fil), `/review` PASSED, CR-012 Done
✓ Coolify-deploy bekreftet LIVE (2026-08-06) — tok 2 fix-iterasjoner (se Recently Modified Systems):
  manglende `prisma generate` i build-script, manglende OpenSSL i Alpine-image
✓ Smoke test: kategori, annonsør og fordel opprettet i /admin, bekreftet synlig i forbrukerappen (2026-08-06)
✓ Uptime-monitoring bekreftet aktiv på Uptime Kuma (2026-08-06, CR-011)
✓ CR-011 Done (2026-08-06) — backup og feilsporing bevisst fjernet fra scope (prototype,
  se DECISIONS.md). To manuelle testpunkter (claim-code/lead-flyt, tidssone-visning)
  akseptert som kjent gap, ikke faktisk verifisert
✓ ISSUE-007 resolved — «gratis kaffe» startsAt/endsAt satt til null (2026-05-22)
✓ ISSUE-008 resolved — DB unique constraint + deaktiver-kode + detaljside (2026-05-22, CR-009)
✓ ISSUE-010 resolved — CR-013 løste generelt "ulagrede endringer"-varsel i admin (2026-08-06)
✓ ISSUE-009 resolved — CR-018 fjernet de siste 8 high-sårbarhetene, npm audit 0 vulnerabilities (2026-08-18, dokumentert 2026-08-27)

## Notes
- Historisk detalj for Session-1–9/CR-001–010 og ISSUE-001–008 ligger i
  `sessions/IMPLEMENTATION-LEDGER-ARCHIVE.md` og `sessions/OPEN-ISSUES-ARCHIVE.md`
  (2026-08-10) — ikke lest automatisk ved sesjonsstart, kun ved behov for
  historisk kontekst.
- 2026-08-27: samme arkiv utvidet med CR-012/CR-013/CR-015-rader og
  2026-08-10-governance-radene (47 rader totalt, IMPLEMENTATION-LEDGER.md
  hadde vokst til 106 rader siden forrige arkivering).
- `<img>` brukes i stedet for `next/image` — lint warning, akseptabelt for demo
- Targeting er aktivt i prod — fordeler/heroer uten TargetingRule vises for alle (matchesSession(null) = true)
- Admin-auth: ADMIN_EMAILS (kommaseparert), ADMIN_PASSWORD, ADMIN_JWT_SECRET — må re-provisjoneres som Coolify-miljøvariabler (CR-011), ikke gjenbruk av Vercel sine
- vitest er lagt til som devDependency — `npm test` kjører alle unit-tester
- Node.js er installert lokalt (denne maskinen) via `winget install OpenJS.NodeJS.22 --scope user` — se memory. Bruk `$env:PATH = "C:\Users\haavard.kvinnesland\AppData\Local\Microsoft\WinGet\Packages\OpenJS.NodeJS.22_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v22.23.2-win-x64;$env:PATH"` i hver PowerShell-kommando som trenger node/npm — PATH-endringen fra winget vedvarer ikke i denne økt-typen shell.
- Historisk: `npm ci` avdekket opprinnelig 12 sårbarheter (1 kritisk, 10 high) under CR-011. CR-015 fjernet det kritiske funnet (patch), CR-018 fjernet alle gjenstående 8 high (major-oppgradering) — `npm audit` viser nå 0 vulnerabilities. ISSUE-009 markert Resolved 2026-08-18 (dokumentert 2026-08-27).
- `npm install ioredis` (2026-08-07, CR-014, commit 10d9fd1) endret ikke sårbarhetstallet (fortsatt 12 — 1 kritisk, 10 high, 1 low) — ingen nye sårbarheter introdusert av ioredis selv.

## Risks
- **CR-019 uverifisert i nettleser og uncommitted.** Ingen komponenttest-
  infrastruktur finnes; kun den rene `deriveDirtyState` er enhetstestet.
  Timing-regresjon i dirty-/«Lagret»-indikatorene fanges kun av manuell test.
  Arbeidet ligger kun i arbeidskatalogen — avbrutt økt uten commit er den
  samme prosessrisikoen som i Session-17.
- Untracked `docs/09–12_ff_*.md` + `.docx` (Flyttefordel dagens løsning/
  målbilde/24 tiltak) ligger utenfor alle CR-er; uavklart om de skal
  committes, flyttes eller ignoreres.
- **CR-018 er allerede LIVE i prod uten bekreftet smoke-test.** Async
  params/searchParams/cookies()/headers()-migreringen er en reell
  kodeendring (ikke bare versjonsbump) i auth-kritisk kode
  (`src/lib/session`, `src/lib/admin/auth.ts`) og 21 andre filer. Egen
  adversarial sikkerhetsgjennomgang + code-review fant og fikset ett reelt
  hull (10 side-komponenter), men ingen har sett appen kjøre i prod på
  next@16.3.1 ennå. Lav sannsynlighet for nye funn gitt grundigheten, men
  ikke null.
- **Prosessrisiko: to økter på rad ble avsluttet uten `/end-session`**
  (CR-017 sin implementasjon 2026-08-11, og hele CR-018/CR-019-arbeidet
  2026-08-18) — begge oppdaget udokumentert denne økten. Se DECISIONS.md
  2026-08-27. Hvis det skjer igjen, er risikoen at fremtidige økter bygger
  videre på en feilaktig forståelse av repo-tilstanden. Ingen
  automatisert safeguard finnes for dette utover at Claude nå kryssjekker
  `git log`/`git status` mot session-filene ved oppstart.
- CR-014 sin `x-forwarded-for`-tillit er ikke verifisert mot faktisk
  Coolify/Traefik-oppsett — kan forfalskes/feilkonfigureres hvis proxy-en
  ikke strippes riktig (se CR-014 Infra-checklist punkt c).
- CR-017 sin sperre er skrive-tidsvalidering, ikke en bakgrunnsjobb — en
  allerede aktiv fordel som blir "feilet" av noe utenfor en admin-
  redigering (f.eks. kodepool tømt av forbrukertrafikk) blir IKKE
  automatisk demotert, kun vist rødt i CR-016 sin badge (se CR-017 Risks).
- Kjente, tidligere aksepterte restrisikoer uendret: delt admin-passord
  (ett `ADMIN_PASSWORD` for alle brukere), ingen backup/feilsporing,
  utsatt consumer-app-auth, `<img>` i stedet for `next/image` — se
  DECISIONS.md 2026-08-06/2026-05-22 for begrunnelse.

## Next Recommended Actions
000. **CR-023**: godkjenn og implementer (tynn webside på /flytting). Testdata: utvid seed til ordentlige testdata (bruker foretrekker det fremfor demo-rute) og kjør den mot prod, f.eks. i Coolify-terminalen til app-containeren (ikke verifisert at tsx finnes der). Deretter bestilling som CR-024
00. Admin-UI for visninger/sider/produkter må også dekke lagret-siden og avklare kanalpresens (web eksplisitt, app implisitt)
0. **CR-020**: Done. Neste steg mot målbildet (docs/10 §10): utvelgelsesfunksjon eller person-ID, egen CR. Valgfritt: bekreft at nye benefit_events-rader har channel = 'app'
1. **CR-018**: Allerede LIVE i prod (push e7cc47c). Bruker smoke-tester
   admin-innlogging, anonym sesjon og minst én dynamisk route (admin +
   forbruker-app) før CR-018 markeres Done — se CR-018 Acceptance Criteria
2. **CR-017**: Done (committed 3ec4625, pushet 4a30c11) — Coolify auto-deploy
   trigget sammen med session-dokumentasjonsoppdateringen
3. **CR-016**: Deployet via Coolify auto-deploy (push 390e844). Bruker verifiserer
   visuelt de 4 fargebøttene (aktiv/planlagt/kladd/feilet) i nettleser på
   `/admin/benefits` og `/admin/benefits/[id]` før CR-016 markeres Done
4. **CR-019** (implementert, uncommitted): bruker tester alle 4 skjemaer i
   nettleser (rediger → «ulagrede endringer»; lagre → «Lagret»; rediger igjen
   → badge borte). Når bekreftet: Claude committer med CR-019-referanse
   (kun CR-019-filene + sessions/specs, IKKE tsconfig.json/docs/09–12) og
   markerer Done
5. **CR-014 Infra-checklist (bruker-oppgave i Coolify, ikke noe Claude kan utføre):**
   a. Provisjonér en Redis-ressurs i Coolify (samme prosjekt som appen og Postgres)
   b. Sett `REDIS_URL` som miljøvariabel på app-ressursen
   c. Bekreft at Coolify/Traefik faktisk videresender ekte klient-IP via
      `x-forwarded-for` — ikke anta det
   d. Smoke-test etter deploy: trigger faktisk 429 på begge endepunkter, bekreft
      `Retry-After`-header og at normal drift gjenopptas etter tidsvinduet
   e. Når alt over er verifisert: marker CR-014 Done
6. Dekk det aksepterte test-gapet fra CR-011 når det er praktisk: test claim-code/lead-
   innsendingsflyt + CSV-eksport i prod, og bekreft norske klokkeslett på
   /admin/profitability, /admin/analytics, /admin/leads, /admin/codes/[poolId]
7. Vurder Prisma 5→7-migrering som egen fremtidig CR — ville eliminert Alpine/OpenSSL-feilklassen
   permanent (se DECISIONS.md 2026-08-05), men er en breaking-change-oppgradering, ikke en hastesak
8. Etter CR-014/CR-016/CR-017/CR-018/CR-019: planlegg neste CR — kandidater:
   a. Bruker-autentisering (ny leverandør — Supabase Auth ikke lenger et alternativ, se ARCHITECTURE-STATE.md)
   b. Notifikasjoner ved lav pool-beholdning (e-post / webhook)
   c. Per-sesjon LTV-estimat på /admin/profitability (AdminSessionLTV — type definert, query ikke implementert)
   d. Presigned direct-upload til S3 i stedet for server-side proxy, hvis bildevolum/frekvens øker
      (se CR-012 Performance Impact)
   e. Backup/feilsporing som egne CRs ved overgang fra prototype til MVP/produksjon
      (se DECISIONS.md 2026-08-06)
   f. Migrer `middleware.ts` til Next 16 sin `proxy.ts`-konvensjon (deprecated, ikke fjernet —
      ikke en hastesak, se CR-018 Implementation Notes)
