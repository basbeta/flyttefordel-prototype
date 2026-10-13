# DECISIONS.md

> Append-only. Document every significant architectural or governance decision.

## Format
```
DATE: YYYY-MM-DD (replace with actual date)
DECISION: [short title]
CONTEXT: [why was this needed]
DECISION: [what was decided]
ALTERNATIVES CONSIDERED: [what else was evaluated]
RATIONALE: [why this option]
CONSEQUENCES: [what this enables or constrains]
DECIDED BY: human | Claude | both
```

## Decisions

DATE: 2026-08-27
DECISION: Rekonsiliert session-filer etter en avbrutt økt; committed CR-017 separat fra dokumentasjonsoppdateringen
CONTEXT: Session-oppstart (steg 1-5) avdekket at `sessions/CURRENT-STATE.md` var vesentlig utdatert i forhold til faktisk repo-tilstand: CR-017 (skrive-sperre mot ugyldig Aktiv/Planlagt-status) lå ferdig implementert, testet og delvis staged i arbeidskatalogen — men CR-017.md, testfiler og en ny `vitest.config.mts` var untracked, og ingen session-fil nevnte CR-017 i det hele tatt. Samtidig var CR-018 (Next.js 16-major-oppgradering) allerede committed OG pushet til `origin/master` (e7cc47c) uten at noen session-fil reflekterte det — CURRENT-STATE.md beskrev fortsatt ISSUE-009 som kun "delvis løst". En tidligere økt ble tydelig avbrutt før `/end-session` ble kjørt.
DECISION: (1) Verifiserte CR-017 sitt arbeid selv før commit — leste diffene for alle tre API-rutene og UI-komponenten linje for linje mot CR-017 sin Proposed Solution/Acceptance Criteria, kjørte `tsc`/`vitest`/`build` på nytt. (2) Committed CR-017 (3ec4625) som en isolert commit adskilt fra sesjonsdokumentasjonen — ikke pushet, avventer brukerens bekreftelse siden push trigger Coolify-deploy. (3) Oppdaterte CR-017.md, CR-018.md, CURRENT-STATE.md, OPEN-ISSUES.md (ISSUE-009 markert Resolved) til å reflektere faktisk tilstand. (4) La til CR-019 (Approved, ikke implementert) i sporingen. (5) Ba bruker eksplisitt om retning før noe ble committed, i stedet for å anta.
ALTERNATIVES CONSIDERED: Starte ny CR-implementasjon direkte oppå den udokumenterte, uncommittede CR-017-koden — forkastet, ville brutt traceability-prinsippet ytterligere og risikert å miste eller feilrepresentere ferdig arbeid. Committe CR-017 sammen med session-dokumentasjonsoppdateringen i én commit — forkastet til fordel for separate commits, slik at CR-017 sin kode-historikk er ren og ikke blandet med governance-bokføring (samme mønster som CR-016 sine to separate commits e906eb8/390e844).
RATIONALE: CLAUDE.md krever at Claude stopper og flagger inkonsistens mellom orchestration-filene og faktisk tilstand, fremfor å stille anta at CURRENT-STATE.md er korrekt. Uverifisert "ferdig" kode fra en tidligere økt kan ikke committes blindt — reell verifisering (lese diff, kjøre tester selv) er nødvendig før traceability-kravet i CLAUDE.md er reelt oppfylt, ikke bare påstått.
CONSEQUENCES: Master er nå 1 commit foran origin/master (CR-017, ikke pushet). To brukeroppgaver gjenstår: bekreft push av CR-017, og smoke-test CR-018 sin allerede-deployede Next.js 16-oppgradering i prod. Fremtidige økter bør ikke anta at CURRENT-STATE.md er fullstendig hvis `git log`/`git status` antyder committed-men-udokumentert eller uncommitted-men-testet arbeid — kryssjekk alltid mot faktisk git-tilstand ved usikkerhet.
DECIDED BY: both (bruker valgte "Finish & commit CR-017" fra tre alternativer, Claude utførte og dokumenterte)

