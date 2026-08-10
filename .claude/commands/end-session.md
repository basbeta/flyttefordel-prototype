# /end-session

Execute these steps at the end of every session.

## 1. Summarize Completed Work

List:
- Files created or modified
- CRs advanced or closed
- Specs updated
- Tests added
- Validations run

## 2. Update sessions/CURRENT-STATE.md

Update: phase, completed work, in-progress work, active CRs, blockers, next actions.

## 3. Append to sessions/IMPLEMENTATION-LEDGER.md

Add a row for each significant change:
| Date | Session | Area | Changes | Related CR | Validation Status |

## 4. Update sessions/OPEN-ISSUES.md

- Close resolved issues
- Add new issues discovered
- Update priority/status where changed

## 5. Document Risks

List risks, tech debt, assumptions, and unresolved dependencies.

## 6. Document Next Actions

List recommended actions for next session in priority order. Be explicit.

## 7. Archive if Grown (cost control)

If `sessions/IMPLEMENTATION-LEDGER.md` or `sessions/OPEN-ISSUES.md` has
grown past ~40 rows/issues since the last archive, move the oldest
fully-closed entries (Done CRs, Resolved issues with no open follow-up)
to their `*-ARCHIVE.md` sibling file, leave a one-line pointer behind,
and note the move in this session's ledger entry. See CLAUDE.md
"Archiving (cost control)" for the exact rule. Skip this step if neither
file has grown enough to matter.
