# CR-028: Simulert Vipps-innlogging og person-ID

Status: Implementert, /review PASSED (2026-10-13), IKKE Done: ikke sett i nettleser, migrasjon og seed ikke kjørt mot DB
Approved: 2026-10-13
Created: 2026-10-13

## Business Goal
Gjøre at alle brukere i web og app er innlogget som en kjent person med en stabil intern
person-ID (docs/10 §3.3), uten å vente på ekte Vipps. QA kan logge inn som en testperson med
ulike parametere (bosted, flyttedato, boligtype) og se hva en slik person ville fått. Det er
grunnlaget for utvelgelse per person, A/B-tildeling fra person-ID og senere e-post (docs/10
§4, §5). Innloggingen bygges bak et grensesnitt slik at ekte Vipps kan byttes inn uten å røre
resten.

## Problem Statement
I dag er alt anonymt: en `anon_id`-cookie gir en `UserSession`, og bestillinger (CR-024) er
bare knyttet til sesjon og kontaktfelt. Det finnes ingen person som kan få samme
fordelsutvalg, samme A/B-variant eller samme e-post på tvers av kanaler. Tabellen `users`
finnes, men er ubrukt, og `UserSession.userId` er alltid `null`.

## Proposed Solution

### 1. Innlogging er påkrevd
- All forbrukertrafikk (appen på `/`, `/benefits`, `/saved`, `/nearby`, `/profile` og web-løpet
  `/flytting`) krever innlogget person. Uten innlogging sendes man til `/logg-inn`
  (med `?next=` for å komme tilbake, kun relative stier).
- API-ruter for forbrukere svarer 401 uten innlogging (ikke redirect).
- Unntatt: `/logg-inn`, `/api/auth/*`, `/admin` og `/api/admin` (har egen admin-auth), og
  statiske filer. Admin-innlogging er uendret.
- Innloggingen er en signert, httpOnly cookie (`person_token`, JWT via `jose`, som admin)
  med person-ID og `role: 'person'`. **Gjenbruker `ADMIN_JWT_SECRET`** (bruker, 2026-10-13), ingen
  ny miljøvariabel. Mangler hemmeligheten, feiler innloggingen lukket (ingen tilgang), aldri åpent.
- **Admin-vakten må skjerpes (forutsetning for gjenbruket).** I dag sjekker både `middleware.ts`
  og `verifyAdminJWT` bare signaturen, ikke `role`. Med delt hemmelighet kunne en person logge inn
  som testperson, kopiere sitt token inn i `admin_token`-cookien og få admin. Derfor må begge
  steder kreve `role === 'admin'`, og persontokenet kreves `role === 'person'`. Gjelder også
  `authCheck` i API-rutene hvis den ikke går via `verifyAdminJWT`. Dekkes av tester.

### 2. Grensesnitt og simulert implementasjon
- Ny modul `src/lib/identity` med en kontrakt `IdentityProvider` (hvilke personer kan velges,
  fullfør innlogging, hent person) og én implementasjon `simulatedVipps`. Resten av appen
  kjenner bare kontrakten og en `Person`-type, aldri hvordan innloggingen gjøres.
  Ekte Vipps blir en ny implementasjon av samme kontrakt.
- Valg av leverandør via `IDENTITY_PROVIDER` (default `simulated`).

### 3. Innloggingssiden `/logg-inn`
- Viser **5 seedede testpersoner** som kort med parametrene synlige (navn, bosted/postnummer,
  flyttestatus og flyttedato, boligtype), så QA ser hvilket tilfelle de velger.
- QA **må fylle inn en test-e-postadresse** (påkrevd, validert) før innlogging. Den lagres på
  personen og er adressen fremtidig kommunikasjon (e-post) skal gå til.
- **«Ny testperson»**: skjema for å lage en person med egne parametere (navn, e-post, postnummer,
  flyttestatus, flyttedato, fra- og tiladresse, boligtype) for tilfeller de 5 ikke dekker.
  Nye personer dukker opp i listen for alle QA.
- **«Bytt person»** vises i app og web (logget inn som X) og logger ut til `/logg-inn`.

