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

## Open Issues

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
Status: Open
Priority: High
Area: package.json / dependencies
Description: `npm ci` (run for the first time with a real local Node install, during CR-011)
  surfaced 12 vulnerabilities (1 critical, 10 high, 1 low), including a known CVE in
  `next@14.2.3` with a patched version available (npm warning references
  nextjs.org/blog/security-update-2025-12-11). Not fixed as part of CR-011 — that CR is an
  infra migration, not a dependency upgrade, and the migration playbook (docs/
  MIGRATION-PLAYBOOK-HETZNER-COOLIFY.md §6) explicitly says to treat a breaking/major
  dependency bump as its own reviewed CR rather than bundling it in.
Blocker for: none yet, but should not be left indefinitely given severity (critical present)
Opened: 2026-08-05
Resolved:
Resolution:

ISSUE-008
Status: Resolved
Priority: Medium
Area: src/app/api/admin/codes/, src/app/admin/(protected)/codes/, src/lib/codes/
Description: Kode-pool-systemet mangler fullstendig fraud prevention og revisjon av admin-UI.
  Konkrete hull identifisert:
  1. Ingen unique constraint på codeValue i Code-tabellen — duplikater kan oppstå ved race conditions selv med app-nivå sjekk (midlertidig fix landed i e893845, men DB-nivå constraint mangler).
  2. Ingen logging/audit trail for kode-tildeling (hvem fikk hvilken kode, tid, sesjon).
  3. Ingen rate limiting på /api/benefits/[slug]/claim-code — én bruker kan forsøke masse claims.
  4. Admin-UI for koder mangler: historikk over tildelte koder, oversikt per sesjon/bruker, mulighet for å deaktivere enkelt-koder.
  5. Ingen varsling ved lav pool-beholdning (lowStockThreshold finnes i schema men brukes ikke til varsling).
Blocker for: produksjon med ekte annonsørkoder (demo-koder OK inntil videre)
Opened: 2026-05-22
Resolved: 2026-05-22
Resolution: CR-009 løste punkt 1 (DB unique constraint), 2 (admin detaljside viser sessionId+assignedAt),
  og 4 (deaktiver enkelt-kode). Punkt 3 (rate limiting) og 5 (varsling) er utsatt til fremtidig CR
  — de krever henholdsvis Redis og e-post-infrastruktur som er out of scope for demo.

## Resolved Issues

ISSUE-007
Status: Resolved
Priority: Medium
Area: consumer app / benefit visibility
Description: Fordelen «gratis kaffe» (ID 3a48a477-a6b2-490c-bba8-2b5842881a50) viste ikke i appen.
Blocker for: prod-demo av «gratis kaffe»-fordelen
Opened: 2026-05-22
Resolved: 2026-05-22
Resolution: Root cause var startsAt=2026-05-22T16:09 UTC — fordelen hadde ikke nådd starttidspunktet da ISSUE ble åpnet (ca. 16:00 UTC). endsAt=2026-05-25 ville dessuten utløpe om 3 dager. Begge felter satt til null via Prisma slik at fordelen alltid er aktiv uten dato-begrensning. Ingen kodeendring nødvendig.

ISSUE-001
Status: Resolved
Priority: High
Area: specs/
Description: Product vision and requirements not yet fully defined.
Blocker for: specs/entities.md, specs/architecture.md, first CR
Opened: 2026-05-20
Resolved: 2026-05-22
Resolution: User delivered 8 PRD documents (docs/01–08) covering full product scope, data model, UX, design tokens, copy and implementation plan.

ISSUE-002
Status: Resolved
Priority: High
Area: specs/requirements.md
Description: OQ-001 — Offer fields unknown.
Blocker for: specs/entities.md, data model, first CR
Opened: 2026-05-20
Resolved: 2026-05-22
Resolution: Full data model defined in docs/05_datamodell_og_api_forslag.txt — 16 tables with all fields.

ISSUE-003
Status: Resolved
Priority: High
Area: specs/requirements.md
Description: OQ-002 — Consumer app auth model unknown.
Blocker for: specs/flows.md, auth architecture, first CR
Opened: 2026-05-20
Resolved: 2026-05-22
Resolution: Defined in docs/03 — three user levels: anonymous, partially known, authenticated. Anonymous browsing always supported.

ISSUE-004
Status: Resolved
Priority: Medium
Area: specs/requirements.md
Description: OQ-003 — Search and filter requirements unknown.
Blocker for: API design, consumer app UX spec
Opened: 2026-05-20
Resolved: 2026-05-22
Resolution: Defined in docs/02 and docs/04 — category filter chips, no free-text search in MVP.

ISSUE-005
Status: Resolved
Priority: Medium
Area: specs/nfr.md
Description: OQ-004 — Performance and availability targets not defined.
Blocker for: specs/nfr.md, infrastructure decisions
Opened: 2026-05-20
Resolved: 2026-05-22
Resolution: Demo context — no formal SLAs. Free-tier Supabase + Vercel Hobby acceptable. Will define for MVP phase.

ISSUE-006
Status: Resolved
Priority: High
Area: specs/
Description: Tech stack not yet selected.
Blocker for: specs/architecture.md, all implementation
Opened: 2026-05-20
Resolved: 2026-05-22
Resolution: Stack selected: Next.js 14 + TypeScript, Supabase (PostgreSQL + Auth + Storage), Prisma ORM, Vercel. See DECISIONS.md.