DATE: 2026-08-10
DECISION: Reduser kostnaden ved sesjons-workflowen i CLAUDE.md — arkiver gammel historikk, innfør Micro-CR-mal
CONTEXT: Bruker spurte om sesjonskostnad (token/API-kostnad) og ba deretter om å "scrappe de kostbare skillene" i sesjons-workflowen. `sessions/IMPLEMENTATION-LEDGER.md` (append-only, lest i sin helhet ved hver `/start-session`) hadde vokst til 201 linjer og vokser for alltid. `sessions/OPEN-ISSUES.md` hadde på samme måte samlet full historikk for lukkede issues fra mai 2026. CR-015 (en ren versjonsbump) genererte i tillegg ~180 linjer full CR-mal med impact-analyse — ceremoni som ikke matchet endringens størrelse.
DECISION: (1) Arkiverte Session-1–9/CR-001–010-radene fra IMPLEMENTATION-LEDGER.md til ny `IMPLEMENTATION-LEDGER-ARCHIVE.md`. (2) Arkiverte ISSUE-001–008 fra OPEN-ISSUES.md til ny `OPEN-ISSUES-ARCHIVE.md`. Begge arkiv er ikke lest automatisk ved sesjonsstart. (3) La til en Micro-CR-mal (4 linjer: What/Why/Risk/Rollback) i `/create-cr` for trivielle/mekaniske endringer. (4) Presiserte i CLAUDE.md at "aktive CR-er" i Session Startup steg 3 betyr status ≠ Done, ikke alle historiske CR-filer. (5) La til en arkiveringsregel (~40 rader/issues-terskel) i CLAUDE.md og `/end-session` slik at arkivering skjer løpende fremover, ikke bare denne ene gangen.
ALTERNATIVES CONSIDERED: Fjerne sesjons-workflowen helt — forkastet, bruker presiserte at det spesifikt var kostnaden ("de kostbare skillene"), ikke selve traceability-prinsippet, som var problemet. Rullerende vindu (behold kun siste N rader uansett CR-status) — forkastet i favør av å arkivere etter "fullstendig lukket"-kriterium, som er mer forutsigbart og aldri risikerer å arkivere noe som fortsatt er relevant.
RATIONALE: Arkivering etter lukket-status (ikke rad-antall) bevarer full traceability (ingenting slettes, kun flyttet) samtidig som den brutte den ubegrensede veksten i obligatorisk lesing per sesjon. Micro-CR-malen retter opp mismatchen mellom endringsstørrelse og dokumentasjonsceremoni uten å svekke traceability for reelle endringer (full mal er fortsatt default ved usikkerhet).
CONSEQUENCES: Sesjonsstart-lesingen gikk fra ca. 792 til ca. 598 linjer for de fem kjernefilene, og vokser ikke lenger ubegrenset — gammel, lukket historikk flyttes ut i stedet. Fremtidige sesjoner må huske å konsultere `*-ARCHIVE.md`-filene ved behov for historisk kontekst (de er ikke lenger i standard-leseflyten). Micro-CR-er må oppgraderes til full mal manuelt hvis en "triviell" endring viser seg å ha reell risiko underveis.
DECIDED BY: human (forespørsel), Claude (forslag til konkret løsning, godkjent av bruker)

