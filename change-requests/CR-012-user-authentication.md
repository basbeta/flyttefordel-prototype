# CR-012: Bruker-autentisering (Supabase Auth e-post)

Status: Draft
Created: 2026-05-28

## Business Goal
La brukere opprette konto og logge inn med e-post — slik at lagrede fordeler, profil og
historikk overlever på tvers av enheter og nettlesere.

## Problem Statement
Alle sesjoner er i dag anonyme og cookie-baserte. Bytter brukeren enhet eller nettleser,
mister de lagrede fordeler og profil. For å gå fra demo til MVP trenger appen ekte
bruker-autentisering. Supabase Auth er valgt stack (se DECISIONS.md).

## Proposed Solution

### 1. Supabase Auth e-post/passord
- Aktiver e-post+passord auth i Supabase-prosjektet
- Legg til `NEXT_PUBLIC_SUPABASE_URL` og `NEXT_PUBLIC_SUPABASE_ANON_KEY` i env vars
- `src/lib/auth/supabaseClient.ts` — browser-klient

### 2. Registrering og innlogging
- `/register` — skjema: e-post + passord + bekreft passord
- `/login` — skjema: e-post + passord
- Supabase returnerer JWT — lagres i cookie via `@supabase/ssr`

### 3. Sesjonsfusjon
Når anonym bruker logger inn: knytt eksisterende `UserSession` (anon_id) til Supabase-uid.
- `UserSession`: legg til nullable `supabaseUserId`-kolonne
- Ved innlogging: PATCH `UserSession` med `supabaseUserId = auth.user.id`
- Lagrede fordeler og profil bevares

### 4. Beskyttede sider
- `/saved`, `/profile` — redirect til `/login` om ikke autentisert (valgfritt for demo)
- Alternativt: behold anonym tilgang, men tilby "Logg inn for å synkronisere"

### 5. Profilside
- Vis e-postadresse på `/profile`
- Logg ut-knapp

### 6. Middleware-oppdatering
- `src/middleware.ts` — verifiser Supabase-token i tillegg til anon_id-cookie

## Impact Analysis

Affected Specs:
- [ ] specs/requirements.md — FR om autentisering
- [ ] specs/architecture.md — auth-modul aktiveres
- [ ] specs/entities.md — UserSession: supabaseUserId-kolonne

Affected Components:
- `prisma/schema.prisma` — UserSession: `supabaseUserId String?`
- `src/lib/auth/` — ny modul: `supabaseClient.ts`, `getUser.ts`
- `src/middleware.ts` — Supabase Auth session-sjekk
- `src/app/(mobile)/login/` — ny: login-side + LoginForm
- `src/app/(mobile)/register/` — ny: registrerings-side + RegisterForm
- `src/app/(mobile)/profile/page.tsx` — viser e-post + logg ut
- `src/app/api/session/profile/route.ts` — kobler supabaseUserId ved innlogging

Database Impact:
- Ny nullable kolonne `supabaseUserId` på `UserSession`
- `prisma db push` — additive, ingen destruktiv endring

API Impact:
- Ny `POST /api/auth/login` og `POST /api/auth/register` (eller klient-side Supabase SDK)
- `PATCH /api/session/profile` — støtter kobling av supabaseUserId

Security Impact:
- JWT signert av Supabase — verifiseres server-side
- Passord håndteres utelukkende av Supabase — ingen passord i egen DB
- NEXT_PUBLIC_ANON_KEY er ikke sensitiv (row-level security i Supabase beskytter data)

Performance Impact:
- Auth-sjekk: ~5–10 ms overhead (Supabase JWT-verifisering)
- Ingen ekstra DB-runder — Supabase SDK håndterer token-refresh

## Acceptance Criteria
- [ ] Bruker kan registrere seg med e-post + passord
- [ ] Bruker kan logge inn og ut
- [ ] Supabase-token verifiseres server-side i middleware
- [ ] Anonym sesjon fusjoneres med autentisert sesjon ved innlogging
- [ ] Lagrede fordeler og profil bevares etter innlogging
- [ ] `/profile` viser e-postadresse og logg ut-knapp
- [ ] `tsc --noEmit` uten feil
- [ ] Unit-tester for sesjonsfusjons-logikk

## Required Tests
- [ ] Unit: sesjonsfusjon — anon_id kobles til supabaseUserId
- [ ] Unit: middleware-guard — ugyldig token gir redirect
- [ ] Integration: register → login → profil viser e-post

## Rollback Strategy
Deaktiver Supabase Auth i dashboard. Fjern `supabaseUserId`-kolonnen. Consumer-app
faller tilbake til anonym modus (cookie-basert) uten endringer.

## Migration Strategy
1. Aktiver e-post+passord i Supabase Auth-innstillinger
2. Sett `NEXT_PUBLIC_SUPABASE_URL` og `NEXT_PUBLIC_SUPABASE_ANON_KEY` i Vercel
3. `prisma db push` — legger til `supabaseUserId`-kolonne
4. Deploy

## Risks
- Supabase Auth e-post bekreftelses-e-post krever konfigurert SMTP (kan deaktiveres for demo)
- Sesjonsfusjons-logikk er ikke-triviell — race conditions ved rask innlogging
- `NEXT_PUBLIC_ANON_KEY` eksponeres i browser-bundle — dette er tilsiktet og trygt med RLS aktivert

## Dependencies
- Krever `NEXT_PUBLIC_SUPABASE_URL` og `NEXT_PUBLIC_SUPABASE_ANON_KEY` i Vercel
- CR-003 (anonym sesjon som fusjoneres)