### 4. De 5 seedede testpersonene (forslag, se åpent punkt 1)
**Databasen er sannhetskilden** (bruker, 2026-10-13). `/logg-inn` leser alltid personene fra
`users`, både de seedede og de QA oppretter, i én liste. De 5 defineres i en seed-fil
(`prisma/seed-test-persons.ts`, `npm run db:seed-persons`, som `db:seed-flow`) og opprettes med
`upsert` på en fast nøkkel (`seedKey`), så person-ID er stabil. Seeden er idempotent og
**oppdaterer flyttedatoene på nytt ved hver kjøring**, så «nylig flyttet» forblir nylig (kjør
seeden på nytt når datoene har blitt gamle). Er listen tom (seed ikke kjørt), viser
`/logg-inn` en tydelig melding i stedet for å feile. Åpenbart fiktive navn og adresser.

| # | Navn (fiktivt) | Postnr | Flyttestatus | Flyttedato | Boligtype |
|---|---|---|---|---|---|
| 1 | Test Nylig-Flyttet | 0150 Oslo | `recently_moved` | 10 dager siden | leilighet |
| 2 | Test Flyttet-Tidligere | 5003 Bergen | `moved_past` | 8 måneder siden | enebolig |
| 3 | Test Ikke-Flytter | 7010 Trondheim | `not_moving` | ingen | rekkehus |
| 4 | Test Ukjent | ingen | `unknown` | ingen | ingen |
| 5 | Test Nord-Norge | 9008 Tromsø | `recently_moved` | 40 dager siden | enebolig |

Flyttedato regnes relativt til seed-kjøringen. Persondefinisjonene (relative dager) ligger i en
ren, testbar modul `src/lib/identity/personas.ts` som seeden bruker.

### 5. Person kobles til sesjon, bestilling og hendelser
- Ved innlogging settes `UserSession.userId`, og sesjonens `postcode`/`movingStatus` fylles fra
  personen, så targeting (`matchesSession`) fungerer uendret for en innlogget person.
- `Order` får nullable `personId`, og skjemaet på oppsummeringssiden forhåndsutfylles fra
  personen (navn, e-post, postnummer). Eldre anonyme ordrer er uendret.
- Hendelser får `userId` fra den innloggede personen (feltet finnes allerede på `BenefitEvent`).

### 6. Personvern
- Testpersoner er fiktive, men **QA-e-postene er ekte persondata**. Vises aldri i logg i
  klartekst, rendres aldri i URL, og returneres ikke fra offentlige endepunkter utover til
  innlogget person selv.
- Telefonnummer brukes ikke (docs/10: aldri telefonnummer i URL).
- Rate limit på innlogging og opprettelse av testperson (Redis, CR-014).

### Utenfor scope (egne CR-er)
- Ekte Vipps, SMS-innlogging og ekte samtykkeskjermbilde.
- A/B-tildeling og utvelgelsesfunksjon (bruker person-ID, men bygges etterpå).
- Faktisk utsending av e-post.
- Admin-visning/administrasjon av testpersoner (rediger, slett).
- App-intro før innlogging (finnes ikke i dag).
- Persondata-regler (sletting, lagringstid) og juridisk avklaring av samtykketekster.
- Én felles flyttefasedefinisjon (docs/10 §3.4). Her brukes eksplisitt `movingStatus`.

## Impact Analysis

Affected Specs:
- [x] specs/entities.md (`User` utvidet, `Order.person_id`)
- [x] specs/api.yaml (`/api/auth/login`, `/api/auth/test-persons`, `/api/auth/logout`, 401 på forbrukerruter)
- [x] specs/flows.md (innlogging, ny testperson, bytt person)
- [x] specs/architecture.md (`/lib/identity`, middleware-gating, ny miljøvariabel)
- [ ] specs/nfr.md
- [ ] specs/ui-spec.md (tom fra før)

