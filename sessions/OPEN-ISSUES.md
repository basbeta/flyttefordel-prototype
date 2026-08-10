# OPEN-ISSUES.md

> Updated at the end of every session.

## Format
```
ISSUE-XXX
Status: Open | In Progress | Resolved
Priority: High | Medium | Low
Area: [module or system]
Description: [what is the problem]
Blocker for: [what cannot proceed until resolved]
Opened: YYYY-MM-DD
Resolved: YYYY-MM-DD
Resolution: [how it was resolved]
```

> ISSUE-001 through ISSUE-008 (all Resolved, all from 2026-05-20/22)
> archived to `sessions/OPEN-ISSUES-ARCHIVE.md` (2026-08-10) to keep this
> file cheap to read at every session start. Archive is not read
> automatically — consult only when historical context is needed.

## Open Issues

ISSUE-012
Status: Resolved
Priority: Medium
Area: CR-014 (rate limiting) — arkitekturvalg
Description: CR-014 sin Redis-baserte implementasjon (src/lib/rateLimit,
  wiring i login- og claim-code-rutene) er ferdig kodet, enhetstestet
  (91/91 bestått) og bygger rent — men bruker stilte et arkitekturspørsmål
  midt i økten: kan Coolify sin Traefik-reverse-proxy sin innebygde
  rate-limit-middleware dekke behovet i stedet for en ny
  Redis-avhengighet i appen?
  Tradeoffs diskutert:
  - Traefik: ingen ny infrastruktur/avhengighet, ser ekte klient-IP
    direkte (løser x-forwarded-for-usikkerheten), men konfigurasjonen
    lever i Coolify sitt UI/database — IKKE i denne git-repoen (ingen
    docker-compose/Traefik-labels-fil finnes i prosjektet i dag), noe
    som bryter med prosjektets traceability-prinsipp. Krever to separate
    path-baserte routere (ulike grenser for login vs. claim-code).
    Custom norsk feilmelding i 429-responsen er vanskeligere å gjenskape.
  - Redis (nåværende kode): versjonert, testbar, full kontroll på
    feilmelding/Retry-After, men krever ny infrastruktur (Redis-instans
    i Coolify) og ioredis-avhengighet.
Blocker for: committing/lukking av CR-014
Opened: 2026-08-07
Resolved: 2026-08-07
Resolution: Bruker valgte å beholde Redis-implementasjonen — traceability
  (versjonert konfigurasjon i git) og full kontroll på feilmelding/
  Retry-After veide tyngre enn å unngå ny infrastruktur. Kode committed
  (10d9fd1). Se DECISIONS.md for full begrunnelse. CR-014 gjenstår med
  Infra-checklist (Redis-provisjonering i Coolify) før Done.

ISSUE-011
Status: Open
Priority: Low
Area: claim-code-flyt, lead-innsending, admin dato/tid-visning (CR-011)
Description: To manuelle testpunkter fra CR-011 sin Required Tests-seksjon
  er bevisst akseptert som et kjent gap i stedet for å blokkere at CR-011
  ble markert Done (bruker-beslutning 2026-08-06, se DECISIONS.md):
  1. Full claim-code/lead-innsendingsflyt + CSV-eksport av leads er ikke
     testet i prod på den nye Hetzner/Coolify-plattformen (kun kategori/
     annonsør/fordel-opprettelse er faktisk verifisert).
  2. Visuell bekreftelse av at `/admin/profitability`, `/admin/analytics`,
     `/admin/leads`, `/admin/codes/[poolId]` viser korrekte norske
     klokkeslett (`timeZone: 'Europe/Oslo'`-koden er på plass, men ingen
     unit-test dekker selve formateringen, og ingen har sett den i prod).
Blocker for: ingen kjent blocker — lav risiko i prototype-fase, men bør
  dekkes før en fremtidig produksjonssetting med reelle annonsørkoder/leads
Opened: 2026-08-06
Resolved:
Resolution:

ISSUE-010
Status: Resolved
Priority: Medium
Area: src/app/admin/(protected)/** — alle admin-former (BenefitForm, AdvertiserForm,
  HeroForm, CategoryForm)
Description: Ingen admin-form varsler ved navigering bort (lenke, tilbake-knapp,
  lukk fane) med ulagrede endringer i noe felt — tekst, dropdown, bilde, osv.
  Oppdaget under CR-012-testing (bildeopplasting lastes opp til S3 umiddelbart,
  men selve fordelen/annonsøren/heroen er ikke lagret før admin trykker
  "Lagre"/"Opprett" — ingen indikasjon gis om dette). Bekreftet av bruker som et
  gjennomgående gap i alle formene, ikke unikt for bildeopplasting.
Blocker for: ingen kjent dataintegritetsrisiko (kun UX — admin kan tro noe er
  lagret som ikke er det)
Opened: 2026-08-06
Resolved: 2026-08-06
Resolution: CR-013 løste dette — ny FormSaveBar-komponent (rød pulserende
  dirty-indikator + lagre-knapp, grønn "Lagret"-pille etter suksess) i alle
  fire admin-former, pluss useUnsavedChangesWarning-hook (beforeunload +
  best-effort avskjæring av interne lenkeklikk). Lagring navigerer ikke
  lenger bort fra rediger-sider; opprett-sider navigerer til rediger-siden
  for den nye posten. Kjent, dokumentert begrensning: nettleserens
  tilbake/frem-knapp dekkes ikke.

ISSUE-009
Status: Delvis løst — kritisk fikset, high-restrisiko krever egen fremtidig CR
Priority: High
Area: package.json / dependencies
Description: `npm ci` (run for the first time with a real local Node install, during CR-011)
  surfaced 12 vulnerabilities (1 critical, 10 high, 1 low), including a known CVE in
  `next@14.2.3` with a patched version available (npm warning references
  nextjs.org/blog/security-update-2025-12-11). Not fixed as part of CR-011 — that CR is an
  infra migration, not a dependency upgrade, and the migration playbook (docs/
  MIGRATION-PLAYBOOK-HETZNER-COOLIFY.md §6) explicitly says to treat a breaking/major
  dependency bump as its own reviewed CR rather than bundling it in.
  Oppdatering 2026-08-10 (CR-015): re-kjørt `npm audit` viste 13 sårbarheter (1 kritisk,
  11 high, 1 low — tallet driver over tid som nye advisories publiseres). CR-015 oppgraderte
  `next` 14.2.3→14.2.35 (patch, ikke major) og kjørte `npm audit fix` uten `--force`.
  Resultat: 0 kritisk (var 1), 0 low (var 1), men **8 high gjenstår** — alle tilhører to
  kjeder som begge krever en semver-major-oppgradering: (1) `next`/`postcss` → krever
  `next@16.3.0`, 2 av de 8 er i produksjonsavhengigheter (`npm audit --omit=dev` bekrefter);
  (2) `eslint-config-next`→`glob`/`@typescript-eslint/*`→`minimatch` → krever
  `eslint-config-next@16.3.0`, dev-only (lint-tid), ingen produksjonseksponering.
Blocker for: none yet, men de 2 gjenstående high i produksjon (`next`, `postcss`) bør ikke
  la ligge ubegrenset lenge — vurder en dedikert Next.js 14→15/16-migrerings-CR
Opened: 2026-08-05
Resolved:
Resolution: Delvis — se CR-015 for kritisk-fiksen. Full resolusjon avhenger av en fremtidig,
  egen major-oppgraderings-CR for next (14→15/16) og separat for eslint-config-next.

## Resolved Issues

> ISSUE-001–ISSUE-008 er arkivert, se `sessions/OPEN-ISSUES-ARCHIVE.md`.
