# OPEN-ISSUES-ARCHIVE.md

> Archived issues from `sessions/OPEN-ISSUES.md` (ISSUE-001 through
> ISSUE-008 — all Resolved, all from 2026-05-20/22, no open follow-ups).
> Not read automatically at session start — consult only when historical
> context on these closed issues is needed. See `sessions/OPEN-ISSUES.md`
> for the current, actively-read issue list (ISSUE-009 onward).

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