Affected Components:
- `src/middleware.ts` (gating, `?next=`, 401 for API, behold anon_id og admin-guard, **admin-guard krever `role === 'admin'`**)
- `src/lib/admin/auth.ts` (`verifyAdminJWT` krever `role === 'admin'`) og `authCheck`/`apiAuth`, med tester
- Ny `src/lib/identity/` (kontrakt, `simulatedVipps`, `personas.ts`, token-signering/-verifisering) + tester
- Ny `prisma/seed-test-persons.ts` og `db:seed-persons` i `package.json`
- Nye ruter `src/app/api/auth/{login,test-persons,logout}/route.ts` + tester
- Ny side `src/app/logg-inn/` (utenfor `(mobile)`/`(web)` så den ikke arver skallene)
- `src/lib/session/index.ts` (koble `userId`, fylle postnummer/status), `src/lib/tracking`
- `src/lib/orders` + `src/app/api/flow/order/route.ts` (`personId`) og `OrderForm` (forhåndsutfylling)
- «Bytt person»-lenke i mobil- og web-skall
- `/api/session/profile` (hva skjer med manuell endring av postnummer for innlogget person, se åpent punkt 4)

Database Impact: Additiv migrasjon. `users` får `seed_key` (unik, nullable), `is_test`
(default false), `from_address`, `to_address`, `housing_type`. `orders` får `person_id`
(nullable FK, ingen kaskade). Ingen bakfylling. `users.email` finnes allerede.

API Impact: Tre nye offentlige auth-ruter. **Alle forbruker-API-er blir 401 uten innlogging**
(brytende for alle som kaller dem anonymt). Admin-API-er uendret.

UX Impact: Alle brukere møter `/logg-inn` først. Ny «Bytt person»-lenke. Bestillingsskjemaet
er forhåndsutfylt.

Security Impact: Ny auth-flate på offentlig URL. Innloggingen er **simulert og gir ingen
ekte identitetsgaranti**: hvem som helst kan velge en person eller lage en ny. Det er akseptert
for prototypen, men må ikke brukes med ekte persondata. Signert cookie med egen hemmelighet,
`next`-parameter begrenset til relative stier (ingen open redirect), zod-validering, rate limit,
ingen e-post i logg. Middleware feiler lukket.

Performance Impact: Én JWT-verifisering per forespørsel i middleware (som admin i dag).
Én `upsert` ved innlogging.

## Acceptance Criteria
- [x] Uten innlogging sendes alle forbrukersider til `/logg-inn`, og forbruker-API-er svarer 401
- [x] `/admin`, `/api/admin` og statiske filer er upåvirket
- [x] Innlogging krever valgt person og gyldig test-e-post, og gir en signert httpOnly cookie
- [x] De 5 testpersonene leses fra databasen, vises med parametrene synlige og får stabil person-ID
      (også etter at seeden kjøres på nytt, som oppdaterer flyttedatoene)
- [x] Tom liste (seed ikke kjørt) gir en tydelig melding, ikke feil
- [x] QA kan opprette en ny testperson, som deretter kan velges av alle
- [ ] «Bytt person» logger ut og tar tilbake til `/logg-inn`
- [x] Innlogget person styrer targeting (postnummer og flyttestatus) i appen og web-løpet
- [x] Bestilling og hendelser knyttes til personen, og bestillingsskjemaet forhåndsutfylles
- [x] `?next=` godtar bare relative stier
- [x] Mangler `ADMIN_JWT_SECRET`, gir ingen tilgang (feiler lukket)
- [x] Et persontoken gir **ikke** tilgang til admin (middleware, sider og API), og et admintoken gir ikke personinnlogging
- [x] Ingen e-post i logg eller URL
- [x] `specs/*` er oppdatert før kode
- [x] `npx tsc --noEmit`, `npx vitest run`, `npm run lint` og `npm run build` er grønne

## Required Tests
- [x] Unit: token-signering/-verifisering (gyldig, utløpt, manipulert, manglende hemmelighet),
      `next`-validering, persona-definisjoner (relative datoer), `simulatedVipps`, seed-logikk
      (idempotent upsert på `seedKey`, datoene oppdateres ved ny kjøring)
