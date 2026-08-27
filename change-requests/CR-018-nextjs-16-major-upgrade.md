# CR-018: Next.js major-oppgradering 14.2.35 → 16.3.1

Status: Committed og pushet (e7cc47c) — Coolify auto-deploy trigget, venter på prod-smoke-test
Created: 2026-08-18
Approved: 2026-08-18

## Business Goal
Fjerne de resterende 8 high-severity sårbarhetene som `npm audit` viser i
`next`, `postcss` og `eslint-config-next`-familien (`glob`,
`@typescript-eslint/*`, `minimatch`). CR-015 løste det kritiske funnet og
6 lavrisiko dev-sårbarheter, men bevisst utsatte denne major-oppgraderingen
(se ISSUE-009 og `specs/architecture.md` restrisiko-notat) fordi den krever
en semver-major-bump (`next@16.3.1`, ikke en patch).

## Problem Statement
`npm audit` (kjørt 2026-08-18) viser 8 high-severity funn, alle krever
`--force`:

- **`next` 9.3.4-canary–16.3.0-preview** (direkte avhengighet, high): stor
  samling CVE-er — DoS i Image Optimizer og Server Components, HTTP
  request smuggling/desynkronisering i rewrites, cache poisoning
  (Middleware-redirects og RSC-cache-kollisjoner), XSS i CSP-nonce- og
  `beforeInteractive`-scripts, SSRF via WebSocket-upgrades/Server
  Actions/rewrites, uautentisert eksponering av interne Server
  Function-endepunkter, m.fl. Patchet i `next@16.3.1`.
- **`postcss` <=8.5.22** (transitiv via `next`, high): XSS i CSS-stringify,
  path traversal/arbitrary file read via `sourceMappingURL`. Løses av
  samme `next`-oppgradering.
- **`glob` 10.2.0–10.4.5** (transitiv via `eslint-config-next` →
  `@next/eslint-plugin-next`, high, dev-only): command injection via
  `-c`/`--cmd`. Løses av `eslint-config-next@16.3.1`.
- **`minimatch` 9.0.0–9.0.6** (transitiv via `@typescript-eslint/
  typescript-estree` → `@typescript-eslint/parser`, high, dev-only): 3
  ReDoS-varianter. `npm audit fix` (uten force) klarte ikke å løse denne
  isolert 2026-08-18 — trolig fordi `eslint-config-next@14.2.3` pinner en
  eldre `@typescript-eslint`-linje transitivt. Forventes løst som
  sidevirkning av `eslint-config-next@16.3.1`-oppgraderingen; verifiseres
  under implementering.

Nåværende versjoner (`package.json`): `next` 14.2.35 (eksakt pinnet),
`eslint-config-next` 14.2.3, `react`/`react-dom` `^18`, `eslint` `^8`.

