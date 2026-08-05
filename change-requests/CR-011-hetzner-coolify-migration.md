# CR-011: Migrering fra Vercel/Supabase til Hetzner/Coolify

Status: In Progress
Created: 2026-08-05

## Business Goal
Flytte hosting fra Vercel (Hobby) + Supabase (free tier) til selvhostet
Hetzner/Coolify-infrastruktur, i tråd med migreringsnotatet i
`specs/architecture.md` ("Hosting byttes til Vercel Pro eller egne servere
ved MVP", "Database byttes til Bas/Posten-infrastruktur ved MVP"). Fjerner
Supabase free-tier pause-problemet og gir full kontroll over
container/deploy-miljøet før prosjektet går fra demo til MVP.

## Problem Statement
Nåværende plattform (Vercel Hobby + Supabase free tier) er tilstrekkelig for
demo, men har kjente begrensninger som blokkerer MVP:
- Supabase-prosjektet pauser etter 1 uke uten aktivitet (dokumentert i
  `sessions/CURRENT-STATE.md` og `src/lib/db/client.ts`).
- Vercel Hobby er ikke egnet for produksjonstrafikk under Bas/Posten sitt navn.
- Vercel (serverless) skjuler infrastrukturhensyn (function timeouts, korrekt
  Host-header, build-vs-runtime env vars) som blir prosjektets eget ansvar
  ved selvhosting — se `docs/MIGRATION-PLAYBOOK-HETZNER-COOLIFY.md`.

## Proposed Solution
Følg `docs/MIGRATION-PLAYBOOK-HETZNER-COOLIFY.md` punkt for punkt:

1. **Coolify-oppsett**: Dockerfile-basert build (ikke Nixpacks), FQDN satt
   før GitHub-webhook wires opp, fersk Postgres-instans (ikke gjenbruk av
   Supabase-config), daglig `pg_dump`-backup verifisert med "Backup Now",
   uptime-monitoring lagt til fra dag én.
2. **Kodeendringer for å forlate serverless-plattformen** (se Impact
   Analysis under for konkrete funn i denne kodebasen):
   - Eksplisitt `connectionTimeoutMillis` på Prisma sin `pg.Pool`.
   - Garantert JSON-feilrespons (`try/catch`) på alle 19 API-ruter under
     `src/app/api/`.
   - Explicit `NEXT_PUBLIC_APP_URL`-basert origin i stedet for
     request-avledet origin, i alt fremtidig server-side kode som bygger
     absolutte URL-er (ingen slik kode finnes i dag — forebyggende regel).
   - Audit av build-time vs. runtime env vars i Coolify-panelet
     (`NEXT_PUBLIC_*`-prefiks kun der verdien faktisk trengs i klient-bundle).
   - Eksplisitt `timeZone: 'Europe/Oslo'` på de 6 faktiske dato-formateringskallene
     (se Impact Analysis — 2 av de opprinnelig 8 flaggede stedene viste seg å
     formatere tall, ikke datoer, og `timeZone` er ikke relevant for dem).
   - BOM-fri generering av alle SQL-migrasjonsfiler fremover (Windows-fare).
3. **Migrasjonsstrategi for schema** (se §3 i playbook — høy risiko i denne
   kodebasen, se Database Impact under).
4. **Observability**: sette opp feilsporing (Sentry-kompatibel) med
   HTTPS-DSN, verifisert med én testfeil før cutover.
5. **Rollback**: gammel Vercel/Supabase-plattform beholdes urørt og kjørende
   som fallback til ny plattform er verifisert stabil over reell bruk i
   flere dager. Full cutover (ikke parallel-drift), fersk database (demo-data
   er disposable — ingen `pg_dump`/restore av eksisterende data).

## Impact Analysis

Affected Specs:
- [x] specs/architecture.md — hosting/DB-rad i tech stack-tabellen, nytt
      miljøvariabel-oppsett, Dockerfile som ny artefakt
- [ ] specs/entities.md
- [ ] specs/api.yaml
- [ ] specs/flows.md
- [ ] specs/nfr.md — ingen formelle SLA-er definert per ISSUE-005; bør notere
      at selvhosting fjerner Vercel sin implisitte function-timeout-garanti
- [ ] specs/ui-spec.md

Affected Components:
- `src/lib/db/client.ts` — fjern Supabase free-tier-kommentar, legg til
  `connect_timeout`/`socket_timeout` på DATABASE_URL, oppdater migreringsnotat
- `src/app/api/**/*.ts` (19 ruter) — audit try/catch → garantert JSON-feilrespons
- 6 filer med faktisk dato-formatering uten `timeZone`: `benefits/page.tsx`,
  `leads/LeadsTable.tsx` (2 kall), `heroes/page.tsx`,
  `codes/[poolId]/page.tsx` (2 kall). (`analytics/page.tsx` og
  `profitability/page.tsx` sine `toLocaleString`-kall formaterer tall, ikke
  datoer — ikke relevante for denne fiksen.)
- Nytt: `Dockerfile` (finnes ikke i repo per nå)
- `package.json` — `@supabase/supabase-js` er installert men **brukes ikke
  noe sted i `src/`** (verifisert via full-repo grep) — kandidat for fjerning
  i post-migrasjon hygiene (playbook §6), siden Auth/Storage aldri ble
  koblet inn (jf. `ARCHITECTURE-STATE.md`: "/lib/auth — Utsatt")
- `sessions/CURRENT-STATE.md`, `specs/architecture.md` — miljøvariabel-liste
  og migreringsnotater må oppdateres til ny plattform

Database Impact:
- **LØST (2026-08-05)**: `20260522100321_init` var faktisk utdatert — manuell
  linje-for-linje sammenligning mot `schema.prisma` bekreftet 3 konkrete hull
  (manglet `user_sessions.postcode`/`moving_status`/unik-indeks fra CR-003,
  4 prisfelter på `benefits` fra CR-010, unik constraint på `codes` fra
  CR-009 — alle lagt til via `db push`, aldri fanget i en migrasjonsfil).
  Løst ved å regenerere en ny baseline-migrasjon
  (`prisma/migrations/20260805000000_init/`) via
  `npx prisma migrate diff --from-empty --to-schema-datamodel ./prisma/schema.prisma --script`
  — kjørbart uten noen live database. Siden ny Coolify-DB er fersk og tom,
  er dette tilstrekkelig; ingen shadow-DB eller prod-tilkobling var nødvendig.
- Fersk Postgres-instans på Coolify-siden (ikke `pg_dump`/restore) —
  demo-data regnes som disposable per bruker-beslutning.
- Bekreft Postgres major-versjon eksplisitt (ikke anta at den matcher
  Supabase sin nåværende versjon 15).

API Impact:
- Ingen endring i kontrakt/respons-format for eksisterende endepunkter.
- Alle 19 ruter må garantere JSON-feilrespons ved uventet feil (i dag
  ukjent/uverifisert dekning — krever egen audit-pass, ikke antatt OK).

UX Impact:
- Ingen tilsiktet UX-endring. Risiko for regresjon: dato/tid-visning i admin
  (leads, koder, analytics, lønnsomhet) hvis `TZ` ikke settes eksplisitt —
  se `toLocaleString`-funnene over.

Security Impact:
- `ADMIN_JWT_SECRET`, `ADMIN_EMAILS`, `ADMIN_PASSWORD` må re-provisioneres
  som Coolify-miljøvariabler (ikke gjenbruk av Vercel sine — ny hemmelighet
  anbefales som del av migreringen, ikke kopiering).
- Ingen supabase-nøkler er faktisk i bruk i kode i dag (se Affected
  Components), så `SUPABASE_SERVICE_ROLE_KEY`/anon-key kan trolig utelates
  fra ny plattform helt — bekreft før cutover, fjern derettter fra
  `specs/architecture.md` sin miljøvariabel-liste.

Performance Impact:
- Long-running container (i stedet for serverless) betyr at manglende
  I/O-timeouts nå kan henge prosessen for alltid i stedet for å bli drept av
  platform-timeout — se `connectionTimeoutMillis`-punktet over.
- Ingen forventet regresjon i normal drift; risiko er kun ved feilsituasjoner
  (hengende kall) som i dag maskeres av Vercel.

Required Tests:
- [x] Unit: eksisterende 41 vitest-tester bekreftet fortsatt grønne etter alle
      kodeendringer, pluss 4 nye tester for `withConnectionTimeouts()`
      (`src/lib/db/client.test.ts`) — 45/45 (2026-08-05)
- [ ] Integration: manuell smoke test etter hver infra-deploy — innlogging
      (admin), kjerneflyt (bla fordeler → se detalj → lagre/hent kode),
      CSV-eksport av leads
- [ ] Manuell: bekreft `/admin/profitability`, `/admin/analytics`,
      `/admin/leads`, `/admin/codes/[poolId]` viser korrekte
      norsk-tidssone-tidspunkt etter `TZ`-fix (§2.5)
- Ingen automatisert E2E-suite finnes i dag — per playbook §7 må dette sies
  eksplisitt, ikke antas dekket

## Acceptance Criteria
- [ ] Ny app kjører på Coolify via Dockerfile-build, tilgjengelig på eget domene
- [x] Fersk Postgres-instans-migrasjon regenerert og verifisert mot
      schema.prisma (se Database Impact) — selve Coolify-provisjoneringen
      gjenstår (brukeroppgave)
- [ ] Daglig backup bekreftet med "Backup Now" (fil observert i objektlagring)
- [ ] Uptime-monitoring aktiv på nytt domene
- [x] Alle 19 API-ruter garanterer JSON-feilrespons ved kastet feil (16 av 19
      manglet reell try/catch rundt Prisma-kall — kun `.catch(() => null)` på
      `request.json()` — alle 16 fikset 2026-08-05, resten hadde allerede
      dekning eller gjør ingen I/O som kan kaste)
- [x] Connection-timeout satt eksplisitt på Prisma-tilkoblingen — implementert
      som `connect_timeout`/`socket_timeout` query-parametre på DATABASE_URL i
      `src/lib/db/client.ts` (ikke `connectionTimeoutMillis`/`pg.Pool` — denne
      kodebasen bruker Prismas innebygde engine, ikke en rå `pg.Pool`)
- [x] Alle 6 faktiske dato-formateringskall har eksplisitt
      `timeZone: 'Europe/Oslo'` (2 av de opprinnelig 8 flaggede stedene var
      tallformatering, ikke dato — se Impact Analysis)
- [ ] Feilsporing verifisert end-to-end med én bevisst testfeil før cutover
- [ ] Gammel Vercel/Supabase-plattform urørt og fungerende som fallback
- [x] `specs/architecture.md`, `.env.example` og `sessions/ARCHITECTURE-STATE.md`
      oppdatert med ny plattform, nye miljøvariabler, fjernet
      Supabase-spesifikke notater (2026-08-05)

## Rollback Strategy
Gammel plattform (Vercel + Supabase) holdes urørt og kjørende gjennom hele
migreringen. Rollback = peke DNS/brukere tilbake til gammel URL, uten
kodereversering, forutsatt at endringene i denne CR-en er additive
(nytt Dockerfile/config, ingen fjerning av eksisterende kompatibilitet).
Faktisk nedstenging av gammel plattform er en egen, eksplisitt beslutning
tatt separat — ikke en automatisk oppfølging av vellykket deploy — og
skjer tidligst etter flere dagers stabil drift på ny plattform.

## Migration Strategy
Se Proposed Solution og Database Impact over. Rekkefølge:
1. Lokal build-paritet: samme Node-versjon som mål-Docker-image, kjørbar
   lokalt, før noen migreringskode skrives.
2. Coolify-infra opprettes (Dockerfile, fersk DB, backup, uptime) parallelt
   med at gammel plattform fortsatt kjører.
3. Kodeendringer fra §2 i playbooken landes som egne, reviewbare commits —
   ikke bundlet med infra-oppsettet.
4. Skjema-migrasjonsstrategi verifiseres migrasjon-for-migrasjon (se
   Database Impact) før noen migrasjonsbasert deploy-kommando aktiveres.
5. Cutover (DNS/domene) skjer først etter smoke test og verifisert
   feilsporing på ny plattform.

## Infra-checklist (brukeroppgave — Claude har ikke tilgang til Coolify/Hetzner)

Alt kodearbeid over er ferdig og validert lokalt. Det som gjenstår krever
tilgang til Coolify-konsollet og Hetzner-serveren, og må gjøres av deg:

1. **FQDN/domene FØR GitHub-webhook.** Sett domenet på Coolify-ressursen
   først. Wires webhooken opp før domenet er satt, kan den peke mot en rå
   IP:port som brannmuren blokkerer stille (kun 22/80/443 åpne).
2. **Build Pack: Dockerfile**, ikke Nixpacks (auto-deteksjon er upålitelig
   for denne typen app).
3. **Miljøvariabler i Coolify** — sett minst: `DATABASE_URL`, `DIRECT_URL`,
   `ADMIN_JWT_SECRET`, `ADMIN_EMAILS`, `ADMIN_PASSWORD`, `NEXT_PUBLIC_APP_URL`.
   Ingen `NEXT_PUBLIC_SUPABASE_*`/`SUPABASE_SERVICE_ROLE_KEY` trengs (fjernet).
   Bekreft at `DATABASE_URL` er markert tilgjengelig ved **Buildtime**, ikke
   bare Runtime — se `src/lib/db/client.ts` sin merknad om hvorfor modulet nå
   tåler at den mangler ved build, men den bør likevel være satt riktig.
4. **Fersk Postgres-instans** — ikke gjenbruk Supabase-config. Bekreft
   Postgres-versjon eksplisitt (ikke anta at den matcher Supabase sin v15).
5. **Første deploy**: Dockerfilens `CMD` kjører
   `npx prisma migrate deploy && npm run start` — trygt nå som
   `prisma/migrations/20260805000000_init/` er en verifisert, komplett
   baseline mot en tom database.
6. **Backup**: skru på daglig `pg_dump` under ressursens **Backups**-fane, og
   trykk **"Backup Now"** én gang for å bekrefte at en fil faktisk lander i
   bucket — ikke stol på at toggle = bekreftet.
7. **Uptime-monitoring**: legg til det nye domenet i Uptime Kuma (e.l.) nå,
   ikke som en oppfølging senere.
8. **Feilsporing**: sett opp Sentry-kompatibel feilsporing med en
   **`https://`**-DSN (ikke `http://` — mange SDK-transporter følger ikke
   redirects, og feilen er da helt stille). Send én bevisst testfeil og
   bekreft den faktisk vises i dashboardet før du stoler på oppsettet.
9. **Smoke test** etter deploy: admin-innlogging, bla fordeler → se detalj →
   lagre/hent kode, CSV-eksport av leads, og sjekk at
   `/admin/profitability`/`/admin/analytics`/`/admin/leads`/`/admin/codes/[poolId]`
   viser korrekte norske klokkeslett.
10. **Ikke skru av Vercel/Supabase ennå.** Behold som fallback til den nye
    plattformen har kjørt stabilt over reell bruk i flere dager — se
    Rollback Strategy.

## Risks
- ~~Skjema-drift mellom `_prisma_migrations`-tabellen og faktisk produksjons-
  skjema~~ — LØST, se Database Impact.
- BOM i migrasjonsfiler generert på Windows kan crash-loope containeren ved
  første faktiske kjøring (playbook §2.6) — ikke bare ved diff/lesing. Den nye
  `20260805000000_init/migration.sql` ble skrevet via Write-verktøyet
  (UTF-8 uten BOM), ikke PowerShell `Out-File` — risikoen unngått, ikke bare
  dokumentert.
- Manglende automatisert testdekning (ingen E2E) betyr at verifisering etter
  cutover er manuell og kan overse regresjon utenfor de sjekkede flytene.
- ~~`@supabase/supabase-js` fjernes potensielt for tidlig~~ — verifisert trygt:
  full `npm run build` + `npx tsc --noEmit` + `npx vitest run` kjørt både før
  og etter fjerning, alt grønt.
- **Nytt funn (2026-08-05)**: `connect_timeout`/`socket_timeout`-endringen i
  `src/lib/db/client.ts` krasjet først `npm run build` fullstendig
  (`new URL(undefined)` når DATABASE_URL mangler under Next.js sin
  page-data-collection). Fanget av lokal build-paritet (§0 i playbook) — nøyaktig
  den typen feil som playbooken sier kostet reell nedetid i effektbibliotek-
  migreringen. Fikset: `datasources`-nøkkelen utelates helt fra
  `PrismaClient`-konstruktøren når DATABASE_URL mangler, i stedet for å sende
  `{ url: undefined }` (som Prisma selv avviser like hardt).
- Docker er ikke installert på denne maskinen (kun Node ble installert, via
  `winget --scope user` — Docker Desktop krever admin/WSL2, som heller ikke er
  tilgjengelig). `docker build` er derfor IKKE verifisert lokalt — Coolifys
  egen build blir første reelle test av Dockerfilen.
- ISSUE-009 (ny): `npm ci` avdekket 12 sårbarheter (1 kritisk) i avhengigheter,
  inkl. en patchbar CVE i `next@14.2.3`. Bevisst utenfor scope for CR-011 (se
  OPEN-ISSUES.md) — men bør ikke bli glemt.

## Dependencies
- Hetzner-server og Coolify-instans må være provisjonert (utenfor Claude sin
  kontroll — brukeroppgave).
- DNS-tilgang for nytt domene.
- Ingen avhengighet av andre åpne CR-er.
