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
