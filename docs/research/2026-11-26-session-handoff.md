# Session handoff: real platform connectors (26 November 2026)

Read this first in the next conversation. It holds everything needed to resume without re-deriving context.

## 1. Where things stand

- Spec: `docs/research/2026-11-23-real-data-connectors-feasibility.md`. Decisions are in §15, the identity design in §16, the database choice in §17.
- Plan: `docs/superpowers/plans/2026-11-23-real-platform-connectors.md`. It has phases 0–9, gates G0–G9, runbooks R1–R8, and a two-engineer split in Part C.
  - Engineer A is Ibrahim (`mibrahimm1`): the platform core.
  - Engineer B is Affan, the owner: connectors, UI, every runbook and the live runs.
- `mvp/v1-continuity` is at `37ab6310`, which is the spec and plan only. It's pushed and in sync with origin. No product code from this initiative is on it yet.
- `docs/clients/` is untracked on purpose. The owner said to leave it out of commits.

## 2. Ibrahim's work: `origin/sync_engineer_repo` (needs Engineer B's review)

There are 14 commits, dated 25 November, based exactly on `37ab6310`, so the branch fast-forwards cleanly. It isn't merged. Under plan C.5, Engineer B reviews before anything joins `mvp/v1-continuity`.

### 2.1 What it covers

| Plan task | Commit(s) | Status |
|---|---|---|
| 0.A shared contracts | `5ba50b38` | done |
| 1.1 fixtures into the test harness | `1e1829fe` | done |
| 1.2 no database, no server; demo seeding removed | `e3d77648`, `8fdd0bbd`, `911e668e` | done (seed scripts deleted, e2e and pg seed through test helpers) |
| 1.3 Google sandbox token | `600c8ce6` | done by A, although Part C assigned it to B |
| 1.5 bootstrap users | `037eb87e` | backend half only. The commit title says "dev sign-in uses real test-org users", but the frontend `session.tsx` is untouched. That half is B's. |
| 1.7 provenance check | `07fd4bf6` | done, but its pg test is broken (see 2.2) |
| 2.2 identity_link migration 009 | `7cd67f35` | done |
| 2.3 graded automatic linking | `e91ad5a2`, `3cf20c64` | done |
| 2.5 structural account hook and autoLink pipeline | `78c522cb`, `995b88f6` | core half only. See the failure in 2.2. |
| 2.6 attribution through links | `decd2532` | done |

### 2.2 Verification run on 26 November (detached checkout of `decd2532`)

- `backend` type check: clean. `frontend` type check: clean.
- Backend unit tests: 61 files, 475 tests, all passing.
- Postgres suite (`PG_TEST_URL` = local `horquva_test` on port 5433): 53 of 55 pass. Two fail deterministically, and also fail when run alone:
  1. `tests/pg/provenance.test.ts`, "correctly filters backed entities…": `invalid input syntax for type json`. The test inserts `config_encrypted = 'enc'` into a JSONB column. This is a test bug. The provenance code is never reached, so Task 1.7 is not yet proven on Postgres.
  2. `tests/pg/connectors.test.ts`, "queues n8n accounts nobody in the directory matches…": expected `u2` to be queued, got `[]`. This is a real gap. `identity/syncHook.ts` now selects only `kind === 'account'`, but `connectors/n8n/index.ts:134` still emits `kind: 'person'`. On this branch, unmatched n8n accounts are never queued. B's half of Task 2.5 (the n8n and ai_admin connectors emit `account:<source>:<id>`) closes it.
- Not run: Playwright e2e.

### 2.3 Process deviations to raise with Ibrahim

- He pushed a shared task branch instead of using local `a/<task>` branches fast-forwarded after review (plan C.5). It works, but agree on one way of working.
- Phase 2 started before G0 (B's phase 0) and G1 (A presents phase 1) were approved. The plan's critical path says G1 and 0.A come before Phase 2.
- He did B's Task 1.3. That's harmless, but lanes should be kept, or changed explicitly.

## 3. Engineer B's queue, in order

1. Review `origin/sync_engineer_repo`. Ask Ibrahim to fix the provenance pg test. Decide whether to fast-forward now (with the n8n gap known) or after your Task 2.5 connector half lands.
2. R1: turn off "Anyone with the link" on the credentials sheet. Rotate the GitHub PAT and GitHub App key, the Supabase secret and the Jira token. Ask Hanain (n8n URL and owner key), Anas (Slack bot token), Sohaib (Entra client secret), Umair (Groq, Make, Zapier), and whoever has `/shared/` (ground truth, workflow inventory, simulate scripts).
3. Phase 0: Tasks 0.1 probe, 0.2 email overlap, 0.3 run, then G0.
4. Phase 1, B half: 1.4 (Entra invented job titles), 1.5 UI (dev role switcher from env, remove the fake offline session), 1.6 (delete `/showcase`). Then G1 together with A.
5. Phase 2, B half:
   - 2.1 UI (icons and labels for account, repository, project)
   - 2.4 (people keyed `person:entra:<objectId>`, aliases from `proxyAddresses`)
   - 2.5 connectors (n8n and ai_admin emit accounts)
   - 2.7 UI (identity queue, bulk confirm)

   Every UI change starts with a text mockup that the owner approves.

## 4. How to run the checks locally

- Unit: `cd backend && npm test`
- Postgres:
  ```
  PG_TEST_URL=postgresql://<user>:<pass>@localhost:5433/horquva_test npm run test:pg
  ```
  The database name must end in `_test`, because the suite wipes it. The local server is PG18 on port 5433. Never point it at Supabase.
- Type checks: `npx tsc --noEmit -p backend` and `cd frontend && npx tsc --noEmit`. The backend build compiles `tests/`, so a test type error breaks the Render build.
- e2e: `cd frontend && npx playwright test`. It needs a Postgres database whose name ends in `_e2e`.

## 5. Open points carried forward

- Phase 10, customer onboarding, was proposed and not yet added to the plan: tenant-wide Entra consent, Jira OAuth, GitHub and Slack apps customers install themselves, an admin setup screen, a per-partner deployment runbook, and a data-handling checklist.
- Phases 4–7 should be reordered once the design partner and their stack are known.
- Confirm whether the October n8n defects D1–D7 were fixed by `6b145ee3`.

## 6. Prompt to start the next conversation

> Read docs/research/2026-11-26-session-handoff.md. Then help me review Ibrahim's branch origin/sync_engineer_repo against the plan and start Engineer B's queue.
