# CLAUDE.md — AI Operating Model

> This file is read automatically by Claude Code at session start.
> It defines how Claude must behave in this repository.

---
## Project Initialization — First Run Only

When Claude Code is opened in this project for the first time, check all files in `sessions/` for the placeholder `YYYY-MM-DD`.

If the placeholder is found, replace every occurrence with today's actual date before doing anything else.

Files to check:
- `sessions/CURRENT-STATE.md`
- `sessions/IMPLEMENTATION-LEDGER.md`
- `sessions/OPEN-ISSUES.md`
- `sessions/DECISIONS.md`
- `sessions/ARCHITECTURE-STATE.md`

How to detect first run: if `sessions/CURRENT-STATE.md` contains `YYYY-MM-DD`, this is an uninitialized project. Replace all placeholders, save the files, then proceed with normal session startup.

## Session Startup — Required Steps

Before ANY implementation work, Claude MUST:

1. Read `sessions/CURRENT-STATE.md`
2. Read `sessions/OPEN-ISSUES.md`
3. Read active change requests in `/change-requests` — "active" means
   `Status` is anything other than `Done` (Draft, Approved, Implementert,
   etc.), not every CR file that has ever existed. CRs already marked
   `Done` are historical record, not required reading, unless the current
   task specifically touches the area they describe.
4. Read impacted specs in `/specs`
5. Validate architecture consistency against `sessions/ARCHITECTURE-STATE.md`
6. Produce an explicit implementation plan and present it before proceeding

If any of these files are missing or incomplete, stop and flag it.

`sessions/DECISIONS.md` and `sessions/ARCHITECTURE-STATE.md` are read at
startup, but `sessions/IMPLEMENTATION-LEDGER.md` and
`sessions/OPEN-ISSUES.md` may each have a sibling `*-ARCHIVE.md` file —
older, closed history moved there to keep the main file cheap to read
every session. Archives are consulted only on demand (a task needs
historical detail on a specific old CR/issue), never read automatically.

---

## Session Shutdown — Required Steps

At the end of EVERY session, Claude MUST:

1. Update `sessions/CURRENT-STATE.md`
2. Append completed work to `sessions/IMPLEMENTATION-LEDGER.md`
3. Update `sessions/OPEN-ISSUES.md`
4. Document architectural decisions in `sessions/DECISIONS.md`
5. Document unfinished work and blockers
6. Document risks introduced
7. Document recommended next actions

Archiving (cost control): if `sessions/IMPLEMENTATION-LEDGER.md` or
`sessions/OPEN-ISSUES.md` has grown large (as a rule of thumb, more than
~40 rows/issues since the last archive), move the oldest fully-closed
entries (Done CRs, Resolved issues with no open follow-up) to their
`*-ARCHIVE.md` sibling, leave a one-line pointer behind, and note the
archive move in that session's ledger entry. Never archive an entry that
is still Open/In Progress or that a current issue references.

---

## Forbidden Behavior

Claude MUST NEVER:

- Implement undocumented changes (no CR = no change)
- Violate module boundaries defined in `specs/architecture.md`
- Bypass validation scripts in `/validation`
- Skip review checklists in `/reviews`
- Duplicate abstractions that already exist
- Silently change architecture
- Refactor unrelated systems during feature work

---

## Required Behavior

Claude MUST ALWAYS:

- Maintain full traceability (CR → spec → code → test)
- Update orchestration files at session end
- Add tests for every new behavior
- Document risks and assumptions explicitly
- Preserve modular boundaries
- Reference the active CR in every commit message

---

## Agent Roles

| Task | Agent file |
|---|---|
| Architecture decisions | `.claude/agents/architect.md` |
| API / backend work | `.claude/agents/backend.md` |
| UI / frontend work | `.claude/agents/frontend.md` |
| Code review | `.claude/agents/reviewer.md` |
| Security review | `.claude/agents/security.md` |
| Testing / QA | `.claude/agents/qa.md` |

---

## Commands

| Command | Purpose |
|---|---|
| `/start-session` | Load state, identify blockers, generate plan |
| `/end-session` | Summarize work, update all orchestration files |
| `/create-cr` | Create a new change request — Full template with impact analysis, or Micro template for trivial/mechanical changes |
| `/review` | Run full review checklist |
| `/implement` | Begin implementation from an approved CR |

---

## Architecture Principles

1. Maintainability
2. Explicitness — no implicit behavior
3. Traceability — every change has a paper trail
4. Modularity — clear boundaries between layers
5. Deterministic workflows — same input = same process
6. Low architectural drift
7. Safe refactoring
8. Long-term AI collaboration
