# /create-cr

Execute these steps to create a new Change Request.

## 0. Pick a Size

Before gathering information, classify the change:

- **Micro** — mechanical/trivial, no application-code behavior change:
  dependency version bumps, config-only tweaks, doc/typo fixes, lockfile
  updates. Use the Micro Template (step 5) and skip straight to writing
  the file — no need to interview yourself through the full Impact
  Analysis for a one-line version bump.
- **Full** — anything that changes application behavior, adds/removes a
  feature, touches the data model, or has non-obvious risk/rollback
  considerations. Use steps 1-4 below and the Full Template.

When unsure, prefer Full — the cost of over-documenting a borderline
change is much lower than silently under-documenting a real one.

## 1. Gather Information

Ask:
1. Business goal — what problem does this solve?
2. Proposed solution — high-level, what changes?
3. Which specs are affected?
4. Is this a breaking change?

## 2. Perform Impact Analysis

Analyze and document:
- Affected modules
- Specs that must update before code
- Database impact
- API impact
- UX impact
- Security impact
- Performance impact
- Required tests

## 3. Create CR File

Create `/change-requests/CR-XXX-short-title.md` using the template below.
Assign the next available CR number.

## 4. Full Template

```
# CR-XXX: [Title]

Status: Draft
Created: YYYY-MM-DD

## Business Goal
## Problem Statement
## Proposed Solution

## Impact Analysis

Affected Specs:
- [ ] specs/entities.md
- [ ] specs/api.yaml
- [ ] specs/flows.md
- [ ] specs/architecture.md
- [ ] specs/nfr.md
- [ ] specs/ui-spec.md

Affected Components:
Database Impact:
API Impact:
UX Impact:
Security Impact:
Performance Impact:

## Acceptance Criteria
- [ ]

## Required Tests
- [ ] Unit:
- [ ] Integration:

## Rollback Strategy
## Migration Strategy
## Risks
## Dependencies
```

## 5. Micro Template

For Micro-classified changes only (see step 0). Create
`/change-requests/CR-XXX-short-title.md` with just this:

```
# CR-XXX: [Title]

Status: Draft
Created: YYYY-MM-DD
Type: Micro

## What
[One or two sentences: exact change, e.g. "Bump next 14.2.3 -> 14.2.35"]

## Why
[One sentence: what problem this fixes]

## Risk
[One or two sentences: what could break, or "none — mechanical change"]

## Rollback
[Usually: "revert commit" — say so if it's more involved]
```

If, while working through a Micro CR, you discover real behavior change,
non-trivial risk, or a need for impact analysis — stop and upgrade it to
the Full Template instead of forcing the finding into a micro-sized box.
