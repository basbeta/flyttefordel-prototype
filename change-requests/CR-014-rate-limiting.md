# CR-014: Rate limiting på innlogging og kode-tildeling

Status: Implementert (Redis) — committed (10d9fd1), venter på infra
Created: 2026-08-06
Approved: 2026-08-06
Note (2026-08-07): Redis vs. Traefik-arkitekturspørsmålet (ISSUE-012) er
  avklart — bruker valgte å beholde Redis. Kode committed 10d9fd1.
  CR-014 markeres IKKE Done ennå — gjenstående Infra-checklist (Redis-
  provisjonering, REDIS_URL, x-forwarded-for-verifisering, prod-smoke-
  test) krever handling i Coolify som Claude ikke har tilgang til.

## Business Goal
Beskytte to endepunkter mot automatisert misbruk: brute-force-gjetting av
admin-passord, og uttømming av kode-pooler ved at én aktør spinner opp
mange anonyme sesjoner og claimer koder i høyt tempo. Punkt 3 i ISSUE-008
(resolved, CR-009) identifiserte rate limiting på claim-code som nødvendig
men utsatt siden det krevde Redis — infrastruktur som ikke fantes da.
Admin-innlogging (`/api/admin/auth/login`) var ikke tidligere identifisert
som et rate-limiting-mål i dette prosjektet, men er et klassisk
høyprioritets sikkerhetstiltak (bekreftet i scope av bruker for denne CR-en).

## Problem Statement
- `POST /api/admin/auth/login` (`src/app/api/admin/auth/login/route.ts`)
  har ingen begrensning på antall innloggingsforsøk — en angriper kan
  automatisert prøve passord i det tempoet nettverket tillater.
  `validateAdminCredentials()` gjør en ren plaintext-sammenligning
  (dokumentert DEMO-ONLY i `src/lib/admin/auth.ts`), uten forsinkelse
  eller lockout.
- `POST /api/benefits/[slug]/claim-code`
  (`src/app/api/benefits/[slug]/claim-code/route.ts`) er idempotent per
  sesjon (`claimCode()` i `src/lib/codes/claimCode.ts`), men en aktør kan
  trivielt spinne opp mange nye anonyme sesjoner (sletter cookien,
  henter en ny `anon_id` fra middleware) og claime én kode per sesjon i
  høyt tempo — sesjonsbasert idempotens stopper ikke dette.
- Ingen rate-limiting-infrastruktur finnes i kodebasen i dag.

## Proposed Solution
1. **Ny Redis-basert rate-limit-modul**, isolert etter samme mønster som
   `/lib/db` og `/lib/storage`:
   - `src/lib/rateLimit/client.ts` — lazy Redis-klient (`ioredis`),
     build-safe konstruksjon (samme grunn som `src/lib/db/client.ts` og
     `src/lib/storage/client.ts`: modulet må ikke krasje `next build`
     sin page-data-collection bare fordi `REDIS_URL` mangler der).
   - `src/lib/rateLimit/rateLimiter.ts` — `checkRateLimit(key, limit,
     windowSeconds)`, fixed-window-algoritme via Redis `INCR` +
     `EXPIRE` på første treff i vinduet. Enklere enn sliding
     window/token bucket — tilstrekkelig presisjon for denne CR-ens
     formål (stoppe automatisert misbruk, ikke millisekund-nøyaktig
     kvotering).
   - `src/lib/rateLimit/getClientIp.ts` — leser `x-forwarded-for` (første
     IP i kommaseparert liste) med `x-real-ip` som fallback. **Risiko,
     ikke garanti**: forutsetter at Coolify sin reverse-proxy (Traefik)
     faktisk videresender ekte klient-IP — må verifiseres i prod (se
     Risks), ikke antas.
2. **Rate limiting på `POST /api/admin/auth/login`**: nøkkel `login:{ip}`,
   sjekket FØR `validateAdminCredentials()` kalles (begrenser
   forsøksrate, ikke bare mislykkede forsøk — enklere og unngår
   tidsangrep/e-post-enumerering via ulik respons-timing). Forslag:
   **5 forsøk per 15 minutter per IP**. Ved overskridelse: `429` med
   `Retry-After`-header og JSON `{ message: 'For mange
   innloggingsforsøk. Prøv igjen senere.' }`.
3. **Rate limiting på `POST /api/benefits/[slug]/claim-code`**: nøkkel
   `claim-code:{ip}` — global per IP, ikke per fordel/pool, siden
   trusselen er én aktør som drenerer flere pooler samtidig fra samme
   IP. Forslag: **20 claims per time per IP**. Ved overskridelse: `429`
   med `Retry-After`-header og JSON `{ message: 'For mange forsøk. Prøv
   igjen senere.' }`.