DATE: 2026-08-10
DECISION: CR-015 begrenset til patch-oppgradering av next (14.2.3→14.2.35), major-oppgradering (15.x/16.x) utsatt til egen fremtidig CR
CONTEXT: ISSUE-009 (åpnet 2026-08-05) flagget en kritisk CVE-sekk i `next@14.2.3` samt 10 andre høy/lav-sårbarheter. `npm audit` viste at en patch-oppgradering til `next@14.2.35` fjerner den kritiske sårbarheten, men at 2 gjenstående high-alvorlighetssårbarheter i produksjon (`next`, `postcss`) og 4 dev-only-sårbarheter (`eslint-config-next`-familien) først løses av en semver-major-oppgradering (`next@16.3.0` / `eslint-config-next@16.3.0`).
DECISION: Implementer kun patch-oppgraderingen i CR-015 (fjerner det kritiske funnet). La de gjenstående high-sårbarhetene stå som kjent, akseptert restrisiko i ISSUE-009 (status endret til "delvis løst") inntil en dedikert major-oppgraderings-CR vurderes.
ALTERNATIVES CONSIDERED: Kjøre `npm audit fix --force` for å ta alle sårbarheter i samme CR — forkastet fordi det ville dratt inn en Next.js 14→16-major-oppgradering (reelle breaking changes, bl.a. i Middleware/routing) uten egen impact-analyse, i strid med CLAUDE.md-regelen om at major-oppgraderinger er egne, reviewte CR-er.
RATIONALE: Den kritiske sårbarheten var det akutte problemet og lot seg løse uten breaking changes. En major-oppgradering av Next.js er en betydelig større endring som fortjener egen impact-analyse, egen testrunde og egen brukergodkjenning — ikke noe som skal snikes inn via en sikkerhetspatch-CR.
CONSEQUENCES: Produksjonen kjører fortsatt med 2 kjente high-alvorlighets Next.js/postcss-CVE-er til en fremtidig major-migrerings-CR gjennomføres. Risikoen er dokumentert (ikke skjult) i ISSUE-009 og CR-015. Bør ikke stå ubegrenset lenge, men er akseptabelt for en prototype-fase uten høyt trafikkvolum.
DECIDED BY: Claude (foreslått i CR-015-utkast, ingen innvending fra bruker ved godkjenning)

DATE: 2026-08-07
DECISION: Behold Redis-basert rate limiting for CR-014, ikke bytt til Traefik-middleware
CONTEXT: CR-014 sin Redis-implementasjon (src/lib/rateLimit, wiring i login- og claim-code-rutene) var ferdig kodet og enhetstestet (91/91) da bruker spurte om Coolify sin Traefik-reverse-proxy sin innebygde rate-limit-middleware kunne dekke behovet i stedet, og ba om å ikke committe før dette var avklart (ISSUE-012).
DECISION: Behold Redis-implementasjonen som allerede var skrevet. Committed som 10d9fd1.
ALTERNATIVES CONSIDERED: Traefik-middleware — ingen ny app-avhengighet, ser ekte klient-IP direkte uten å stole på x-forwarded-for. Forkastet fordi konfigurasjonen ville leve i Coolify sitt UI/database, ikke i git (bryter prosjektets traceability-prinsipp, jf. CLAUDE.md), krever to separate path-baserte routere med ulike grenser, og gjør en custom norsk 429-feilmelding vanskeligere å gjenskape.
RATIONALE: Versjonert, testbar konfigurasjon med full kontroll på feilmelding og Retry-After veier tyngre enn å unngå én ny infrastrukturavhengighet (Redis), spesielt i et prosjekt som eksplisitt prioriterer traceability og deterministiske arbeidsflyter.
CONSEQUENCES: Ny Redis-avhengighet (ioredis) og Redis-instans må provisjoneres i Coolify (se CR-014 Infra-checklist) før CR-014 kan markeres Done. x-forwarded-for-usikkerheten (kan forfalskes/feilkonfigureres av reverse-proxy) består og må verifiseres manuelt i prod, i motsetning til Traefik-alternativet som ville sett ekte klient-IP direkte.
DECIDED BY: human

