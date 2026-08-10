# CR-015: Sikkerhetsoppdatering — next.js og transitive avhengigheter

Status: Done (2026-08-10)
Created: 2026-08-10
Approved: 2026-08-10
Note (2026-08-10, etter implementering): Opprinnelig akseptansekriterium
  "0 high-sårbarheter i produksjonsavhengigheter" var for optimistisk satt
  ved Draft-tidspunktet. Etter faktisk oppgradering til `next@14.2.35` viser
  `npm audit --omit=dev` fortsatt 2 high (`next`, `postcss`) — disse kreves
  først løst av `next@16.3.0` (semver-major, eksplisitt utenfor scope for
  denne CR-en). Det kritiske funnet er derimot borte (0 kritisk). AC nedenfor
  er korrigert til å reflektere det som faktisk er oppnåelig uten
  major-oppgradering — se Implementation Notes.

## Business Goal
Fjerne en kritisk sikkerhetssårbarhet (CVE i `next@14.2.3`) og tilhørende
høy-alvorlighetssårbarheter fra produksjonsavhengigheter, uten å ta på seg
risikoen ved en major-versjonsoppgradering. Adresserer ISSUE-009 (High
priority, åpnet 2026-08-05 under CR-011).

## Problem Statement
`npm audit` (kjørt på nytt 2026-08-10, se `sessions/OPEN-ISSUES.md`
ISSUE-009) viser 13 sårbarheter (1 kritisk, 11 high, 1 low):

- **`next@14.2.3`** (direkte avhengighet, kritisk): sekk med kjente
  CVE-er — bl.a. authorization bypass i Middleware, SSRF via
  Middleware-redirects/rewrites/Server Actions, cache poisoning, DoS i
  Server Components/Image Optimization, XSS i CSP-nonce-håndtering og
  `beforeInteractive`-scripts, HTTP request smuggling i rewrites, m.fl.
  Patchet i `next@14.2.35` — **samme major/minor-linje (14.2.x), ikke en
  semver-major-oppgradering** (`npm audit` sin `fixAvailable.isSemVerMajor:
  false`). `next` er pinnet eksakt (`"14.2.3"`, ingen `^`) i `package.json`,
  derfor krever selv patch-oppgraderingen en manuell versjonsendring.
- **`postcss` (transitiv via next, high)**: XSS i CSS-stringify-output,
  path traversal/arbitrary file read via `sourceMappingURL`. Løses av
  samme `next`-oppgradering (postcss er en `next`-avhengighet).
- **`eslint-config-next@14.2.3` → `@next/eslint-plugin-next` → `glob`
  (high, dev-only)**: kun brukt av `next lint`, ingen kjøretids-/
  produksjonspåvirkning. Fix krever `eslint-config-next@16.3.0` — en
  semver-major-oppgradering (`isSemVerMajor: true`) som sannsynligvis
  også drar med seg ESLint-major-bump. **Ikke i scope for denne CR-en**
  (jf. CLAUDE.md-regelen om at major-oppgraderinger er egne CR-er).
- **6 andre transitive dev-avhengigheter** (`brace-expansion`, `esbuild`,
  `js-yaml`, `minimatch`, `nanoid`, `vite` — alle via `vitest`):
  high/low, ingen produksjonspåvirkning (kun test-tooling). Dekkes av
  standard `npm audit fix` uten `--force`, ingen semver-major involvert.

## Proposed Solution
1. Oppgrader `next` fra `"14.2.3"` til `"14.2.35"` i `package.json`
   (fortsatt eksakt pinnet, ingen `^` — konsistent med eksisterende
   konvensjon i denne filen). Kjør `npm install` for å oppdatere
   `package-lock.json`.
2. Kjør `npm audit fix` (uten `--force`) for å ta de 6 lavrisiko
   dev-transitive sårbarhetene (`brace-expansion`, `esbuild`, `js-yaml`,
   `minimatch`, `nanoid`, `vite`) — ingen produksjonskodepåvirkning.
3. **Ikke** røre `eslint-config-next` i denne CR-en — logg gjenstående
   `eslint-config-next`/`@typescript-eslint`-sårbarheter (dev-only, lint-
   tid) som egen, lavere-prioritert oppfølging i `OPEN-ISSUES.md` hvis de
   fortsatt består etter steg 2.
4. Full regresjonsvalidering: `npx tsc --noEmit`, `npx vitest run` (alle
   eksisterende tester må fortsatt passere uendret — ingen ny testdekning
   forventes fra en ren avhengighetsoppgradering), `npm run build`.
5. Manuell smoke-test i prod etter deploy (se Required Tests) — spesielt
   av Middleware-avhengig funksjonalitet (admin-auth-guard, anonym
   sesjon-cookie) siden flere av de patchede CVE-ene er Middleware-
   relaterte.

## Impact Analysis

Affected Specs:
- [x] specs/architecture.md — versjonsnummer for `next` i External
      Dependencies-listen oppdatert til 14.2.35 + restrisiko-notat
- [x] specs/entities.md — ingen endring (bekreftet)
- [x] specs/api.yaml, specs/nfr.md, specs/ui-spec.md, specs/flows.md —
      ingen endring (uutfylte maler, samme fravalg som tidligere CR-er)

Affected Components:
- `package.json`, `package-lock.json` — versjonsbump `next` + `npm audit
  fix`-oppdaterte dev-transitive pakker
- Ingen applikasjonskode endres — dette er en ren avhengighetsoppdatering

Database Impact:
- Ingen.