4. **Fail-open ved Redis-feil** (bevisst forslag, ikke standard "fail
   closed"-sikkerhetspraksis — se Risks): hvis Redis er nede/utilgjengelig,
   logg feilen (`console.error`) og LA forespørselen gå gjennom i stedet
   for å blokkere login/claim-code helt. Redis er splitter ny
   infrastruktur i dette prosjektet — å la en Redis-hikke ta ned
   admin-innlogging helt vurderes som verre enn å miste rate-limit-
   beskyttelsen i det korte tidsvinduet en eventuell Redis-feil varer.
5. De eksakte grensene (5/15 min, 20/time) er forslag, ikke hardkodet
   vitenskap — juster ved godkjenning om annet ønskes.

## Impact Analysis

Affected Specs:
- [ ] specs/architecture.md — ny `/lib/rateLimit`-modul i Module Map, ny
      `ioredis`-avhengighet, ny `REDIS_URL`-miljøvariabel
- [ ] specs/entities.md — ingen endring (ingen ny persistent datamodell,
      Redis-tellere er forgjengelige)
- [ ] specs/api.yaml, specs/nfr.md, specs/ui-spec.md, specs/flows.md —
      uutfylte maler i hele prosjektet, samme fravalg som CR-012/CR-013

Affected Components:
- Nytt: `src/lib/rateLimit/client.ts`, `rateLimiter.ts`, `getClientIp.ts`
- `src/app/api/admin/auth/login/route.ts` — rate-limit-sjekk lagt til
  først i `POST`-handleren
- `src/app/api/benefits/[slug]/claim-code/route.ts` — samme
- `package.json` — ny avhengighet `ioredis`
- `.env.example`, `specs/architecture.md` — ny `REDIS_URL`-variabel

Database Impact:
- Ingen. Rate-limit-tellere lever kun i Redis, ikke Postgres.

API Impact:
- Begge endepunkter kan nå returnere `429 Too Many Requests` med
  `Retry-After`-header — ny, additiv statuskode. Ingen endring i
  eksisterende `200`/`401`/`404`/`410`/`500`-kontrakter.

UX Impact:
- Admin som taster feil passord 6.+ gang innen 15 minutter ser en
  "for mange forsøk"-melding i stedet for "feil e-post eller passord".
- Sluttbruker som claimer mer enn 20 koder i timen fra samme
  nettverk/IP (f.eks. delt kontor-/mobilnett) kan bli midlertidig
  blokkert — reell risiko for falske positiver bak NAT, se Risks.

Security Impact:
- Direkte formål med denne CR-en: reduserer brute-force- og
  pool-drenerings-risiko.
- Fail-open-valget (punkt 4) er en bevisst avveining mellom
  tilgjengelighet og sikkerhet — dokumentert som risiko, ikke en
  overraskelse.
- `x-forwarded-for` kan i prinsippet forfalskes av klienten hvis
  reverse-proxyen ikke overskriver headeren korrekt — avhenger av at
  Coolify/Traefik er konfigurert til å sette den fra den faktiske
  TCP-forbindelsen, ikke videresende en klient-oppgitt verdi rått.

Performance Impact:
- Ett ekstra nettverkskall (Redis `INCR`+ev. `EXPIRE`+`TTL`) per
  forespørsel til de to endepunktene. Ubetydelig sammenlignet med
  eksisterende Prisma-kall i samme request.

Required Tests:
- [x] Unit: `checkRateLimit` — under grense (allowed=true), på grense,
      over grense (allowed=false), TTL/retryAfter-beregning (mocket
      Redis-klient, samme mønster som `uploadImage.test.ts` i CR-012)
- [x] Unit: `getClientIp` — leser første IP i `x-forwarded-for`, faller
      tilbake til `x-real-ip`, faller tilbake til `'unknown'`
- [x] Unit: login-ruten — 429 ved overskredet grense (mocket rate limiter),
      401 ved feil passord innenfor grensen (uendret eksisterende oppførsel)
- [x] Unit: claim-code-ruten — 429 ved overskredet grense, eksisterende
      dekning (401/404/410/500) uendret
- [ ] Manuell (etter deploy): bekreft at `x-forwarded-for` faktisk
      inneholder ekte klient-IP i Coolify/Traefik-miljøet, ikke en
      intern Docker-nettverks-IP eller `unknown` for alle requests
- [ ] Manuell: trigger faktisk 429 på begge endepunkter i prod, bekreft
      `Retry-After`-header og at forespørsler igjen tillates etter
      vinduet har utløpt

## Acceptance Criteria
- [ ] `POST /api/admin/auth/login` returnerer 429 med `Retry-After` etter
      5 forsøk fra samme IP innen 15 minutter
- [ ] `POST /api/benefits/[slug]/claim-code` returnerer 429 med
      `Retry-After` etter 20 claims fra samme IP innen 1 time
- [ ] Rate-limit-tellere er per IP, ikke globale eller per sesjon
- [ ] Redis-feil logges, men blokkerer IKKE forespørselen (fail-open)
- [ ] Ekte klient-IP bekreftet i prod via `x-forwarded-for` (ikke antatt)
- [ ] Eksisterende oppførsel for begge ruter (200/401/404/410/500) er
      uendret for forespørsler under grensen
- [ ] `.env.example` og `specs/architecture.md` dokumenterer `REDIS_URL`

## Rollback Strategy
Additiv — begge ruter fungerer identisk til i dag for forespørsler under
grensen. Ved problemer: fjern `checkRateLimit`-kallet fra de to rutene
(én kodeblokk hver) — ingen datamigrering. Redis-ressursen i Coolify kan
stå urørt eller slettes uavhengig av kodereversering.

## Migration Strategy
1. Bruker provisjonerer Redis i Coolify (se Infra-checklist) — trengs
   for lokal testing mot ekte Redis, men unit-tester med mocket klient
   kan skrives uavhengig av dette.
2. Implementer og enhetstest `/lib/rateLimit` isolert.
3. Koble inn i login-ruten først (høyest sikkerhetsverdi), verifiser
   manuelt.
4. Koble inn i claim-code-ruten, verifiser manuelt.

## Infra-checklist (brukeroppgave — Claude har ikke tilgang til Coolify/Hetzner)
1. **Provisjonér en Redis-ressurs i Coolify** (samme prosjekt som appen
   og Postgres-instansen).
2. **Sett `REDIS_URL`** som miljøvariabel på app-ressursen i Coolify
   (f.eks. `redis://default:PASSWORD@host:6379`) — aldri i `.env`
   committet til git, aldri limt inn i chat/samtale.
3. **Bekreft at Coolify/Traefik videresender ekte klient-IP** via
   `x-forwarded-for` — sjekk reverse-proxy-konfigurasjonen, ikke bare
   anta det. Uten dette gir rate limiting per IP ingen reell beskyttelse
   (alle requests kan se ut som de kommer fra samme intern-IP).
4. **Smoke test etter deploy**: trigger faktisk 429 på begge
   endepunkter, bekreft normal drift gjenopptas etter tidsvinduet.

## Risks
- **Fail-open ved Redis-nedetid** (se Proposed Solution punkt 4) betyr at
  rate-limit-beskyttelsen faktisk forsvinner om Redis er nede — en
  bevisst tilgjengelighet-over-sikkerhet-avveining for en prototype med
  splitter ny Redis-infrastruktur, ikke egnet å kopiere ukritisk til en
  fremtidig produksjonssetting med høyere trafikk/risiko.
- **`x-forwarded-for` er ikke en garanti** — hvis Coolify/Traefik ikke er
  konfigurert riktig, kan alle klienter se ut som samme IP (rate limiting
  blir da for strengt, treffer alle brukere samtidig) eller headeren kan
  være tom/manipulerbar (rate limiting blir da virkningsløst). Må
  bekreftes i prod, ikke antas fra lokal testing.
- **Falske positiver bak NAT** for claim-code — flere legitime brukere
  bak samme bedrifts-/mobilnett-IP kan i sum passere 20/time uten at
  noen enkelt aktør misbruker systemet. Grensen (20/time) er et forslag,
  ikke en garantert riktig verdi — juster basert på reell trafikk.
- **In-memory/Postgres-alternativene ble vurdert og forkastet** til fordel
  for Redis (se bruker-valg 2026-08-06) — Redis er korrekt selv om appen
  skulle kjøre flere container-instanser senere, i motsetning til
  in-memory-tellere som nullstilles per instans/restart.

## Dependencies
- Ingen avhengighet av andre åpne CR-er.
- Avhenger av brukers Redis-provisjonering (se Infra-checklist) før
  faktisk testing mot ekte Redis kan skje — unit-tester med mocket
  klient kan skrives uavhengig av dette.