DATE: 2026-08-06
DECISION: To gjenstående manuelle testpunkter i CR-011 akseptert som kjent gap, ikke blokkerende for Done
CONTEXT: CR-011 sin Required Tests-seksjon hadde to uverifiserte punkter: (1) full claim-code/lead-innsendingsflyt + CSV-eksport i prod, (2) visuell bekreftelse av norsk tidssone på 4 admin-sider. Kun kategori/annonsør/fordel-opprettelse var faktisk testet i prod.
DECISION: Aksepter begge som et kjent, dokumentert gap i CR-011. Ikke blokkerende for at CR-011 markeres Done.
ALTERNATIVES CONSIDERED: Utføre testene før CR-011 lukkes — forkastet av bruker i favør av å lukke CR-en nå og heller dekke gapet senere (ved neste CR som rører disse flytene, eller en dedikert smoke-test-runde).
RATIONALE: Prototype-fase, lav risiko ved en uverifisert visningsdetalj eller flyt som uansett kan rettes raskt hvis den skulle vise seg å ha en feil.
CONSEQUENCES: Regresjon i claim-code/lead-flyten eller tidssone-visning kan forbli uoppdaget til en bruker faktisk trigger den i prod. Dokumentert i CR-011 Required Tests som en åpen, bevisst aksept — ikke en påstått fullført test.
DECIDED BY: human

DATE: 2026-08-06
DECISION: Backup (daglig pg_dump + "Backup Now"-verifisering) fjernet fra CR-011 sitt scope
CONTEXT: CR-011 sin infra-checklist krevde opprinnelig daglig pg_dump-backup til objektlagring, verifisert med "Backup Now", som forutsetning for å markere CR-011 Done. Dette var det siste gjenstående punktet før CR-011 kunne fullføres.
DECISION: Fjern backup-kravet fra CR-011 sine akseptansekriterier og infra-checklist. Ikke blokkerende for at CR-011 markeres Done. Bruker avgjør selv om en eventuell allerede opprettet backup-jobb i Coolify skal skrus av — det er en handling i Coolify-konsollet, ikke noe Claude utfører.
ALTERNATIVES CONSIDERED: Beholde backup-jobben i Coolify (lav kostnad, allerede opprettet), men droppe kravet om å verifisere den for CR-011 sin skyld — forkastet av bruker i favør av å fjerne kravet helt fra CR-en.
RATIONALE: Appen er en prototype/demo, ikke produksjonsdata med et reelt gjenopprettingsbehov. Samme resonnement som feilsporing-beslutningen samme dag (se under).
CONSEQUENCES: Ingen automatisert gjenopprettingsmulighet ved datatap i denne fasen. Kan gjeninnføres som egen, fremtidig CR ved overgang til MVP/produksjon med reelle annonsørdata.
DECIDED BY: human

DATE: 2026-08-06
DECISION: Feilsporing (Sentry-kompatibel, f.eks. Bugsink) fjernet fra CR-011 sitt scope
CONTEXT: CR-011 sin infra-checklist krevde opprinnelig Sentry-kompatibel feilsporing med https-DSN, verifisert med én bevisst testfeil, som forutsetning for å markere CR-011 Done. Uptime-monitoring (Uptime Kuma) ble i samme økt bekreftet aktiv på nytt domene.
DECISION: Fjern feilsporingskravet fra CR-011 sine akseptansekriterier og infra-checklist. Ikke blokkerende for at CR-011 markeres Done.
ALTERNATIVES CONSIDERED: Beholde kravet med lavere prioritet i OPEN-ISSUES.md (ikke blokkerende, men fortsatt et uttalt mål) — forkastet siden bruker eksplisitt ikke ønsket det som et stående mål akkurat nå.
RATIONALE: Bruker vurderer at appens nåværende trafikkvolum/risikoprofil (demo/tidlig MVP) ikke rettferdiggjør å sette opp og drifte et eget feilsporingsverktøy nå.
CONSEQUENCES: Uventede runtime-feil i prod fanges kun via de eksisterende JSON-feilresponsene (try/catch per API-rute, CR-011) og manuell observasjon — ingen sentralisert feilsporing/varsling. Kan gjeninnføres som egen, fremtidig CR om trafikkvolum eller driftsrisiko øker.
DECIDED BY: human