- [x] Integration (mocket Prisma): login (valgt person + e-post → cookie, session.userId satt,
      ugyldig e-post 400, ukjent person 404, rate limit 429), opprett testperson (validering,
      begrensninger), logout
- [x] Integration: middleware (redirect, 401 for API, unntak, gyldig cookie slipper gjennom,
      admin uendret)
- [x] Integration: **kryss-bruk avvises**: persontoken i `admin_token` gir ikke admin (middleware,
      `verifyAdminJWT`, API-auth), admintoken i `person_token` gir ikke personinnlogging
- [x] Integration: ordre får `personId`, hendelser får `userId`, targeting bruker personens data
- [ ] Manuell i nettleser: logg inn som hver av de 5, lag en ny testperson, bytt person, kjør
      gjennom en bestilling og se at forhåndsutfylling og utvalg stemmer

## Rollback Strategy
Revert commit(s). Migrasjonen er additiv og kan bli liggende (kolonnene er nullable/har
default). **Kjører rett på master:** revert og push gir ny deploy, og login-muren forsvinner da.
Brukere som allerede er logget inn mister ingenting, siden anon_id-sesjonen fortsatt finnes.

## Migration Strategy
Additiv migrasjon, kjøres av Coolify ved deploy (som tidligere CR-er). Ingen bakfylling,
eksisterende anonyme sesjoner og ordrer er uendret. Ingen ny miljøvariabel (gjenbruker `ADMIN_JWT_SECRET`, som allerede er satt i Coolify). Etter deploy og migrasjon må **`npm run db:seed-persons`
kjøres mot prod-databasen** (som `db:seed-flow`), ellers er innloggingslisten tom. Kjøres på nytt
når flyttedatoene har blitt gamle.

## Risks
- **Direkte på master med påkrevd innlogging:** forbrukerappen på prod låses bak `/logg-inn`
  i samme øyeblikk deployen går ut. Alle som har lenken (demo, kolleger) må velge en person.
  Mitigering: bygg i små committer, push først når alt er grønt og hemmeligheten er satt.
- **Delt JWT-hemmelighet mellom admin og person.** Trygt bare så lenge begge vakter sjekker
  `role`. Glemmer en fremtidig vakt rolle-sjekken, gir et persontoken admin. Mitigering: sentral
  verifiseringsfunksjon per rolle og tester som viser at kryss-bruk avvises. Alternativ om det
  blir for skjørt: egen hemmelighet senere.
- **Skjerping av admin-vakten er en endring i auth-kritisk kode**, og eksisterende admin-tokens
  uten `role` (hvis noen finnes) slutter å virke. Admin-token signeres med `role: 'admin'` i dag,
  så innloggede admin-brukere berøres ikke.
- **Simulert innlogging er ikke sikkerhet.** Ikke bruk med ekte persondata. Navn og adresser
  er fiktive, QA-e-poster er ekte og regnes som persondata.
- **Seed-steg før første innlogging.** Hvis `db:seed-persons` ikke er kjørt mot prod, er
  innloggingslisten tom og ingen kommer inn før seeden er kjørt (QA kan likevel lage en ny
  testperson). Seedede flyttedatoer eldes: «nylig flyttet» slutter å være nylig til seeden kjøres på nytt.
- **Delt persona, delt e-post.** Hvis e-posten lagres på personen og to QA velger samme
  persona, overskriver siste innlogging den første (se åpent punkt 2).
- **Offentlig opprettelse av testpersoner** kan fylle databasen med støy. Rate limit demper det,
  admin-opprydding er utenfor scope.
- **Persondata-reglene mangler** (sletting, lagringstid, samtykketekster). E-post lagres nå på
  `users` uten avklart slettepolicy. Samme åpne punkt som CR-024.
- **Middleware-endring i auth-kritisk kode** som treffer all trafikk. Dekkes av
  middleware-tester, men ikke av komponent- eller ende-til-ende-tester.
- **`middleware.ts` er deprecated i Next 16** (se CR-018). Vi bygger videre på den nå, flytting
  til `proxy.ts` er egen CR.
