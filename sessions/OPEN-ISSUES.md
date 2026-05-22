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

ISSUE-007
Status: Open
Priority: Medium
Area: consumer app / benefit visibility
Description: Fordelen «gratis kaffe» (ID 3a48a477-a6b2-490c-bba8-2b5842881a50) vises ikke i appen. Fordelen er synlig i admin på /admin/benefits/3a48a477-a6b2-490c-bba8-2b5842881a50. Årsak ikke bekreftet.
Sannsynlige årsaker (i prioritert rekkefølge):
  1. Status ≠ active (kan stå som draft/scheduled/paused)
  2. Targeting-regel med includeUnknownLocation: false og bruker uten postnummer
  3. startsAt i fremtiden eller endsAt passert
Blocker for: prod-demo av «gratis kaffe»-fordelen
Opened: 2026-05-22
Resolved: —
Resolution: —

## Resolved Issues

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