DATE: 2026-08-06
DECISION: Egen, separat S3-bucket for opplastede bilder — ikke gjenbruk av backup-bucketen
CONTEXT: Under CR-012-planlegging oppga bruker bucket-navnet `basbeta-backup` for den nye bildeopplastingsfunksjonen. Dette er samme bucket-navn som CR-011 satte opp for daglige `pg_dump`-backups (objektlagring, se CR-011 Infra-checklist). CR-012 sitt design krever at bilder-bucketen er offentlig lesbar (bilder vises uten auth i forbrukerappen), mens en backup-bucket normalt bør være privat siden `pg_dump`-filer kan inneholde persondata (leads) og andre sensitive DB-innhold.
DECISION: Bruk en ny, dedikert bucket (`basbeta-pub-object-storage`) for opplastede bilder. Backup-bucketen (`basbeta-backup`) forblir uendret og privat.
ALTERNATIVES CONSIDERED: Dele `basbeta-backup` med bildene under et eget prefiks (f.eks. `uploads/`) — forkastet fordi det ville krevd enten å gjøre hele bucketen offentlig lesbar (eksponerer backup-filene) eller finjustert per-prefiks-tilgangskontroll (mer kompleksitet enn en enkel S3-klient-konfigurasjon tilsier for denne appens skala).
RATIONALE: Separate buckets med separate tilgangsnivåer (privat for backup, offentlig lesbar for bilder) er den enkleste måten å unngå å blande sensitiv og offentlig data, uten ekstra kode for finjustert tilgangskontroll.
CONSEQUENCES: Bruker må opprette `basbeta-pub-object-storage` som ny bucket i Coolify (se CR-012 Infra-checklist) med egen access key/secret, begrenset til denne bucketen. Samme S3-endepunkt (`https://fsn1.your-objectstorage.com`) og region (`fsn1`) gjenbrukes.
DECIDED BY: both

DATE: 2026-08-05
DECISION: Behold Prisma 5.x for CR-011, ikke oppgrader til Prisma 7 selv om det ville løst Alpine/OpenSSL-krasjen
CONTEXT: Under Coolify-deploy crash-loopet containeren fordi Prisma 5.x sin native schema-engine-binær ikke fant libssl i node:22-alpine. Effektbibliotek (søsterprosjekt, Prisma 7.x med driver-adapter-arkitektur) traff aldri dette problemet med identisk Dockerfile — sannsynlig fordi Prisma 7 er mindre avhengig av native binærfiler.
DECISION: Fiks krasjen med `apk add --no-cache openssl` i Dockerfilen (liten, reversibel endring) i stedet for å oppgradere til Prisma 7 nå.
ALTERNATIVES CONSIDERED: Oppgradere til Prisma 7 for å eliminere hele feilklassen permanent — forkastet for nå, siden det er en major-versjon-oppgradering med reelle breaking changes (PrismaClient-konstruksjon endres til å bruke en eksplisitt driver-adapter/pg.Pool i stedet for kun en connection-string), og krever egen CR med impact-analyse per CLAUDE.md sin regel om at major-versjon-oppgraderinger ikke skal bundles inn i annet arbeid.
RATIONALE: Den minimale fiksen (én linje i Dockerfilen) løser det akutte problemet uten å introdusere ny risiko midt i en pågående infra-migrering. En Prisma 7-migrering er en fornuftig fremtidig CR, men bør vurderes isolert.
CONSEQUENCES: CR-011 forblir smalt scopet. En fremtidig CR bør vurdere Prisma 5→7-oppgradering, spesielt hvis flere native-binær-relaterte driftsproblemer dukker opp.
DECIDED BY: both

DATE: 2026-05-22
DECISION: Tech stack valgt for demo-fase
CONTEXT: Prosjektet er i demo-fase. Stack må støtte rask utvikling, gratis hosting, og enkel migrering til Bas/Postens infrastruktur for MVP og produksjon.
DECISION: Next.js 14 + TypeScript (app router), Supabase (PostgreSQL + Auth + Storage), Prisma ORM, Vercel (Hobby).
ALTERNATIVES CONSIDERED: Neon (DB uten pausing) + separat auth; lokal PostgreSQL + Docker; Firebase.
RATIONALE: Supabase gir database + auth + storage i én gratis tjeneste. Prisma abstraherer DB-laget slik at bytte til annen PostgreSQL-leverandør kun krever ny connection string. Next.js + Vercel er industristandard for slik PWA-arkitektur. Free tier er tilstrekkelig for demo.
CONSEQUENCES: Supabase-prosjekt pauser etter 1 uke uten aktivitet på gratis plan — håndteres med wake-on-visit pattern (fjernes til MVP). All forretningslogikk er DB-agnostisk via Prisma. Migrering til annen infrastruktur krever kun nye miljøvariabler og Prisma-konfigurasjonsendring.
DECIDED BY: human + Claude