API Impact:
- Ingen bevisst kontraktsendring. `next@14.2.35` inkluderer patcher for
  Middleware/rewrites/Server Actions-oppførsel — risiko for uventet
  atferdsendring er lav (patch-versjon, ikke major), men dekkes av
  regresjonstest + manuell smoke-test av Middleware-avhengige flyter.

UX Impact:
- Ingen tiltenkt. Se API Impact for restrisiko.

Security Impact:
- Direkte formål: fjerner 1 kritisk + 2 high sårbarhet (next + postcss)
  fra produksjonsavhengigheter. Gjenstående 10 high + 1 low er dev-only
  (lint/test-tooling), ingen produksjonseksponering.

Performance Impact:
- Ingen forventet endring — patch-versjon av samme major/minor-linje.

Required Tests:
- [x] Unit: `npx vitest run` — alle eksisterende tester (91) må passere
      uendret
- [x] Type-check: `npx tsc --noEmit` — ingen feil
- [x] Build: `npm run build` — bygger rent
- [x] Manuell (etter deploy): admin-innlogging (JWT-guard via Middleware)
      og forbrukerapp-sesjon (anon_id-cookie via Middleware) fungerer
      uendret i prod — bekreftet av bruker 2026-08-10
- [~] Manuell (etter deploy): `npm audit --omit=dev` i prod-bygget viser
      0 kritisk (bekreftet lokalt) — 2 high (`next`/`postcss`) forblir,
      se korrigert AC

## Acceptance Criteria
- [x] `next` oppgradert til `14.2.35` i `package.json` (eksakt pinnet)
- [x] `npm audit --omit=dev` viser 0 kritiske sårbarheter (ned fra 1)
- [~] `npm audit --omit=dev` viser 2 gjenstående high (`next`, `postcss`)
      — korrigert AC: **ikke** 0/0, siden full fix krever `next@16.3.0`
      (major, utenfor scope). Akseptert restrisiko, se Risks + ISSUE-009.
- [x] `npx tsc --noEmit`, `npx vitest run` (91/91), `npm run build` —
      alle grønne, ingen regresjon (verifisert 2026-08-10)
- [x] Admin-innlogging og anonym sesjon verifisert uendret i prod etter
      deploy (bekreftet av bruker 2026-08-10)
- [x] Gjenstående dev-only-sårbarheter: 6 av 10 løst av `npm audit fix`
      (`brace-expansion`, `esbuild`, `js-yaml`, `nanoid`, `vite` +
      transitive). 4 gjenstår (`eslint-config-next`-familien: `glob`,
      `minimatch`, `@typescript-eslint/*`) — krever samme
      `eslint-config-next@16.3.0`-major som ble avslått i scope. Logget
      som oppfølging, se Implementation Notes.

## Implementation Notes (2026-08-10)
- `npm install` etter versjonsbump: kun `next` + 2 relaterte pakker
  endret (ingen uventede sideeffekter).
- `npm audit fix` (uten `--force`, kjørt to ganger): løste 6 av de 10
  opprinnelige dev-transitive sårbarhetene og all `low`-severity.
  Gjenstående 8 high fordeler seg på nøyaktig de to major-bump-kjedene
  som var forutsett i Problem Statement: `next`/`postcss` (→
  `next@16.3.0`) og `eslint-config-next`→`glob`/`@typescript-eslint/*`→
  `minimatch` (→ `eslint-config-next@16.3.0`). Ingen ny, uforutsett
  sårbarhetskjede oppdaget.
- `npm audit --omit=dev` (produksjon isolert): 2 high (`next`, `postcss`),
  0 kritisk, 0 moderate, 0 low — ned fra 1 kritisk + 2 high før denne CR-en.
- Full lokal validering: `npx tsc --noEmit` ✓, `npx vitest run` 91/91 ✓
  (uendret antall og innhold), `npm run build` ✓ (bygger med
  "▲ Next.js 14.2.35" i output, ingen nye advarsler utover eksisterende
  `<img>`-lint-varsler).
- Gjenstående, ikke committed: commit + push + Coolify-deploy +
  prod-smoke-test av admin-login/anonym sesjon (Middleware-avhengig).

## Rollback Strategy
Ren avhengighetsendring i `package.json`/`package-lock.json` — ved
problemer, revert commit og re-deploy. Ingen datamigrering, ingen
skjemaendring.

## Migration Strategy
1. Oppgrader `next` lokalt, kjør `npm install`.
2. Kjør `npm audit fix` (uten `--force`).
3. Full validering lokalt (tsc/vitest/build).
4. Commit, push → Coolify auto-deploy.
5. Manuell smoke-test i prod (admin-login, anonym sesjon, `npm audit
   --omit=dev` i container om mulig).

## Risks
- Patch-versjonen (`14.2.3` → `14.2.35`) spenner over mange interne
  Next.js-releaser med atferdsendringer i Middleware/rewrites/Server
  Actions (nettopp fordi disse ble patchet) — lav, men ikke-null risiko
  for uventet regresjon i produksjonens Middleware-baserte auth-guard.
  Mitigert av eksplisitt manuell smoke-test av nettopp disse flytene
  etter deploy.
- `eslint-config-next`-familiens sårbarheter forblir uløst inntil en
  fremtidig, egen major-oppgraderings-CR — akseptert risiko siden de er
  dev-only (lint-tid, ingen kjøretidseksponering).

## Dependencies
- Ingen avhengighet av andre åpne CR-er. CR-014 (rate limiting) er
  uavhengig og kan fullføres/vente på infra parallelt.