- **Ingen lokal `DATABASE_URL`.** Flyten testes mot mocket Prisma og verifiseres manuelt i prod.

## Antakelser (docs/12: merkes tydelig)
- Persondatafeltene på en testperson (adresser, boligtype) er fiktive og valgfrie utenom navn,
  e-post og flyttestatus.
- Boligtype er en liten fast liste i kode (enebolig, leilighet, rekkehus, annet). Listen er en gjetning.
- Cookie-levetid 30 dager. Gjetning for prototypen.
- Vipps gir i virkeligheten ikke boligtype, den spørres eksplisitt (docs/11). Simuleringen
  setter den på personen for enkelhets skyld.
- Én flyttestatus per person (`UserMovingStatus`), ikke utledet fra dato.

## Avklarte punkter (bruker, 2026-10-13: «anbefalt på alle»)
0. **Avklart (2026-10-13):** personene ligger i databasen, seed via `npm run db:seed-persons`,
   datoene oppdateres ved ny kjøring.
1. **Avklart: de 5 personene i tabellen i §4 beholdes.**
2. **Avklart: test-e-posten lagres på personen** (siste innlogging vinner).
3. **Avklart: opprettelse av testperson er åpen** for alle på `/logg-inn`, med rate limit.
4. **Avklart: profilsiden er skrivebeskyttet for innloggede** (postnummer og status eies av personen, bytt person i stedet).
5. **Avklart (2026-10-13):** gjenbruker `ADMIN_JWT_SECRET`, med skjerpet rolle-sjekk i admin-vakten.

## Dependencies
Bygger på CR-003 (sesjon), CR-014 (rate limiting), CR-020 (hendelser), CR-024 (bestilling) og
den eksisterende `User`-modellen. Åpner for A/B-tildeling og utvelgelse per person.

## Implementation Notes (2026-10-13)
- Alle fem åpne punkter avklart («anbefalt på alle»), pluss to valg underveis: personene ligger i
  databasen (seed `npm run db:seed-persons`, datoene oppdateres ved ny kjøring), og `ADMIN_JWT_SECRET`
  gjenbrukes (ingen ny miljøvariabel).
- **Admin-vakten skjerpet** (forutsetning for delt hemmelighet): `verifyAdminJWT` og `middleware.ts`
  krever `role === 'admin'`, personToken krever `role === 'person'`. Testet begge veier, også at et
  persontoken i `admin_token`-cookien avvises. Uten dette kunne en testperson kopiere sitt token inn i
  admin-cookien og få admin.
- Ny `src/lib/identity/`: `token.ts` (edge-safe, jose), `safeNext.ts`, `types.ts` (kontrakten
  `IdentityProvider`), `simulatedVipps.ts` (bare `is_test`-rader kan listes og logges inn på),
  `personas.ts` (de 5), `schemas.ts`, `linkSession.ts`, `current.ts`, `labels.ts`, `safeErrorLabel.ts`.
- Middleware setter `x-person-id` fra den verifiserte tokenen og fjerner alltid en klientsendt verdi.
  Server-kode leser den (hendelser får `userId`, ordre `personId`).
- Gjenbrukte `User`/`UserSession.userId` i stedet for ny `Person`-tabell. Migrasjon
  `20261013000000_cr028_persons` er additiv (5 kolonner på `users`, `orders.person_id`), SQL fra
  `prisma migrate diff`, IKKE kjørt mot DB.
- **Funn under /review:** (1) `err.message` fra Prisma kan inneholde spørringen med e-posten, så
  innloggingsruten logger nå bare feilnavn og kode (`safeErrorLabel`), som bestillingsruten. (2) Hvis
  `anon_id` slettes mens innloggingen er gyldig, fikk personen en tom sesjon og feil targeting:
  `getOrCreateSession` kobler nå sesjonen til personen på nytt (testet).
- `/api/session/profile` svarer 403 (profilen er skrivebeskyttet). `ProfileForm` er fjernet, profilsiden
  viser personen og «Bytt person».
