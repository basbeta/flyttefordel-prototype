# CR-011: Rate limiting på claim-endepunkt

Status: Draft
Created: 2026-05-28

## Business Goal
Forhindre at én bruker eller bot kan tømme kode-pool ved å sende mange raske krav mot
`/api/benefits/[slug]/claim-code` — beskytter annonsørkoder og demo-integriteten.

## Problem Statement
`/api/benefits/[slug]/claim-code` har ingen rate limiting per i dag (ISSUE-008 punkt 3 — utsatt).
En aktør kan i prinsippet sende tusenvis av requests og tømme poolen i løpet av sekunder.
Serverless-miljøet (Vercel Edge/Node) har ingen innebygd throttling.

## Proposed Solution

### 1. Upstash Redis-integrasjon
Legg til `@upstash/ratelimit` og `@upstash/redis` som dependencies.
Konfigurer via env vars `UPSTASH_REDIS_REST_URL` og `UPSTASH_REDIS_REST_TOKEN`.

### 2. Rate limit-strategi
- **Window**: sliding window 60 sekunder
- **Grense**: 5 claims per anon_id per vindu
- **Fallback**: hvis Redis er utilgjengelig — tillat request (fail open) og logg feil
- Nøkkel: `ratelimit:claim:{anonId}`

### 3. API-endepunkt-endring
`/api/benefits/[slug]/claim-code/route.ts`:
- Hent `anon_id` fra cookie
- Kjør rate limit-sjekk før Prisma-kall
- Returner `429 Too Many Requests` med `Retry-After`-header ved overskridelse

### 4. Admin-synlighet (valgfritt)
Logg rate-limit-treff som `BenefitEvent` av ny type `rate_limit_hit` — synlig i analytics.

## Impact Analysis

Affected Specs:
- [ ] specs/nfr.md — ny NFR for rate limiting
- [ ] specs/api.yaml — 429-respons dokumentert

Affected Components:
- `src/app/api/benefits/[slug]/claim-code/route.ts` — rate limit-sjekk
- `src/lib/ratelimit/` — ny modul: `limiter.ts` (Upstash-klient + konfigurasjon)
- `package.json` — `@upstash/ratelimit`, `@upstash/redis`

Database Impact:
- Ingen DB-endringer — state lagres i Redis

API Impact:
- Ny 429-respons på claim-endepunktet
- Breaking for clients som ikke håndterer 429 — men consumer-app bør håndtere dette

Security Impact:
- Reduserer angrepsoverflate betydelig
- anon_id er cookie-basert — kan omgås med nye cookies, men øker friksjon vesentlig

Performance Impact:
- ~1–2 ms overhead per request for Redis-oppslag (Upstash HTTP API)
- Fail-open ved Redis-nedetid — ingen degradering av kritisk flyt

## Acceptance Criteria
- [ ] `@upstash/ratelimit` + `@upstash/redis` installert og konfigurert
- [ ] Claim-endepunktet returnerer 429 etter 5 krav per sesjon per 60 sek
- [ ] Retry-After-header satt korrekt i 429-respons
- [ ] Fail-open ved Redis-utilgjengelighet (request tillates, feil logges)
- [ ] Unit-test: mock Redis — verifiser 429-logikk og Retry-After-beregning
- [ ] Env vars dokumentert i README / CURRENT-STATE

## Required Tests
- [ ] Unit: 5 vellykkede claims → 6. gir 429
- [ ] Unit: Redis-feil → request tillates (fail open)
- [ ] Unit: Retry-After-header er riktig beregnet

## Rollback Strategy
Fjern rate limit-sjekken fra route.ts og env vars — endepunktet fungerer som før.

## Migration Strategy
1. Opprett Upstash Redis-instans (gratis tier)
2. Sett env vars i Vercel
3. Deploy

## Risks
- anon_id kan roteres av bruker — rate limiting er ikke vanntett, men tilstrekkelig for demo
- Upstash gratis tier: 10 000 commands/dag — tilstrekkelig for demo-volum

## Dependencies
- Krever Upstash Redis-konto og env vars i Vercel
- CR-006 (claim-code implementasjon som modifiseres)