DATE: 2026-05-22
DECISION: Demo bygges migrasjonsvennlig med kommentarer
CONTEXT: Kodebasen skal porteres fra free-tier demo til Bas/Postens infrastruktur (MVP) og videre til fullskala produksjon.
DECISION: Kode kommenteres eksplisitt der infrastrukturvalg (Supabase-spesifikke features, free-tier workarounds) påvirker implementasjonen. Repository pattern brukes for all DB-tilgang. Ingen vendor lock-in i forretningslogikk.
ALTERNATIVES CONSIDERED: Bygge uten migrasjonstanke, refaktorere senere.
RATIONALE: Eksplisitt dokumentasjon og løse koblinger reduserer migreringskostnad betydelig. Kommentarer gjør det enkelt for mennesker å verifisere og porte kode.
CONSEQUENCES: Noe ekstra kommentararbeid under utvikling. Betaler seg ved migrering.
DECIDED BY: human

DATE: 2026-05-22
DECISION: Multi-admin via kommaseparert env var
CONTEXT: Demo-fase trenger to admin-brukere (kvinnesland@gmail.com og calle.duvdal@bas.no) med samme passord. DB-basert AdminUser-tabell er overkill for demo.
DECISION: ADMIN_EMAILS env var aksepterer kommaseparert liste. validateAdminCredentials sjekker om epost er i listen. Felles passord via ADMIN_PASSWORD.
ALTERNATIVES CONSIDERED: To separate env vars (ADMIN_EMAIL_2); DB-basert lookup.
RATIONALE: Enklest mulig løsning for demo. Erstattes med DB-basert auth ved MVP uansett (dokumentert i auth.ts).
CONSEQUENCES: Alle admin-brukere deler passord. Akseptabelt for demo-fase.
DECIDED BY: human + Claude

DATE: 2026-05-22
DECISION: Targeting evalueres i minne, ikke i SQL
CONTEXT: TargetingRule har JSON-felter (postcodes, postcodeRanges, movingStatuses) som er vanskelige å filtrere i Prisma uten raw SQL.
DECISION: Hent alle aktive fordeler/heroer med targeting-relasjoner inkludert, evaluer matchesSession() i Node.js etter henting.
ALTERNATIVES CONSIDERED: Raw SQL WHERE-klausul; Prisma $queryRaw.
RATIONALE: Antall aktive fordeler forventes under 500 for demo. In-memory evaluering er enklere, testbar som ren funksjon, og tilstrekkelig ytelse. Kan byttes til SQL-filter ved behov uten API-endringer.
CONSEQUENCES: Ytelsesgrense ved stort fordelsvolum (10 000+). Ikke relevant for demo.
DECIDED BY: Claude

DATE: 2026-05-20
DECISION: Adopt governed AI-native repository structure
CONTEXT: AI-assisted development across multiple sessions requires explicit session continuity, change traceability, and governance to prevent architectural drift.
DECISION: Implement full governance structure with CLAUDE.md, session orchestration, CR system, review system, and agent roles.
ALTERNATIVES CONSIDERED: Ad-hoc prompting; rules-only approach.
RATIONALE: Ad-hoc prompting loses context between sessions. Explicit structure makes AI behavior deterministic and auditable.
CONSEQUENCES: All changes require a CR. Sessions start and end with orchestration file updates.
DECIDED BY: human

