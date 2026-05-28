# CR-013: Varsling ved lav kode-beholdning

Status: Draft
Created: 2026-05-28

## Business Goal
Gi admin automatisk varsling når en kode-pool nærmer seg tomt — slik at annonsørkoder
kan etterfylles i tide og unngå at brukere møter tomme pools.

## Problem Statement
`CodePool.lowStockThreshold` finnes i schema men er ikke koblet til noen varslings-mekanisme
(ISSUE-008 punkt 5 — utsatt). Admin må manuelt sjekke `/admin/codes` for å oppdage lav beholdning.
For produksjonsdrift er dette uholdbart.

## Proposed Solution

### 1. Trigger-punkt
Etter hver vellykket kode-tildeling (`claimCode.ts`): sjekk om
`CodePool.availableCodes <= CodePool.lowStockThreshold`.
Hvis ja — send varsling (én gang per terskel-kryssing, ikke per claim).

### 2. Varslings-kanal: e-post via Resend
- Legg til `resend` som dependency
- `src/lib/notifications/sendLowStockAlert.ts` — sender e-post til konfigurerbar mottaker
- Env var: `RESEND_API_KEY`, `ALERT_EMAIL` (hvem varslingen sendes til)
- E-post inneholder: fordelsnavn, annonsør, gjenværende koder, threshold, lenke til admin

### 3. Debounce / én-gang-varsling
For å unngå spam: lagre tidspunkt for sist sendt varsling per pool.
- Ny nullable kolonne på `CodePool`: `lastLowStockAlertAt DateTime?`
- Varsling sendes kun hvis `lastLowStockAlertAt` er null eller eldre enn 24 timer

### 4. Admin dashboard-indikator
Rød badge på dashboard og i sidebar dersom én eller flere pools er under threshold —
dette finnes delvis allerede (kode-alarm i dashboard), men kobles nå til threshold-feltet.

### 5. Webhook-alternativ (valgfritt)
Env var `ALERT_WEBHOOK_URL` — POST JSON-payload til Slack/Teams/n8n.
Implementeres kun hvis `ALERT_WEBHOOK_URL` er satt.

## Impact Analysis

Affected Specs:
- [ ] specs/nfr.md — varslings-NFR
- [ ] specs/entities.md — CodePool: lastLowStockAlertAt

Affected Components:
- `prisma/schema.prisma` — CodePool: `lastLowStockAlertAt DateTime?`
- `src/lib/notifications/` — ny modul: `sendLowStockAlert.ts`
- `src/lib/codes/claimCode.ts` — kall notifications etter vellykket claim
- `src/app/admin/(protected)/page.tsx` — oppdatert kode-alarm med threshold-sjekk
- `package.json` — `resend`

Database Impact:
- Ny nullable kolonne `lastLowStockAlertAt` på `code_pools`
- `prisma db push` — additive

API Impact:
- Ingen nye API-endepunkter
- Intern endring i claimCode-transaksjonen

Security Impact:
- `RESEND_API_KEY` er server-side only — aldri eksponert i browser
- `ALERT_EMAIL` bør ikke være en offentlig adresse

Performance Impact:
- E-post sendes asynkront (fire-and-forget) — ingen impact på claim-responstid
- Én ekstra DB-skriv (oppdatere lastLowStockAlertAt) per varsling — neglisjerbar

## Acceptance Criteria
- [ ] E-post sendes til `ALERT_EMAIL` når pool < `lowStockThreshold`
- [ ] Varsling sendes ikke mer enn én gang per 24 timer per pool
- [ ] `lastLowStockAlertAt` oppdateres i DB etter varsling
- [ ] Webhook sendes til `ALERT_WEBHOOK_URL` hvis env var er satt
- [ ] Admin dashboard viser riktig antall pools under threshold
- [ ] Varsling er fire-and-forget — claim-endepunktet påvirkes ikke ved e-postfeil
- [ ] Unit-tester for debounce-logikk og threshold-sjekk

## Required Tests
- [ ] Unit: pool over threshold → ingen varsling
- [ ] Unit: pool under threshold, ingen tidligere varsling → varsling sendes
- [ ] Unit: pool under threshold, varsling sendt < 24t siden → ingen ny varsling
- [ ] Unit: pool under threshold, varsling sendt > 24t siden → varsling sendes

## Rollback Strategy
Fjern kallet til `sendLowStockAlert` fra `claimCode.ts`. E-post-sending er isolert i
egen modul — ingen andre endringer nødvendig.

## Migration Strategy
1. Opprett Resend-konto og hent API-nøkkel
2. Sett `RESEND_API_KEY` og `ALERT_EMAIL` i Vercel
3. `prisma db push` — legger til `lastLowStockAlertAt`
4. Deploy

## Risks
- Resend gratis tier: 3 000 e-poster/måned — mer enn nok for varsling
- E-postleveranse er ikke garantert — webhook-alternativ anbefales som backup
- Threshold = 0 (default) vil aldri trigge varsling uten at admin setter verdi

## Dependencies
- Krever Resend-konto og `RESEND_API_KEY` i Vercel
- CR-006 (claimCode.ts som modifiseres)
- CR-009 (CodePool-modellen med lowStockThreshold)