## Proposed Solution
1. Oppgrader `next` til `16.3.1` og `eslint-config-next` til `16.3.1`.
2. Kjør Next.js' offisielle codemod (`npx @next/codemod@latest upgrade
   latest` eller tilsvarende) for å automatisere kjente API-migreringer,
   fremfor manuell fri oppgradering — major-hopp 14→16 hopper over 15.x
   sine breaking changes også, så codemod-dekning må verifiseres eksplisitt
   mot 15.x-endringer, ikke bare 16.x.
3. Vurder om `react`/`react-dom` må oppgraderes til `19.x` — Next 15/16
   sin React-versjonskrav må verifiseres mot faktisk installert
   `next@16.3.1` (ikke anta før sjekket; dokumenteres i Implementation
   Notes).
4. Gå gjennom og migrer alle brukssteder av dynamiske route-params,
   `searchParams` og `next/headers` (`cookies()`/`headers()`) til async
   API — dette er den mest sannsynlige kilden til reell atferdsendring i
   denne kodebasen. Et grovt søk (2026-08-18) fant 31 filer som treffer på
   `params`/`searchParams`/`cookies()`/`headers()`, inkludert
   `src/lib/session/index.ts` og `src/lib/admin/auth.ts` (auth-kritisk
   kode) samt et bredt sett av `app/api/**/[id]/route.ts`- og
   `app/**/[slug]/page.tsx`-filer.
5. Full regresjonsvalidering: `npx tsc --noEmit`, `npx vitest run` (alle
   eksisterende tester), `npm run build`.
6. Manuell smoke-test i prod etter deploy — spesielt admin-innlogging
   (JWT via Middleware), anonym sesjon-cookie, og minst én dynamisk
   route (`[id]`/`[slug]`) i både admin og forbruker-app.

## Impact Analysis

Affected Specs:
- [x] specs/architecture.md — oppdater External Dependencies-linje for
      `next` til 16.3.1, fjern ISSUE-009-restrisiko-notatet
- [x] specs/api.yaml, specs/entities.md, specs/nfr.md, specs/ui-spec.md,
      specs/flows.md — sjekket, ingen endring (ren rammeverksoppgradering,
      ingen tiltenkt kontrakt-/entitetsendring)

Affected Components:
- `package.json`, `package-lock.json` — major versjonsbump `next`,
  `eslint-config-next`, ev. `react`/`react-dom`
- Potensielt alle route handlers under `src/app/api/**/[*]/route.ts` og
  alle sider under `src/app/**/[*]/page.tsx` som bruker dynamiske params
  (async API-migrering, se Proposed Solution punkt 4)
- `src/lib/session/index.ts`, `src/lib/admin/auth.ts` — bruker
  `cookies()`/`headers()`, direkte i autentiseringskritisk kodevei
- `next.config.js`/`middleware.ts` om disse finnes og bruker API-er som
  er endret mellom 14 og 16 (verifiseres under implementering)

Database Impact:
- Ingen.

API Impact:
- Ingen bevisst kontraktsendring, men høy sannsynlighet for at dynamiske
  API-ruter (`[id]`, `[slug]`, `[poolId]`) må kodeendres (ikke bare
  versjonsbump) for å håndtere `params`/`searchParams` som `Promise`
  fremfor synkront objekt (Next 15+ breaking change). Dette er en reell
  kodeendring, ikke en ren avhengighetsoppdatering — skiller denne CR-en
  fra CR-015.

UX Impact:
- Ingen tiltenkt, men admin- og forbruker-flyter som er avhengige av
  Middleware (auth-guard, anonym sesjon) må smoke-testes eksplisitt siden
  Middleware-kjøretid/-oppførsel er endret mellom major-versjoner.

Security Impact:
- Formål: fjerner alle 8 gjenstående high-severity funn (produksjon:
  `next`, `postcss`; dev-only: `glob`, `minimatch`/`@typescript-eslint`).
  Netto sikkerhetsgevinst, forutsatt at migreringen gjøres korrekt og
  ikke introduserer nye auth-relaterte regresjoner i Middleware-koden.

Performance Impact:
- Ukjent/ikke vurdert i detalj — to major-versjoner (15, 16) kan endre
  cache-default-oppførsel for `fetch`/RSC. Verifiseres ved manuell
  smoke-test og eventuell overvåking etter deploy; ingen automatisert
  performance-test finnes i dette repoet per nå.

Required Tests:
- [x] Unit: `npx vitest run` — 118/118 grønt (19 testfiler), inkludert
      3 testfiler oppdatert til å sende `params` som `Promise.resolve({...})`
- [x] Type-check: `npx tsc --noEmit` — 0 feil
- [x] Build: `npm run build` — bygger rent, alle 44 routes generert
- [ ] Manuell (etter deploy): admin-innlogging, anonym sesjon, minst én
      dynamisk admin-route og én dynamisk forbruker-route — **ikke gjort
      ennå**, krever commit/push/deploy først
- [x] `npm audit` viser 0 high (ned fra 8) — bekreftet: 0 vulnerabilities

## Acceptance Criteria
- [x] `next` oppgradert til `16.3.1`, `eslint-config-next` til `16.3.1`
- [x] `npm audit` viser 0 high severity-funn
- [x] Alle bruksteder av `params`/`searchParams`/`cookies()`/`headers()`
      migrert til async API der nødvendig
- [x] `npx tsc --noEmit`, `npx vitest run`, `npm run build` — alle grønne
- [ ] Admin-innlogging og anonym sesjon verifisert uendret i prod etter
      deploy — **gjenstår**, se Implementation Notes
- [x] `specs/architecture.md` oppdatert med ny `next`-versjon, restrisiko-
      notat fra CR-015/ISSUE-009 fjernet eller lukket

## Implementation Notes (2026-08-18)
Utført med multi-agent orkestrering (ultracode) i en isolert git worktree
(`../flyttefordel-prototype-cr018`, branch `cr-018-nextjs-16-upgrade`) for
å ikke blande seg med annet pågående arbeid (CR-016/CR-017) på master.

- `npm install` av `next@16.3.1` feilet først med `ERESOLVE`:
  `eslint-config-next@16.3.1` krever peer `eslint>=9.0.0`, men `eslint@^8`
  (8.57.1) var installert. Løst ved å bumpe `devDependencies.eslint` fra
  `"^8"` til `"^9"` (resolved 9.39.5). Deretter installerte alt rent,
  0 vulnerabilities.
- `react`/`react-dom` trengte **ikke** oppgraderes til 19.x —
  `next@16.3.1`s peer range for react/react-dom er
  `^18.2.0 || 19.0.0-rc-... || ^19.0.0`, og installert `18.3.1` (fra
  eksisterende `^18`) tilfredsstiller den. `@types/react`/`@types/react-dom`
  uendret.
- Offisiell codemod (`npx @next/codemod@latest upgrade 16.3.1 -y`) kjørte
  non-interaktivt (`-y`/`--yes`, ikke `--force` — den flagget finnes ikke
  for denne kommandoen) men gjorde ingen endringer, siden `next` allerede
  var bumpet i `package.json` før codemod kjørte.
- To runder med migrering var nødvendig:
  1. `src/lib/session/index.ts` og `src/lib/admin/auth.ts` — la til
     `await` foran `cookies()`/`headers()`-kall (fanget av `tsc --noEmit`
     rett etter versjonsbump).
  2. 11 API route-filer (`advertisers/[id]`, `benefits/[id]`,
     `benefits/[id]/status`, `categories/[id]`, `codes/[poolId]/[codeId]`,
     `codes/[poolId]`, `heroes/[id]`, `leads/[id]/status`,
     `benefits/[slug]/claim-code`, `benefits/[slug]/lead`,
     `benefits/[slug]/save`) — delt `Params`-type endret til
     `Promise<{...}>`, alle handlere (ikke bare den tsc/build først
     rapporterte feil på — delt type påvirker samtlige eksporterte
     handlere i filen) oppdatert til `const { x } = await params`. Disse
     feilene ble **ikke** fanget av `tsc --noEmit` før `next build` hadde
     kjørt én gang — Next sin route-type-validering
     (`.next/types/validator.ts`) genereres først under build.
  3. 3 testfiler (`categories/route.test.ts`,
     `codes/[poolId]/[codeId]/route.test.ts`,
     `benefits/[slug]/claim-code/route.test.ts`) sendte `params` som
     synkront objekt til handlerne — oppdatert til
     `Promise.resolve({...})`. Disse feilet kun `tsc`, ikke `vitest run`
     (JS `await` på en ikke-Promise-verdi resolver til verdien selv, så
     runtime-oppførsel var uendret — kun typen var feil).
- Adversarial sikkerhetsgjennomgang av `src/lib/session/index.ts` og
  `src/lib/admin/auth.ts` (egen agent, høy innsats): **PASS, ingen funn**.
  Begge async-migreringene er korrekte ett-linjes `await`-tillegg,
  `middleware.ts` er urørt og bruker uendrede synkrone
  `NextRequest`/`NextResponse`-cookie-API-er, og alle kallere av
  `requireAdminAuth()`/`getOrCreateSession()` awaiter dem allerede
  korrekt. Ingen manglende `await`, ingen stille-undefined
  cookie/header-lesing, ingen nye race-vinduer.
- Next sin egen build-tooling oppdaterte `tsconfig.json` (la til
  `target: "ES2017"`, endret `jsx: "preserve"` → `"react-jsx"`, la til
  `.next/dev/types/**/*.ts` i `include`) og `next-env.d.ts` automatisk
  under `next build` — dette er forventet, Next-administrert
  konfigurasjon, ikke en bevisst endring. `strict: true` uendret.
- Full lokal validering, alle grønne: `npx tsc --noEmit` (0 feil),
  `npx vitest run` (118/118, 19 testfiler), `npm run build` (44 routes
  generert, ingen feil), `npm audit` (0 vulnerabilities, ned fra 8 high).
- Build-output viser at Next 16 har endret navn på Middleware-konseptet
  til "Proxy" internt (`ƒ Proxy (Middleware)` i build-output) —
  `middleware.ts`-konvensjonen fungerer fortsatt (bakoverkompatibel), men
  er notert som deprecated til fordel for en ny `proxy.ts`-konvensjon.
  **Ikke** endret i denne CR-en (fungerer uendret) — foreslå egen,
  separat micro-CR for å migrere til `proxy.ts` når det passer, ikke
  hastverk.

### Code review avdekket et reelt hull (2026-08-18, samme dag)
`/code-review` (medium innsats, egen agent — kjørte `tsc`/`vitest`/`lint`/
`build` selv for å verifisere empirisk, ikke bare lese kode) fant at
migreringen over var **ufullstendig**:

- **10 side-komponenter** var aldri migrert til async
  `params`/`searchParams`, til tross for at CR-ens eget grovsøk (se
  Proposed Solution) opprinnelig fant disse blant de ~31 filene:
  `(mobile)/benefits/[slug]/page.tsx` (+ `generateMetadata`),
  `(mobile)/benefits/page.tsx`, `admin/benefits/[id]/page.tsx`,
  `admin/advertisers/[id]/page.tsx`, `admin/categories/[id]/page.tsx`,
  `admin/heroes/[id]/page.tsx`, `admin/codes/[poolId]/page.tsx`,
  `admin/benefits/page.tsx`, `admin/leads/page.tsx`,
  `admin/analytics/page.tsx`. Dette var en **stille runtime-bug**
  (`params.slug` ble `undefined`), ikke en kompileringsfeil — Next
  genererer ikke samme strenge type-validering for side-komponenter som
  for API route handlers (`.next/types/validator.ts` dekker kun
  route handlers), så verken `tsc --noEmit` eller `next build` fanget
  det. Konsekvens hvis det hadde gått til prod: hele
  fordelsdetalj-siden og hele admin-CRUD-redigeringsflaten ville feilet
  eller vist feil data for enhver bruker.
- `package.json`s `"lint": "next lint"` var brukket — Next 16.3.1 har
  fjernet `next lint`-subkommandoen helt.
- **Ikke** re-flagget: `middleware.ts`→`proxy.ts`-deprecation (allerede
  bevisst utsatt over, ikke en ny sak).

Begge funnene ble fikset i en tredje runde (samme mønster, samme
verifiseringsdisiplin):
- Alle 10 side-filene migrert til `Promise<{...}>` + `await`, inkludert
  begge funksjonene (`generateMetadata` og default-eksport) der en fil
  har begge. Denne gangen er `tsc --noEmit` en reell sikkerhetsnett igjen
  siden selve typen faktisk ble endret (strukturell TS-sjekk fanger nå
  enhver gjenglemt `.slug`-tilgang på en `Promise`).
- Lint fikset ved å undersøke `node_modules/eslint-config-next` direkte
  (ikke gjettet): pakken eksporterer nativ flat config
  (`eslint-config-next/core-web-vitals`) i v16 — ingen `FlatCompat` nødvendig.
  Ny `eslint.config.mjs` lagt til, `.eslintrc.json` fjernet (bekreftet
  byte-identisk lint-output før/etter sletting), `package.json`s
  lint-script endret til `"eslint ."`.
- Egen "completeness scan"-agent (høy innsats) grep-søkte hele `src/app`
  på nytt etter denne runden — 0 gjenværende synkrone
  `params`/`searchParams`-bruk funnet.
- Verifisert selv (ikke bare stolt på agent-rapporter): kjørte
  `tsc --noEmit`, `vitest run`, `npm run build` på nytt manuelt — alle
  grønne. Stikkprøve-lest 2 av de fiksede filene i sin helhet, begge
  korrekte.
- **Nytt, ikke-blokkerende funn fra lint**: 8 preeksisterende
  `react-hooks/refs`/`react-hooks/set-state-in-effect`-feil i 4
  admin-skjema-komponenter (`AdvertiserForm.tsx`, `BenefitForm.tsx`,
  `CategoryForm.tsx`, `HeroForm.tsx`) + 3 advarsler
  (`@next/next/no-img-element` x2, ubrukt eslint-disable) — dukker først
  opp nå fordi Next 16 sin `eslint-config-next` aktiverer strengere
  React Hooks-regler. Preeksisterende kodemønstre, ikke introdusert av
  denne oppgraderingen. **Ikke fikset her** — foreslå egen oppfølgings-CR
  eller -issue.

**Ikke gjort ved skrivetidspunkt**: commit, push, PR/code review av selve
commit-en, deploy, prod-smoke-test. Alt over var verifisert lokalt i
worktree-en.

### Oppdatering 2026-08-27 (Session-17)
Commit `e7cc47c` og push til `origin/master` skjedde i en tidligere økt som
aldri kjørte `/end-session` — oppdaget denne økten ved at
`sessions/CURRENT-STATE.md` fortsatt beskrev CR-018 som "Draft"/ikke startet,
mens `git log`/`origin/master` viste den committed og pushet. Coolify
auto-deploy er trigget av pushet, men admin-innlogging/anonym
sesjon/dynamisk-route-smoke-testen er fortsatt IKKE bekreftet av bruker i
prod — se Acceptance Criteria og Next Recommended Actions i
`sessions/CURRENT-STATE.md`.

## Rollback Strategy
Revert commit(s) og re-deploy forrige `next@14.2.35`-versjon. Siden
denne CR-en sannsynligvis også endrer applikasjonskode (async
params-migrering), er dette ikke en ren avhengighets-revert som CR-015 —
verifiser at reverten tar med eventuelle kodeendringer i route
handlers/pages, ikke bare `package.json`/`package-lock.json`.

## Migration Strategy
1. Opprett egen branch for oppgraderingen (ikke gjør direkte på master
   gitt omfanget).
2. Kjør offisiell Next.js-codemod, gjennomgå diff manuelt.
3. Oppgrader `react`/`react-dom` hvis codemod eller build krever det.
4. Fiks kompileringsfeil fra `tsc --noEmit` iterativt — dette er
   hoveddelen av migreringsarbeidet.
5. Full lokal validering (tsc/vitest/build).
6. Code review (jf. CLAUDE.md-krav om reviewer-agent for endringer av
   dette omfanget).
7. Commit, push → Coolify auto-deploy.
8. Manuell smoke-test i prod.

## Risks
- Reell kodeendring kreves (async `params`/`searchParams`/`cookies()`),
  ikke en ren versjonsbump — større regresjonsrisiko enn CR-015. Mitigert
  av `tsc --noEmit` som fanger de fleste synkron/async-mismatcher
  statisk, pluss eksplisitt smoke-test av auth-kritiske Middleware-flyter.
- To major-versjoner hoppes over samtidig (15 og 16) — breaking changes
  fra begge må håndteres, øker sjansen for å overse en migreringssak som
  kun gjelder 15.x og ikke er fremhevet i 16.x-changelog.
- React-versjonskrav for `next@16.3.1` er ikke verifisert på
  CR-opprettelsestidspunkt — hvis `react@19` kreves, drar det med seg en
  egen kompatibilitetssjekk mot øvrige avhengigheter (ingen kjente
  konflikter identifisert per nå, men ikke eksplisitt sjekket).
- `eslint-config-next@16.3.1` kan kreve `eslint@9` (ESLint har egen
  major-linje) — potensielt separat migrering av ESLint-konfigurasjon
  (flat config). Verifiseres under implementering.

## Dependencies
- Ingen avhengighet av andre åpne CR-er. Bygger videre på CR-015 og
  lukker restrisikoen dokumentert der (ISSUE-009).