DATE: 2026-10-12
DECISION: CR-019 løses med en delt hook (`useDirtyTracking`), ikke fire inline-fikser
CONTEXT: CR-019 beskrev begge alternativer som akseptable (punkt 3 i Proposed Solution var valgfritt). Samme copy-paste-mønster fantes byte-identisk i fire admin-skjemaer.
DECISION: Trekk dirty-/«Lagret»-sporingen ut i `src/lib/admin/useDirtyTracking.ts` som også wrapper `useUnsavedChangesWarning`. Baseline og saved-snapshot holdes i `useState`. Hooken eksponerer `markSaved(payload, showBadge)`.
ALTERNATIVES CONSIDERED: Fire identiske inline-fikser — forkastet fordi det gjenskaper duplisering og risikerer at én fil driver fra de andre.
RATIONALE: Én implementasjon, én ren testbar funksjon (`deriveDirtyState`), og repoet mangler komponenttest-infrastruktur så logikken måtte trekkes ut for å kunne enhetstestes.
CONSEQUENCES: «Lagret»-badgen avledes av snapshot-likhet og vises igjen hvis feltet redigeres tilbake til lagret verdi (tidligere forble den borte til neste lagring). Nye admin-skjemaer skal bruke hooken, ikke gjenskape ref-mønsteret.
DECIDED BY: human (godkjente delt hook), Claude (design)

DATE: 2026-10-13
DECISION: Simulert Vipps gjenbruker `ADMIN_JWT_SECRET` og `User`-tabellen, og testpersonene ligger i databasen
CONTEXT: CR-028 krever påkrevd innlogging i prototypen med stabil person-ID, bygget så ekte Vipps kan byttes inn. Tre valg: hvor personene lagres, hvilken hemmelighet cookien signeres med, og om det trengs en ny `Person`-tabell.
DECISION: (1) De 5 testpersonene og de QA oppretter ligger i `users` (ny `is_test`/`seed_key`), seedet med `npm run db:seed-persons` som oppdaterer flyttedatoene ved hver kjøring. (2) Person-tokenet signeres med `ADMIN_JWT_SECRET`, og både admin- og personvakt sjekker `role`. (3) Eksisterende `User`/`UserSession.userId` brukes, ikke en ny tabell.
ALTERNATIVES CONSIDERED: Personene definert i kode og upsertet ved innlogging (slapp seed-steget, men to kilder i listen og ikke redigerbart). Egen `PERSON_JWT_SECRET` (ekte skille, men nytt steg i Coolify og risiko for å låse alle ute). Ugjennomsiktig token i DB (ingen hemmelighet, men databasekall i middleware, som kjører i edge-runtime der Prisma ikke virker).
RATIONALE: DB som kilde gir én liste og samme mønster som `db:seed-flow`. Delt hemmelighet er akseptabelt bare med rolle-sjekk begge veier. Uten den kunne en testperson kopiere sitt token inn i `admin_token`-cookien, siden admin-vakten tidligere bare sjekket signaturen. Det ble funnet og fikset i denne CR-en.
CONSEQUENCES: Én lekkasje av `ADMIN_JWT_SECRET` gir nå både admin- og personinnlogging. En fremtidig vakt som glemmer rolle-sjekken åpner admin for et persontoken (mitigert av sentrale verifiseringsfunksjoner og kryss-bruk-tester). Seed må kjøres mot prod, og kjøres på nytt når flyttedatoene har blitt gamle. Simulert innlogging er ikke sikkerhet og skal ikke brukes med ekte persondata. Test-e-poster er ekte persondata uten avklart slettepolicy.
DECIDED BY: both (bruker valgte DB og gjenbruk av hemmeligheten, Claude fant og fikset rolle-sjekk-hullet)