- Rate limits er gjetninger: innlogging 30 per 15 min, ny testperson 10 per time (per IP).
- Validering: tsc OK, lint 0 feil (3 gamle advarsler), vitest 502/502 (opp fra 394, 108 nye), build OK.
- **Ikke gjort:** UI ikke sett i nettleser, migrasjon og seed ikke kjørt mot DB, ingen komponenttester.
- **Før/etter push:** ingen ny miljøvariabel. Etter deploy kjøres `npm run db:seed-persons` mot prod
  (ellers tom liste, QA kan fortsatt lage ny testperson). Hele forbrukerappen ligger bak `/logg-inn`
  fra deploy.

## Prod-sjekk på HTTP-nivå (Claude, 2026-10-13, etter deploy av c6ccaee)
Utført med curl mot prod (nettleserutvidelsen var ikke koblet til, så ingen UI er sett):
- Login-mur: alle forbrukersider redirecter til `/logg-inn` (med `next`), forbruker-API-er gir 401. `/logg-inn`, `/manifest.json`, `/admin/login` er åpne, `/admin/benefits` utlogget redirecter til `/admin/login`.
- Migrasjonen er kjørt: `/logg-inn` leser `users` uten feil og viser «Ingen testpersoner finnes ennå» (seed ikke kjørt).
- Ny testperson (201), innlogging (200, `person_token` httpOnly), ugyldig e-post (400), ukjent person (404).
- Innlogget: `/`, `/benefits`, `/saved`, `/profile`, `/flytting` og oppsummering virker. Profilsiden viser personen og «Bytt person». `PATCH /api/session/profile` gir 403.
- Et persontoken (som `admin_token` og som `person_token`) gir IKKE admin. Forfalsket `x-person-id` uten innlogging gir 401. Etter logout redirecter `/` til `/logg-inn`.
- **Ikke testet:** UI visuelt, de 5 seedede personene (seed ikke kjørt), bestilling (ville opprettet en ekte lead i prod), at targeting følger personen, `next`-redirect i nettleseren, admin positivt (krever passord).
- Rad igjen i prod-databasen: testpersonen «Test Claude-Sjekk» (fiktiv e-post `claude-sjekk@example.test`, id b815561b-8e55-47fd-a95a-123cdf5b227e). Kan slettes direkte i DB.

## E2E-agent (2026-10-13)
Test-agenten (`.claude/agents/e2e-tester.md`, `scripts/qa/smoke.py`) kjørte mot prod: suiten 77 av 77 bestått, pluss utforskning. Funn:
- **Rettet:** `movedAt: "2026-02-31"` ble lagret som 2026-03-03 (JS Date ruller over). Valideringen sammenligner nå tilbake (`schemas.ts`), med tester. Ikke deployet ennå.
- **Rate limit virker ikke i prod** (ca. 35 innlogginger og ca. 12 testpersoner uten 429). Eget issue, ISSUE-013 (CR-014 sin Redis-infra). Ikke en feil i CR-028-koden, men gjør at grensene i denne CR-en ikke er i kraft.
- **Uavklart, akseptert for prototypen:** fremtidig flyttedato (2099) og postnummer 0000 aksepteres. Bestillingsruten godtar skjemadata som ikke stemmer med innlogget person (skjemaet er redigerbart, `personId` settes fra innloggingen). Siste innlogging overskriver test-e-posten, så to QA på samme persona stjeler hverandres e-post (som bestemt).
- **Bevist:** persontoken gir ikke admin, manipulerte/tomme/alg:none-tokens avvises, `x-person-id` kan ikke forfalskes (heller ikke med gyldig innlogging), `next` saneres (server-HTML), XSS-navn rendres escapet, targeting følger postnummer (0150 gir 2 lokale Oslo-fordeler som 9008 ikke får).
- **Ikke testet:** UI visuelt, utløpt token, admin positivt, hvilken person ordre/hendelser fikk i DB, innlogging som ikke-testperson.
- **Testdata i prod som bør ryddes:** flere «Test QA-…»-personer (bl.a. én med XSS-navn som vises i listen på /logg-inn, og én med postnummer 0000, én med år 2099) og 4 bestillinger (`@example.test`).