DATE: 2026-10-13
DECISION: E2E-test-agent og smoke-suite kjøres mot den kjørende appen før brukeren bes teste
CONTEXT: Etter CR-028 ble Claude bedt om å teste selv før brukeren testet manuelt. Nettleserutvidelsen var ikke koblet til, så testen ble gjort med curl mot prod, og det viste seg raskt og nyttig (fant bl.a. at deployen ikke var ferdig). Brukeren: det er en prototype, ufarlig å opprette/fjerne bestillinger og testpersoner og å logge inn, og agenten kan få egen admin-innlogging.
DECISION: (1) Ny agent `.claude/agents/e2e-tester.md` (ikke en CR: ren tooling/governance, ingen app-kode, samme kategori som 2026-08-10). (2) Deterministisk suite `scripts/qa/smoke.py` (HTTP, kun stdlib) som dekker login-mur, personer, bestilling, token/roller og admin. (3) CLAUDE.md «Required Behavior»: kjør e2e-tester etter deploy FØR brukeren bes teste, og rapporter hva som er bevist og ikke testet. (4) Admin-innlogging for agenten kommer fra miljøvariabler eller gitignorert `.env.qa` (mal `scripts/qa/qa.env.example`), opprettet av brukeren. Aldri i chat, repo eller rapporter. (5) Snever lokal tillatelse i `.claude/settings.local.json` (gitignored) for suiten og curl mot prod-domenet.
ALTERNATIVES CONSIDERED: Bare nettleserstyring via Chrome-utvidelsen (avhenger av at utvidelsen er koblet, passord skal ikke skrives i nettleservindu). Passord gitt til Claude i chat (havner i transcript). Delt `settings.json` med tillatelser (ville gitt hele teamet samme rettigheter).
RATIONALE: Deterministisk skript gir samme sjekker hver gang og lav kostnad, agenten utforsker det som er nytt. Innlogging via API med legitimasjon fra miljøet omgår ikke autentisering og holder passordet ute av samtalen.
CONSEQUENCES: Testen skriver testdata i prod-databasen (testpersoner, bestillinger, leads) siden det ikke finnes testmiljø. Det finnes ingen sletting, så data hoper seg opp inntil videre. Rate limits (per IP) begrenser hvor ofte suiten kan kjøres. En grønn suite beviser bare det suiten sjekker, UI er fortsatt ikke sett visuelt. Admin-del er av til brukeren har lagt inn `.env.qa`. Observasjon utenfor scope: `validateAdminCredentials` faller tilbake til et hardkodet standardpassord hvis `ADMIN_PASSWORD` ikke er satt (src/lib/admin/auth.ts), bør vurderes i egen CR.
DECIDED BY: both (bruker ba om agenten og ga rammene, Claude utformet løsningen)

DATE: 2026-10-13
DECISION: Redis og rate limiting utsettes til helt på slutten av prototypen
CONTEXT: E2E-testen av CR-028 viste at rate limiting ikke virker i prod (ISSUE-013): REDIS_URL/Redis er trolig aldri satt opp i Coolify, så CR-014 sin Infra-checklist er ufullført. Koden er fail-open, så appen virker, men grensene (admin-innlogging 5 per 15 min, personinnlogging, opprettelse av testperson, bestilling, claim-code) er ikke i kraft.
DECISION: Bruker bestemte at vi ikke forholder oss til Redis før HELT på slutten. CR-014 blir stående som Implementert (ikke Done) og ISSUE-013 som Open, men utsatt og lav prioritet. Ikke ta det opp som anbefalt neste steg, og e2e-testeren skal ikke rapportere manglende 429 som funn.
ALTERNATIVES CONSIDERED: Sette opp Redis i Coolify nå (løser både ISSUE-013 og CR-014, men er infra-arbeid brukeren ikke vil prioritere i prototypefasen). Bytte til Traefik-middleware (avvist tidligere, se 2026-08-07).
RATIONALE: Prototype uten ekte brukerdata. Brukeren vil ha fokus på funksjonalitet, og det er ufarlig at testdata og innlogginger er ubegrensede.
CONSEQUENCES: Admin-innlogging har ikke vern mot gjetting, og kombinert med standardpassord-fallbacken i validateAdminCredentials (src/lib/admin/auth.ts) er admin så sterk som ADMIN_PASSWORD alene. Offentlige ruter (ny testperson, innlogging) kan fylles med støy. Må gjøres før noe annet enn en prototype med fiktive data, og før ekte brukere eller ekte annonsørdata.
DECIDED BY: human
