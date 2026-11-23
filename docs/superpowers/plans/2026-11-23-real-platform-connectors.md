# Real Platform Connectors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The MVP reads the Horquva-on-Horquva test org only from real platforms (Entra, n8n, Slack, Jira, GitHub), with no fabricated data anywhere in the runtime. Each person has one canonical identity, and every finding can be traced to raw API evidence.

**Architecture:** Keep the existing connector SDK. That means encrypted connection config, `ReadOnlyHttpGuard`, `raw_payload` landing, SCD2 `persistSync`, and pg-boss hourly syncs. Remove every fixture and seed path from the runtime, and move the fixtures into the test harness. Introduce `account` entities and an SCD2 `identity_link` table, so people are anchored on directory ids and tool accounts attach to people through graded links. Add three trust guards before any new connector: a coverage-drop guard, response-schema validation, and grade rules. Then add Slack, Jira and GitHub connectors, OAuth-grant detection for Make and Zapier, and reliability and scale fixes. Deploy to the existing demo deployment with a new Supabase database.

**Team:** Two engineers working by layer, as set out in Part C.

- Engineer A (Ibrahim) owns the platform core: runtime data paths, identity, trust guards, sync engine, migrations.
- Engineer B (Affan, also the owner) owns connectors, probes, the frontend, every platform runbook and the live runs.

Every task names its owner in Part C.

**Tech Stack:** Node 22, TypeScript 5.9, Express 4, zod, pg, pg-boss, vitest, Next.js frontend, Playwright e2e, Supabase Postgres (session pooler), Render, Vercel.

**Spec:** `docs/research/2026-11-23-real-data-connectors-feasibility.md` (decisions in §15, identity design in §16, database in §17). Read it before any task.

## Global Constraints

- Branch: commit only on `mvp/v1-continuity`. Commit after every task. Push only after the owner approves a phase gate. Never merge into or open a PR against another branch.
- No fabricated data in runtime code. Nothing under `backend/src` or `frontend/{app,features,lib,components}` may contain or load fixture people, seed data, default placeholder values for missing API fields, or fake tokens. Fixtures are allowed only under `backend/tests/**`, `frontend/tests/**` and `frontend/e2e/**`, and may be loaded only by the test harness.
- When an integration fails, the real error is shown. A failure is recorded on `sync_run.error_message` or in `errorReasons` and on `connection.last_error`, with the platform's actual message and secrets redacted (`describe()` in `runner.ts`). No substitute data.
- Connectors are read-only. The only non-GET request allowed is the token exchange through `guard.postTokenRequest` (Task 3.3), to allow-listed token hosts.
- Evidence grades:
  - `stated`: only fields that literally name an owner or status (spec §11.2 T2).
  - `inferred`: anything derived from permissions or activity.
  - `confirmed`: only a human action.
  - `unknown`: absent or hidden. Never coerced to false.
- Identity: people are keyed `person:entra:<objectId>`. Tool accounts are `account:<source>:<platform id>`. An account attaches to a person only through an active `identity_link`.
- Coverage guard: if any resource type's count drops by more than 20% against the last completed sync of the same connection, nothing is closed. The run records `visibilityDropped`, and an admin must accept it (Task 3.1).
- Sync cadence:
  - Structure: hourly.
  - GitHub contributor stats and CODEOWNERS: daily.
  - Freshness: a connection is stale after 3 missed hourly syncs.
- `raw_payload`: store only when the payload hash changes. Prune unchanged duplicates older than 30 days.
- Secrets:
  - Never in chat, commits, logs or test snapshots.
  - Local platform credentials for scripts live only in `backend/.env.connectors`, which is gitignored.
  - Scripts print statuses, never values.
- UI: every new or changed screen is first proposed to the owner as a text mockup and built only after approval. Do not screenshot or browser-verify. The owner checks visuals.
- Out of scope: Outlook and Gmail mailboxes, Supabase (interns' project), Docker, ngrok, Ollama, outbound Slack alerts (A12–A14), and Jira issues or Slack messages as entities.
- `backend` `tsc` compiles `tests/`. Any test type error breaks the Render build, so run `npx tsc --noEmit -p backend` before every commit.
- After every task that changes code, run `graphify update .` from the repo root (CLAUDE.md).
- Test commands:
  - backend unit: `cd backend && npm test`
  - backend Postgres: `cd backend && npm run test:pg`
  - frontend unit: `cd frontend && npm test`
  - e2e: `cd frontend && npx playwright test`

## Review Focus

1. A token that silently loses access to part of the data. The sync returns fewer users, channels or repos with no error, and must not close real edges. Pinned in Task 3.1, test `coverage drop of 21% skips closing and records visibilityDropped`.
2. A person whose email changes in Entra. They must remain one person, with all their edges. Pinned in Task 2.4, test `email change keeps the same person entity and edges`.
3. An automatic email match colliding with a confirmed human link. It must never replace or duplicate the confirmed link. Pinned in Task 2.3, test `automatic match never overrides a confirmed link`.
4. A documented-nullable field (Jira `emailAddress`, Entra `mail`) coming back null. It must become an `unknown` value or a fallback that is explicitly documented, never a default string. Pinned in Task 1.4 (`missing jobTitle and department produce no description`) and Task 5.2 (`hidden Jira email yields account with no email and queues it`).
5. A platform that is unreachable or returns 401 at sync time. The UI and `sync_run` must show the platform's real error, and the graph must keep the last good data. Pinned in Task 8.4, test `revoked credential: failed run, nothing closed, last_error set`.

---

## Part A: Phases and human approval gates

Each phase ends at a gate. Nothing after a gate starts until the owner approves it in chat. The owner is Affan. "Me" in the runbooks is the implementing agent.

| Gate | After | The owner approves | Evidence presented |
|---|---|---|---|
| G0 | Phase 0 (liveness) | The list of working, missing and expired platforms. The Jira backup convention (Q9). Whether n8n must be rebuilt. The alias plan for mismatched emails. | `docs/test-org/phase0-results.md` |
| G1 | Phase 1 (fabricated data removed) | The diff of removed paths. Test suite green. The e2e suite runs on test-only seed. | Test output, list of deleted files |
| G2 | Phase 2 (identity model) | The identity design as built. The text mockup of the identity queue. | pg test output, queue mockup |
| G3 | Phase 3 (trust guards and the extended Entra connector) | Entra and n8n syncing locally against the live test org. A1/A2 counts. | Count comparison table vs platform UIs |
| G4 | Phase 4 (Slack) | Slack synced. Identity match rate. A4 counts. | Counts and match report |
| G5 | Phase 5 (Jira) | Jira synced. A5 counts. OPS backup result. | Counts and ownership report |
| G6 | Phase 6 (GitHub) | GitHub synced. A3 counts. Queue linking done by the owner. | Counts and queue state |
| G7 | Phase 7 (grant detection) | Which Make and Zapier grants are visible. | Grant report |
| G8 | Phase 8 (reliability and scale) | Failure drills pass. | Drill log |
| G9 | Phase 9 (deploy and validate) | Switch the demo deployment to the live test org. Final validation report. | Validation report vs ground truth |

## Part B: Runbooks for human admin steps

The owner does these. I write the exact clicks at the time, because consoles change. The checklist below is the fixed part: what must be true when each runbook is done. I verify each one with a GET-only probe (Task 0.1).

**R1: Lock the sheet and collect credentials (before Phase 0).**

1. In OneDrive, under Manage access, remove "Anyone with the link".
2. Rotate the GitHub PAT and the GitHub App private key, the Supabase secret key (interns' project) and the Jira token. These are the high-value ones exposed in the sheet. New values go only into `backend/.env.connectors`.
3. Ask the account creators for missing credentials. None of these are in the sheet:
   - Hanain: the n8n URL and owner API key.
   - Anas: a Slack bot token, or admin access to the Slack app.
   - Sohaib: the Entra app registration client secret.
   - Umair: Groq, Make and Zapier, for the record only.
4. Ask whoever has `/shared/` for the `master.csv`, `spof-list.md`, per-platform ground-truth CSVs, `workflow-inventory.md`, `simulate-changes.py`, `simulate-failures.py` and `failure-injection-guide.md` files.

Done when the link sharing is off, the rotated values are in the env file, and there is a list of what was received and what is missing.

**R2: Entra app registration for the connector (Phase 3).**

App registration named `horquva-connector` in the test tenant. Single tenant. A client secret with expiry of at most 6 months, recorded in Settings, not the sheet. Microsoft Graph application permissions:

- `User.Read.All`
- `Group.Read.All` (the docs list `Group-NestingSupport.ReadWrite.All` as least privileged, which looks wrong; we request `Group.Read.All` and verify)
- `GroupMember.Read.All`
- `Application.Read.All`
- `User-LifeCycleInfo.Read.All` (for `employeeLeaveDateTime`)

Admin consent granted by the Global Admin. Then add aliases: for each roster person whose Jira, GitHub or Slack signup email differs from their UPN, add that address to their user's `otherMails` in the Entra admin centre. The list comes from Task 0.3's overlap report.

Done when the probe gets 200 on `/users?$top=1`, `/groups?$top=1`, `/applications?$top=1` and `/users/{id}/directReports`.

**R3: Slack app (Phase 4).**

On the existing Horquva Slack app, or a new one named `horquva-connector`, add bot scopes:

- `users:read`
- `users:read.email`
- `channels:read`
- `groups:read`

Reinstall to the workspace. Invite the bot to every private channel that should be visible. Done when the probe gets `ok:true` from `auth.test`, and `users.list` returns `profile.email`.

**R4: GitHub App (Phase 6).**

Use the existing App, whose id is in the sheet, or create `horquva-connector`. Organization permissions: Members read. Repository permissions:

- Metadata read
- Contents read (for CODEOWNERS)
- Administration read (for collaborators)

Install it on the test org for all repositories. Done when the probe can mint an installation token and `GET /orgs/{org}/members` returns 200.

**R5: Jira (Phase 5).**

Create an unscoped API token on the account that is a Jira site admin, with expiry 365 days. Record the expiry date in `docs/test-org/credential-expiry.md`, with no values. Check what plan the site is on and how many users it has. During G0, open the OPS project and one other project, and tell me where a "backup" was recorded (project role, component lead, or description).

Done when the probe gets 200 on `/rest/api/3/myself` and on `/rest/api/3/project/search`.

**R6: n8n on Render (Phase 3, only if G0 finds the original gone).**

- A Render web service from the official `n8nio/n8n` image, plus a Render Postgres for it.
- `N8N_ENCRYPTION_KEY` set and stored in our password manager.
- HTTPS URL, owner account created by the owner.
- Workflows rebuilt from `workflow-inventory.md`, each owned by the named test-org person's n8n account, invited with their Entra UPN.
- An owner API key created at Settings > n8n API.

Done when the probe gets 200 on `/api/v1/users?limit=1`, and the workflow count matches the inventory.

**R7: Supabase project for the live test org (after G1).**

- New project named `horquva-live-test`.
- Session-pooler connection string, with `sslmode=no-verify`. The Supabase CA fails `verify-full`.
- `PG_POOL_MAX=5`, `PGBOSS_POOL_MAX=2`.

I run `npm run migrate` against it after the owner approves. Done when `getMigrationStatus()` shows every migration applied and no tables beyond ours.

**R8: Repoint the demo deployment (G9).**

On Render `horquva-continuity-backend`:

- Set `DATABASE_URL` to R7's database.
- Remove `DEMO_MODE` if it is set.
- Keep `DEMO_LOGIN_EMAIL` and `DEMO_LOGIN_PASSWORD`, with the email set to the bootstrap admin from Task 1.5.

Restart the service. The Vercel frontend is unchanged. Done when `/health` is OK and the demo login lands on an Overview that shows the live org.

---

## Part C: Two-engineer allocation

### C.1 Lanes and file ownership

A file has one owning lane. The other engineer may change it only within a task that this table assigns to them, and the owning lane reviews that change.

| Lane | Owns these paths |
|---|---|
| A (core) | `backend/src/connectors/sdk/{base,guard,types,validate,sourceRules,issues}.ts`, `backend/src/identity/**`, `backend/src/domain/**`, `backend/src/services/**`, `backend/src/security/**`, `backend/src/jobs/**`, `backend/src/views/**`, `backend/src/routes/**`, `backend/src/auth/**`, `backend/db/**`, `backend/tests/{pg,domain,services,api,db,e2e,helpers,setup}/**`, `backend/vitest*.ts`, `packages/types/**`, `frontend/playwright.config.ts` |
| B (connectors and UI) | `backend/src/connectors/{entra,n8n,google,ai_admin,csv,slack,jira,github,probe}/**`, `backend/src/connectors/sdk/sanitize.ts`, `backend/scripts/**` (except `checkProvenance.ts`, which is A's), `backend/tests/connectors/**`, `backend/tests/fixtures/**` (except `handCheckableTruth.json`, which is A's), `frontend/{app,features,components,lib}/**`, `frontend/tests/**`, `docs/test-org/**` |
| Shared, split by section | `backend/src/connectors/sdk/runner.ts`. B owns `CONFIG_SCHEMAS` and `build()`. A owns everything else (`executeSync`, `syncAll`, post-sync hooks). Each engineer touches only their section, and conflicts are resolved by rebasing, never by force-pushing. |

### C.2 Task 0.A: Shared interfaces (Engineer A, first task, before any phase-2 or phase-3 work)

This lets B build connectors against final signatures while A implements the bodies.

**Files:**
- Modify: `packages/types/src/index.ts`:
  - `EntityKind` adds `account`, `repository` and `project`.
  - Add `IdentityLink` and `LinkMethod`, exactly as in Task 2.1.
- Modify: `backend/src/connectors/sdk/types.ts`:
  - `SyncResult.coverage: Record<string, number>`. Required, so every connector must fill it.
  - `PersistStats.visibilityDropped?`.
- Create: `backend/src/connectors/sdk/validate.ts`. Contains `parsePage` with its final signature (Task 3.2) and the real implementation. It's small, so ship it whole.
- Create: `backend/src/connectors/sdk/sourceRules.ts`. Contains `REF_KEYS` (Task 1.7) and `STATED_RULES` as an exported constant (Task 3.4), plus `assertGradeRules(result: SyncResult): string[]`, which returns the violations.
- Modify: `backend/src/connectors/sdk/guard.ts`. Contains `postTokenRequest` with its final signature and implementation (Task 3.3).
- Test: `backend/tests/connectors/contracts.test.ts`, with tests named `parsePage reports a core error naming the field`, `assertGradeRules flags a stated inferred-only edge` and `postTokenRequest rejects non-token URLs`.

After this, Tasks 3.2, 3.3 and 3.4 shrink:

- A keeps the remaining guard behaviour: retrying a 403.
- B writes the per-connector schemas, moves Entra onto `postTokenRequest`, and adds each connector to the grade test.

Commit: `feat(sdk): shared connector contracts (coverage, parsePage, sourceRules, token exchange)`.

### C.3 Allocation by task

"A→B" means A does the core part first and B does the connector or UI part after A's part is on `mvp/v1-continuity`.

| Task | Owner | Notes on the split |
|---|---|---|
| R1–R8 runbooks | B (owner) | B gives A only the credentials A's tasks need. A needs none until Phase 8 drills, and none for those either, because B runs the live drills. |
| 0.1 Probe | B | |
| 0.2 Overlap report | B | Put `overlap.ts` in `backend/src/connectors/probe/overlap.ts`, not `identity/`, to respect lanes. Update Task 0.2's paths to match. |
| 0.3 Phase 0 run, G0 | B | |
| 0.A Contracts | A | Runs during Phase 0 and Phase 1, since it doesn't depend on them. |
| 1.1 Fixtures into test harness | A | |
| 1.2 No DB, no server; e2e seed | A | |
| 1.3 Google sandbox token | B | |
| 1.4 Entra invented titles | B | |
| 1.5 Bootstrap users / dev sign-in | A→B | A: `bootstrapUser.ts` and its test. B: `session.tsx` changes, the UI mockup, and the frontend tests. |
| 1.6 Delete /showcase | B | |
| 1.7 Provenance check | A | `REF_KEYS` is already in 0.A. B confirms each connector's key in review. |
| 2.1 Types and kinds | A→B | The types are already in 0.A. B: `EntityKindIcon`, `nodes.tsx`, the mockup, the frontend test. |
| 2.2 identity_link migration | A | |
| 2.3 Link repository and autoLink | A | |
| 2.4 Directory-id anchoring | B | Changes to the Entra, Google and CSV connectors. A updates `handCheckableTruth.json` ids and `syncHook.directoryFrom` aliases in the same task, on B's branch, as co-author. |
| 2.5 Tool connectors emit accounts | A→B | A: the `syncHook.toolAccounts` change, plus the `runner.ts` autoLink hook. B: the n8n and ai_admin connector changes and their tests. |
| 2.6 Attribution | A | |
| 2.7 Identity queue | A→B | A: `queue.ts`, `routes/identity.ts`, the API tests. B: `IdentityQueueView.tsx`, the mockup, the frontend tests. |
| G2 | owner | A presents the backend. B presents the UI. |
| 3.1 Coverage guard | A→B | A: `coverageDropped`, `base.ts`, migration 010, the accept route, the pg tests. B: filling `coverage` in every connector, and the `ConnectionsView` warning with its mockup. |
| 3.2 Validation | B | `parsePage` is already in 0.A. B writes `schemas.ts` per connector and the connector tests. |
| 3.3 Guard | A→B | A: 403 retry (the token exchange is already in 0.A). B: Entra on `postTokenRequest`. |
| 3.4 Grade rules | B | The rules are already in 0.A. B adds the grade test for every connector. A must approve any change to `STATED_RULES`. |
| 3.5 Entra extension | B | |
| 3.6 Record fixtures | B | |
| 3.7 Entra and n8n live, G3 | B | A reviews the count table and the provenance output. |
| 4.x Slack | B | |
| 5.x Jira | B | |
| 6.1 GitHub auth, 6.2 connector, 6.3 live | B | The A part of 6.2 is the daily fan-out job in `scheduler.ts`. B includes that change in the task and A reviews it. |
| 7.1 Grant endpoint verification | B | |
| 7.2 Grant detection | B | |
| 8.1 Parallel syncs and one rebuild | A | |
| 8.2 Raw payload dedup and retention | A | |
| 8.3 Freshness and tool leaver signals | A→B | A: views, lifecycle, runner. B: the stale badge with its mockup. |
| 8.4 Failure drills | A→B | A: unit drill tests. B: the live drills with the owner. |
| 9.1 Ground truth in repo | B | |
| 9.2 Deploy | B | A runs the provenance check against the live database. |
| 9.3 Validation report, G9 | B | A reviews it independently before G9. |

Load is about even. A has roughly 2.5 engineer-weeks of core work. B has roughly 2.5 weeks of connectors and UI, plus the runbooks and live runs.

### C.4 Schedule (calendar weeks; gate waits not included)

| Week | Engineer A | Engineer B | Sync points |
|---|---|---|---|
| 1 | 0.A contracts, 1.1, 1.2, 1.5 (backend), 1.7 | R1, 0.1, 0.2, 0.3, then 1.3, 1.4, 1.5 (UI), 1.6 | End of week: G0 (B presents) and G1 (A presents). Then R7. |
| 2 | 2.2, 2.3, 2.5 (core), 2.6, 2.7 (backend) | 2.1 (UI), 2.4, 2.5 (connectors), 2.7 (UI), 3.2 schemas for the existing connectors | G2 at end of week. |
| 3 | 3.1 (core), 3.3 (403), then 8.1 | R2/R6, 3.1 (coverage and UI), 3.3 (Entra), 3.4, 3.5, 3.6, 3.7 | G3 at end of week. |
| 4 | 8.2, 8.3 (core), 8.4 (unit) | R3, 4.1, 4.2, then R5, 5.1–5.3 | G4 and G5 |
| 5 | Reviews, 8.x fixes, the provenance tool against live | R4, 6.1–6.3, 7.1, 7.2, 8.3 (UI), 8.4 (live) | G6, G7, G8 |
| 6 | Independent review of the validation report | R8, 9.1–9.3 | G9 |

Critical path: G1 (the empty, fixture-free runtime) and 0.A must land before Phase 2. Phase 2 must land before 3.5. A's 3.1 core must land before any new connector reaches live.

### C.5 Branch workflow (both engineers)

1. Start each task from the latest `mvp/v1-continuity`: `git fetch && git switch -c a/<task-id>` (or `b/<task-id>`).
2. Work through the task's steps. Commit locally at the task's commit step.
3. Before review: `git fetch && git rebase origin/mvp/v1-continuity`, then the full checks:
   - `npm test`
   - `npm run test:pg`
   - `tsc` for backend and frontend
   - Playwright, if the task touched the frontend or e2e setup
   - `graphify update .`
4. Review: the other engineer reads the diff (`git diff origin/mvp/v1-continuity...<branch>`) and approves or requests changes in chat. Every task needs the other lane's approval.
   - Because the owner is also Engineer B, B's tasks always need A's review. B never self-merges.
   - A change to `STATED_RULES`, migrations, `base.ts` or `guard.ts` also needs the owner's approval.
5. Merge: `git switch mvp/v1-continuity && git merge --ff-only <branch>`. Local only. Delete the task branch.
6. Push `mvp/v1-continuity` only after the phase gate is approved. Task branches are never pushed. No PRs, and no other target branches.
7. If both engineers' merges collide (a non-fast-forward), the later one rebases and re-runs step 3. Nobody force-pushes.

### C.6 Handoffs that must be explicit

- A to B, after 0.A merges: A posts the exported names (`parsePage`, `assertGradeRules`, `postTokenRequest`, `SyncResult.coverage`, the new kinds). B builds only against those.
- A to B, after 2.3 merges: A confirms that `autoLink` runs in `runner.ts` after persist. From then on, B's connectors emit `account` entities only.
- B to A, after each phase-0 or live run: B shares the results docs (no secrets). A uses them to check the coverage keys and the provenance key map.
- At any surprise, such as a probe disagreeing with the plan or live counts not matching, the engineer who saw it stops their lane's dependent tasks and raises it with the owner. The other lane continues on independent tasks.

---

## Phase 0: Is it still alive?

### Task 0.1: Platform probe script

**Files:**
- Create: `backend/scripts/platformProbe.ts`, the CLI entry
- Create: `backend/src/connectors/probe/probes.ts`, one pure function per platform, so they can be tested
- Modify: `.gitignore` (add `backend/.env.connectors`)
- Create: `backend/.env.connectors.example`, listing variable names only
- Test: `backend/tests/connectors/probes.test.ts`

**Interfaces:**
- Produces:
  - `type ProbeStatus = 'working' | 'rejected' | 'unreachable' | 'missing' | 'unexpected'`
  - `interface ProbeResult { platform: string; check: string; status: ProbeStatus; httpStatus: number | null; detail: string }`. `detail` is secret-free.
  - `probeEntra(env, fetchImpl)`, `probeN8n`, `probeSlack`, `probeJira`, `probeGitHub`, each returning `Promise<ProbeResult[]>`.
  - `redact(text: string, secrets: string[]): string`.
- Env names in `.env.connectors.example`:
  - `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`, `ENTRA_CLIENT_SECRET`
  - `N8N_BASE_URL`, `N8N_API_KEY`
  - `SLACK_BOT_TOKEN`
  - `JIRA_SITE`, `JIRA_EMAIL`, `JIRA_API_TOKEN`
  - `GITHUB_ORG`, `GITHUB_TOKEN`, `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY_PATH`

Checks per platform, all GET except the two token endpoints:

| Platform | Checks |
|---|---|
| Entra | token (POST to the token endpoint), `/users?$top=1`, `/groups?$top=1`, `/applications?$top=1`, `/users/{firstId}/directReports` |
| n8n | `/api/v1/users?limit=1`, `/api/v1/workflows?limit=1`, `/api/v1/credentials?limit=1` |
| Slack | `auth.test`, `users.list?limit=1` (check `profile.email` is present), `conversations.list?limit=1&types=public_channel,private_channel` |
| Jira | `/rest/api/3/myself`, `/rest/api/3/project/search?maxResults=1&expand=lead`, `/rest/api/3/project/{firstKey}/components`, `/rest/api/3/project/{firstKey}/role`, `/rest/api/3/search/jql?jql=order%20by%20updated&maxResults=1`, `/rest/api/3/users/search?maxResults=1` |
| GitHub | PAT `/orgs/{org}`. App: JWT `GET /app`, `GET /orgs/{org}/installation`, then token POST and `/orgs/{org}/members?per_page=1` |

- [ ] **Step 1: Write the failing tests.** In `probes.test.ts`, with an injected `fetchImpl`:
  - `classifies 200 as working`
  - `classifies 401 and 403 as rejected`
  - `classifies ENOTFOUND and ECONNREFUSED as unreachable`
  - `missing env var yields missing without calling fetch`
  - `slack users.list without profile.email is unexpected with detail "users:read.email scope missing"`
  - `jira 404 on search/jql is unexpected and records the path` (this verifies the unverified Jira paths)
  - `detail never contains any configured secret value`: feed every secret into the error bodies and assert `redact` removed them.
- [ ] **Step 2: Run the tests.** `cd backend && npx vitest run tests/connectors/probes.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement the probes.** Implement `probes.ts` and the CLI. The CLI loads `backend/.env.connectors` with `dotenv.config({ path })`, runs every probe, prints a table (platform, check, status, http, detail) and exits 0. For GitHub JWTs, use `node:crypto` `createSign('RSA-SHA256')`, with `iat` 60 s in the past and `exp` 9 minutes ahead. Don't add a dependency.
- [ ] **Step 4: Run the tests.** Same command. Expected: PASS. Then `npx tsc --noEmit -p .`.
- [ ] **Step 5: Commit.** `git add .gitignore backend/.env.connectors.example backend/scripts/platformProbe.ts backend/src/connectors/probe backend/tests/connectors/probes.test.ts && git commit -m "feat(probe): GET-only liveness probe per platform (phase 0)"`

### Task 0.2: Email overlap report

**Files:**
- Create: `backend/scripts/emailOverlap.ts`
- Create: `backend/src/connectors/probe/overlap.ts`. This is in lane B. See Part C.
- Test: `backend/tests/connectors/overlap.test.ts`

**Interfaces:**
- Produces:
  - `interface OverlapInput { directory: Array<{ id: string; emails: string[] }>; accounts: Array<{ source: string; accountId: string; email: string | null; login?: string }> }`
  - `overlapReport(input): { perSource: Record<string, { total: number; exactMatch: number; noEmail: number; unmatched: Array<{ accountId: string; email: string | null; login?: string }> }> }`

The CLI reads directory users from Entra (UPN, `mail`, `proxyAddresses`, `otherMails`) and accounts from Slack, Jira, GitHub and n8n, using the Task 0.1 env. It writes the report to stdout. Emails are printed, because they are identifiers, not secrets.

- [ ] **Step 1: Write the failing tests.**
  - `case-insensitive exact match counts as matched`
  - `smtp: prefix stripped from proxyAddresses`
  - `account without email counted in noEmail and listed unmatched`
  - `same email in two directory records reported as conflict`. The output needs a `conflicts` array, so add it to the return type.
- [ ] **Step 2: Run the tests.** Expected: FAIL.
- [ ] **Step 3: Implement `overlapReport`.**
- [ ] **Step 4: Run the tests.** Expected: PASS. Then `tsc`.
- [ ] **Step 5: Commit.** `git commit -m "feat(identity): cross-platform email overlap report (phase 0)"`

### Task 0.3: Run phase 0 and write the results

**Files:**
- Create: `docs/test-org/phase0-results.md`. It holds no secret values.

- [ ] **Step 1: Check the env file.** The owner completes R1 and fills `backend/.env.connectors`. I don't read the values. I check the variable names are present with `node -e` printing the names that have non-empty values.
- [ ] **Step 2: Run the probe.** `cd backend && npx tsx scripts/platformProbe.ts`. Paste the table into `phase0-results.md`.
- [ ] **Step 3: Run the overlap report.** `npx tsx scripts/emailOverlap.ts`, for every platform that is working. Paste the per-source totals, and the unmatched list, into the results doc.
- [ ] **Step 4: Add the owner's findings.** Record:
  - Jira backup convention (R5)
  - Jira plan and user count
  - Slack plan
  - Entra tenant expiry date, from Microsoft 365 admin centre > Billing
  - Whether the original n8n exists
  - Whether the `/shared/` files were received
- [ ] **Step 5: Commit.** `git commit -m "docs(test-org): phase 0 liveness and identity overlap results"`
- [ ] **Step 6: GATE G0.** Present the results. The owner decides:
  - **Missing platforms:** wait, recreate, or drop.
  - **n8n:** rebuild under R6, or reuse.
  - **Jira backup convention:** one of three outcomes:
    - (a) project role "Backup" means `backs_up` edges.
    - (b) component lead.
    - (c) none, so backups come only from attestation.
  - **Alias list for R2:** the unmatched emails per person.

  Record the decisions in the results doc. Push after approval.

---

## Phase 1: Remove fabricated data from the runtime

### Task 1.1: Fixtures move to the test harness

**Files:**
- Create: `backend/tests/helpers/fixtureOrg.ts`. Move `demoState()` here from `dataService.ts:134–196`, unchanged.
- Create: `backend/tests/setup/fixtureOrg.ts`, a vitest setup file.
- Modify: `backend/vitest.config.ts` (add `setupFiles: ['tests/setup/fixtureOrg.ts']`)
- Modify: `backend/src/services/dataService.ts`. Remove `demoState`, `initDefaultState` and the fixture `fs` read. Add the provider hook.
- Test: `backend/tests/services/initialState.test.ts`

**Interfaces:**
- Produces:
  - `export interface InitialState { entities: CanonicalEntity[]; edges: CanonicalEdge[]; facts: CanonicalFact[]; users: UserAccount[]; org: OrgSettings; changeEvents: StoredChangeEvent[]; queueItems: IdentityQueueItem[]; departures: DepartureRecord[] }`
  - `DataService.useInitialStateProvider(provider: (() => InitialState) | null): void`
  - A non-persistent DataService starts empty unless a provider is set.
  - Runtime code never calls `useInitialStateProvider`.

- [ ] **Step 1: Write the failing tests.**
  - `non-persistent DataService is empty when no provider is set`. Call `useInitialStateProvider(null)` and `resetInstance()`, then assert the graph has 0 nodes.
  - `provider state loads on resetInstance`.
  - `no file under src reads tests/fixtures`. Grep `backend/src` for `tests/fixtures` and `handCheckableTruth`, and expect 0 matches.
- [ ] **Step 2: Run the tests.** Expected: FAIL.
- [ ] **Step 3: Implement.** The vitest setup file calls `DataService.useInitialStateProvider(fixtureOrgState)` once. `fixtureOrgState` adapts `demoState()` to `InitialState`.
- [ ] **Step 4: Run the tests.** `cd backend && npm test`. Expected: every existing suite passes unchanged, plus the 3 new tests. Then `tsc`.
- [ ] **Step 5: Commit.** `git commit -m "refactor(data): fixtures load only through the test harness"`

### Task 1.2: No database means no server, and demo seeding is removed

**Files:**
- Modify: `backend/src/services/dataService.ts`:
  - `initialize()` throws `'DATABASE_URL must be set: Horquva has no offline data.'` in every environment.
  - Remove `demoModeEnabled`, `seedDemoData` and `seedDemoHistoryAfterLoad`.
  - `loadFromDatabase()` loses its `seedDemo` option.
- Modify: `backend/src/services/snapshot/snapshotService.ts`. Remove `seedDemoHistory`, and move it to `backend/tests/helpers/seedHistory.ts`.
- Modify: `backend/src/index.ts`. The log line says just "PostgreSQL".
- Delete: `backend/db/resetDemoDeployment.ts`, `backend/db/seedDemoHistory.ts`. In `backend/package.json`, delete the `seed:demo-history` and `demo:reset` scripts.
- Create: `backend/tests/e2e/seedE2E.ts`. It refuses unless the database name ends in `_e2e`. It inserts the fixture org through `graphRepo.insertSnapshot`, `settingsRepo.saveUser` and the other repos, then `seedHistory`.
- Modify: `frontend/playwright.config.ts`:
  - The webServer command becomes `npx tsx db/resetForE2E.ts && npx tsx tests/e2e/seedE2E.ts && npx tsx src/index.ts`.
  - Remove `DEMO_MODE`.
- Modify: `backend/db/resetForE2E.ts`. Update the header comment so it no longer says the backend seeds.
- Modify: `backend/.env.example`. Remove the `DEMO_MODE` lines and the demo:reset usage.
- Test: `backend/tests/services/initialize.test.ts`, plus the existing pg suites.

- [ ] **Step 1: Write the failing tests.**
  - `initialize without DATABASE_URL throws in development`
  - `initialize without DATABASE_URL throws in production`
  - `DEMO_MODE=true has no effect on an empty database`. This is a pg test in `tests/pg/persistence.test.ts`: after initialize, assert 0 entities.
- [ ] **Step 2: Run the tests.** `npm test && npm run test:pg`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement the removals and the e2e seed script.**
- [ ] **Step 4: Run all suites.** `npm test`, `npm run test:pg`, `cd ../frontend && npx playwright test`. Expected: all pass. The e2e run now seeds through `seedE2E.ts`. Then `tsc` for both packages.
- [ ] **Step 5: Commit.** `git commit -m "feat(data): no database, no server; demo seeding removed from runtime"`

### Task 1.3: Google connector fails on a missing key (F4)

**Files:**
- Modify: `backend/src/connectors/google/index.ts:60–70`
- Test: `backend/tests/connectors/directory.test.ts`

- [ ] **Step 1: Write the failing test.** `google connector without service account key throws a configuration error naming serviceAccountKeyJson`. Assert no request is made and the error message has no token text.
- [ ] **Step 2: Run the test.** Expected: FAIL.
- [ ] **Step 3: Implement.** Delete the `'google-sandbox-token'` branch and throw `new Error('[GoogleWorkspaceConnector] serviceAccountKeyJson is missing or has no private_key.')`.
- [ ] **Step 4: Run the tests.** Expected: PASS. Then `tsc`.
- [ ] **Step 5: Commit.** `git commit -m "fix(google): a missing key is an error, not a sandbox token"`

### Task 1.4: Entra stops inventing job titles and departments (F11)

**Files:**
- Modify: `backend/src/connectors/entra/index.ts:131`, the `description` line.
- Test: `backend/tests/connectors/directory.test.ts`

- [ ] **Step 1: Write the failing test.** `missing jobTitle and department produce no description`. Assert `description` is `undefined` and `externalRefs` has no `jobTitle` or `department` keys. A second case: `jobTitle only gives description equal to jobTitle`.
- [ ] **Step 2: Run the test.** Expected: FAIL. It currently gives "Team Member - Operations".
- [ ] **Step 3: Implement.** Build the description as `[jobTitle, department].filter(Boolean).join(' - ') || undefined`. Include refs only when present.
- [ ] **Step 4: Run the tests.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "fix(entra): no default job title or department"`

### Task 1.5: App accounts come from a bootstrap script, and dev sign-in uses real users

**Files:**
- Create: `backend/db/bootstrapUser.ts`. The CLI is `npx tsx db/bootstrapUser.ts --email <e> --name "<n>" --role admin|reviewer|viewer [--hr]`. It is idempotent: an upsert by email into `user_account`, with an audit entry `USER_BOOTSTRAPPED`.
- Modify: `backend/src/auth/demoLogin.ts`, the header comment. The account comes from `bootstrapUser.ts`.
- Modify: `frontend/lib/session.tsx:31–45`:
  - `DEV_USERS` is read from `NEXT_PUBLIC_DEV_ADMIN_EMAIL`, `NEXT_PUBLIC_DEV_REVIEWER_EMAIL` and `NEXT_PUBLIC_DEV_VIEWER_EMAIL`. A role with no env value is not offered.
  - `offlineDevSession` is deleted. When the backend is offline, the session state becomes an error state: "Backend not reachable at {url}".
- Modify: `frontend/.env.example` (the three variables).
- Test: `backend/tests/db/bootstrapUser.test.ts` (pg), `frontend/tests/lib/session.test.tsx`

**Interfaces:**
- Produces: `bootstrapUser(input: { email: string; name: string; role: Role; isHrManager: boolean }): Promise<{ created: boolean }>`

- [ ] **Step 1: UI approval.** Send the owner a text mockup of the dev role switcher with unset roles hidden, and of the "backend not reachable" state. Wait for approval.
- [ ] **Step 2: Write the failing tests.**
  - `bootstrapUser creates then updates without duplicating`
  - `role switcher hides roles without an env email`
  - `offline backend shows error state, not a fake session`
- [ ] **Step 3: Run the tests.** Expected: FAIL.
- [ ] **Step 4: Implement.**
- [ ] **Step 5: Run the tests.** Backend `npm run test:pg -- bootstrapUser`, and frontend `npm test`. Expected: PASS. Then `tsc` for both packages.
- [ ] **Step 6: Commit.** `git commit -m "feat(auth): bootstrap app accounts; dev sign-in uses real test-org users"`

### Task 1.6: Delete /showcase

**Files:**
- Delete: `frontend/app/showcase/` (whole directory), plus any links to it and any tests of it (`grep -rn showcase frontend`).

- [ ] **Step 1: Find references.** `grep -rn "showcase" frontend --include=*.ts --include=*.tsx`. Record the hits.
- [ ] **Step 2: Delete the route and every reference.**
- [ ] **Step 3: Check.** `cd frontend && npm test && npx tsc --noEmit && npm run build`. Expected: PASS, with no `/showcase` route in the build output.
- [ ] **Step 4: Commit.** `git commit -m "chore(frontend): remove /showcase fake-people gallery"`

### Task 1.7: Provenance check

**Files:**
- Create: `backend/src/security/provenance.ts`
- Create: `backend/scripts/checkProvenance.ts`
- Modify: `backend/package.json` (add `"check:provenance": "tsx scripts/checkProvenance.ts"`)
- Test: `backend/tests/pg/provenance.test.ts`

**Interfaces:**
- Produces: `findUnbackedEntities(): Promise<Array<{ id: string; kind: string }>>`. It returns active entities with no `raw_payload` row whose `(connection_id, external_id)` produced them, no attestation task, and no `audit_log` row of action `MANUAL_ENTITY_CREATED`.

The `raw_payload` to entity join needs the external id. Every connector already stores the platform id in `externalRefs`. The check joins on `entity.external_refs ->> <refKey>`. Create `backend/src/connectors/sdk/sourceRules.ts` in this task, holding only `REF_KEYS: Record<string, string>`. That is the connection type mapped to the external-ref key: `entra: 'entraId'`, `google: 'googleId'`, `n8n: 'n8nId'`, `ai_admin: 'vendorId'`, `csv: 'csvRow'`. Confirm the actual key each connector writes when implementing. Task 3.4 adds the grade rules to the same module.

- [ ] **Step 1: Write the failing tests.**
  - `entity inserted without raw payload is reported`
  - `entity from a connector sync is not reported`
  - `the CLI exits 1 when any entity is unbacked`
- [ ] **Step 2: Run the tests.** Expected: FAIL.
- [ ] **Step 3: Implement `findUnbackedEntities` and the CLI.**
- [ ] **Step 4: Run the tests.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(trust): provenance check, every entity traces to evidence"`
- [ ] **Step 6: GATE G1.** Present:
  - the deleted-file list
  - the grep proof: `grep -rniE "acme|handCheckableTruth|sandbox-token|Team Member" backend/src frontend/app frontend/features frontend/lib frontend/components` returns 0 hits
  - all suites green

  After approval: push, then the owner runs R7, and I run `npm run migrate` against the new database once the owner says go.

---

## Phase 2: One canonical identity per person

### Task 2.1: Types and kinds

**Files:**
- Modify: `packages/types/src/index.ts`:
  - `EntityKind` gains `'account' | 'repository' | 'project'`.
  - Add the `IdentityLink` and `LinkMethod` types.
- Modify: `frontend/components/ui/EntityKindIcon.tsx` (icon and label for each new kind)
- Modify: `frontend/features/map/nodes.tsx`. Delete the `workflow` legacy alias (F7), now that no runtime data uses it.
- Test: `frontend/tests/components/EntityKindIcon.test.tsx`

**Interfaces:**
- Produces:
  - `type LinkMethod = 'exact_email' | 'admin_link' | 'suggested'`
  - `interface IdentityLink { id: string; accountId: string; personId: string; grade: EvidenceGrade; method: LinkMethod; linkedBy: string | null; note: string | null; validFrom: Date; validTo: Date | null }`

- [ ] **Step 1: UI approval.** Send a text mockup of the labels "Account", "Repository" and "Project", with the proposed lucide icons `AtSign`, `GitBranch` and `FolderKanban`. Wait for approval.
- [ ] **Step 2: Write the failing test.** `every EntityKind has an icon and label`. Iterate over the kinds from the types package.
- [ ] **Step 3: Run the test.** Expected: FAIL.
- [ ] **Step 4: Implement.**
- [ ] **Step 5: Run the tests.** Expected: PASS. Then `tsc` in every package.
- [ ] **Step 6: Commit.** `git commit -m "feat(types): account, repository, project kinds; identity link type"`

### Task 2.2: identity_link table

**Files:**
- Create: `backend/db/migrations/009_identity_link.sql`
- Test: `backend/tests/pg/identityLink.test.ts`

Schema: `identity_link` has these columns:

- `id UUID PK DEFAULT gen_random_uuid()`
- `account_id VARCHAR(128) NOT NULL REFERENCES entity(id) ON DELETE CASCADE`
- `person_id VARCHAR(128) NOT NULL REFERENCES entity(id) ON DELETE CASCADE`
- `grade VARCHAR(16) NOT NULL CHECK (grade IN ('stated','confirmed','inferred'))`
- `method VARCHAR(16) NOT NULL CHECK (method IN ('exact_email','admin_link','suggested'))`
- `linked_by VARCHAR(128)`
- `note TEXT`
- `valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `valid_to TIMESTAMPTZ`

There is a partial unique index `ON identity_link(account_id) WHERE valid_to IS NULL AND method <> 'suggested'`. `ALTER TABLE identity_queue DROP COLUMN linked_person_id`. That is allowed because every database is wipeable (owner, 23 Nov).

- [ ] **Step 1: Write the failing tests.**
  - `two active non-suggested links for one account are rejected`
  - `suggested links may coexist with one active link`
  - `closing a link allows a new one`
- [ ] **Step 2: Run the tests.** Expected: FAIL.
- [ ] **Step 3: Write the migration.** Then `npm run migrate` on the local and e2e databases.
- [ ] **Step 4: Run the tests.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(db): identity_link table (migration 009)"`

### Task 2.3: Link repository and automatic linking

**Files:**
- Create: `backend/src/identity/linkRepository.ts`
- Create: `backend/src/identity/autoLink.ts`
- Test: `backend/tests/pg/autoLink.test.ts`

**Interfaces:**
- Consumes: `IdentityLink` (Task 2.1).
- Produces:
  - `linkRepository.listActive(): Promise<IdentityLink[]>`
  - `linkRepository.create(link: Omit<IdentityLink,'id'|'validFrom'|'validTo'>): Promise<IdentityLink>`
  - `linkRepository.close(id: string): Promise<void>`
  - `autoLink(accounts: Array<{ id: string; email: string | null; isBot: boolean }>, directory: Array<{ personId: string; emails: string[] }>): Promise<{ created: number; closed: number; suggested: number }>`

Rules:

- Exact case-insensitive email against every directory email creates `exact_email`/`stated`.
- An existing active `admin_link` for that account is never touched.
- An active `exact_email` link whose emails no longer match is closed.
- If two directory people share the email, no link is made and a `suggested` link is added for each, with a `note` explaining the conflict.
- Bots are never linked.
- Name similarity creates a `suggested`/`inferred` link only.

- [ ] **Step 1: Write the failing tests.**
  - `exact email creates stated link`
  - `alias email creates stated link`
  - `automatic match never overrides a confirmed link`
  - `email change on the account closes the automatic link`
  - `ambiguous email creates only suggestions`
  - `bot account is never linked`
  - `suggestion is never active for attribution` (assert via `listActive()` filtering)
- [ ] **Step 2: Run the tests.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the tests.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(identity): graded automatic linking"`

### Task 2.4: People anchored on directory ids

**Files:**
- Modify: `backend/src/connectors/entra/index.ts`:
  - `personId = 'person:entra:' + u.id`
  - `externalRefs.email` is the lower-cased `mail ?? userPrincipalName`
  - `externalRefs.emails` is a JSON array of `mail`, the UPN, and `proxyAddresses` with `smtp:` stripped (case-insensitive), plus `otherMails` if the read permission allows it (checked at G3), all de-duplicated
  - The `$select` adds `proxyAddresses,otherMails`
- Modify: `backend/src/connectors/google/index.ts` (`person:google:<id>`, same emails rule)
- Modify: `backend/src/connectors/csv/index.ts`. `person:csv:<lower email>`. A CSV has no immutable id, which is documented in the file header.
- Modify: `backend/src/identity/syncHook.ts`. `directoryFrom` fills `aliases` from `externalRefs.emails`.
- Test: `backend/tests/pg/identityAnchor.test.ts`

- [ ] **Step 1: Write the failing tests.**
  - `email change keeps the same person entity and edges`. Run two Entra syncs where the same id has a new `mail`. Assert one person, the old email kept in `emails`, and no edges closed.
  - `proxyAddresses become aliases`
  - `two Entra users never share an entity`
- [ ] **Step 2: Run the tests.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the tests.** `npm test && npm run test:pg`. Expected: PASS. Fixture-based tests that assert `person:<email>` ids get updated fixture ids in `tests/fixtures/handCheckableTruth.json`. That is allowed because it is test-only.
- [ ] **Step 5: Commit.** `git commit -m "feat(identity): people keyed on directory id"`

### Task 2.5: Tool connectors emit accounts

**Files:**
- Modify: `backend/src/connectors/n8n/index.ts`:
  - Users become `account:n8n:<id>`, kind `account`, with refs `{ n8nUserId, email }`.
  - Every edge previously from `person:<email>` comes from the account id.
- Modify: `backend/src/connectors/ai_admin/index.ts` (the same for OpenAI and Anthropic users)
- Modify: `backend/src/identity/syncHook.ts`. `toolAccounts()` selects `kind === 'account'`. Delete `TOOL_ACCOUNT_REFS`, since T6 becomes structural.
- Modify: `backend/src/connectors/sdk/runner.ts`. After persist, call `autoLink`, then `queueUnmatchedAccounts`.
- Test: `backend/tests/connectors/n8n.test.ts` (recorded real responses), `backend/tests/pg/connectors.test.ts`

- [ ] **Step 1: Write the failing tests.**
  - `n8n users become account entities, never person`
  - `n8n workflow owner edge starts at the account`
  - `sync auto-links n8n account to directory person by email`
  - `unmatched n8n account is queued`
- [ ] **Step 2: Run the tests.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the tests.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(identity): tool connectors emit accounts"`

### Task 2.6: Attribution through links

**Files:**
- Create: `backend/src/domain/identity/attribution.ts`
- Modify: `backend/src/services/dataService.ts`, in `hydrateGraphFromDatabase`. Load active links and apply `attributeAccounts` before `ContinuityGraph.fromSnapshot`.
- Modify: `backend/src/services/orphanScan/orphanScanService.ts`. An owner node of kind `account` with no link yields `owner_not_in_directory`.
- Test: `backend/tests/domain/attribution.test.ts`, `backend/tests/services/orphanScan.test.ts`

**Interfaces:**
- Consumes: `IdentityLink[]` and `GraphSnapshot`. That is `{ entities: CanonicalEntity[]; edges: CanonicalEdge[]; facts: CanonicalFact[] }`, the shape `graphRepo.loadActiveGraph()` returns. Export the type from `attribution.ts`.
- Produces: `attributeAccounts(snapshot: GraphSnapshot, links: IdentityLink[]): GraphSnapshot`

Behaviour:

- For each edge whose `fromId` or `toId` is a linked account, add an edge on the person with `grade = weaker(edge.grade, link.grade)` and `sourceRef = '<edge sourceRef>|link:<link id>'`. The order is confirmed > stated > inferred > unknown.
- Keep the account node and its original edge, so provenance survives.
- Checks count owners by distinct person, so an account and its person never double-count.

- [ ] **Step 1: Write the failing tests.**
  - `linked account ownership attributed to person with weaker grade`
  - `confirmed link plus inferred edge gives inferred`
  - `unlinked account owner yields owner_not_in_directory`
  - `person with two linked accounts owning one asset counts as one owner`
  - `suggested links are ignored`
- [ ] **Step 2: Run the tests.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run all suites.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(identity): findings attributed through graded links"`

### Task 2.7: Identity queue reads accounts, with bulk confirmation

**Files:**
- Modify: `backend/src/identity/queue.ts`. `resolveLink` writes `identity_link` (`admin_link`, `confirmed`, `linkedBy` set to the actor). The queue list shows accounts without an active link, plus their suggestions.
- Modify: `backend/src/routes/identity.ts`. Add `POST /api/identity/queue/confirm-suggestions` with body `{ linkIds: string[] }`. Admin only, audited per link.
- Modify: `frontend/features/settings/IdentityQueueView.tsx`
- Test: `backend/tests/api/identity.test.ts`, `frontend/tests/features/identityQueue.test.tsx`

- [ ] **Step 1: UI approval.** Send a text mockup of the queue: one row per account, with source, login/email, suggested person and reason, and actions Link, Service account, Ignore. A "Confirm selected suggestions" bulk action. Wait for approval.
- [ ] **Step 2: Write the failing tests.**
  - `link writes a confirmed identity_link and removes the row from the queue`
  - `bulk confirm turns suggestions into confirmed links in one request`
  - `non-admin cannot confirm`
  - `the queue shows suggestion reason text`
- [ ] **Step 3: Run the tests.** Expected: FAIL.
- [ ] **Step 4: Implement.**
- [ ] **Step 5: Run the tests.** Expected: PASS. Then `tsc` for both packages.
- [ ] **Step 6: Commit.** `git commit -m "feat(identity): queue on accounts with bulk confirmation"`
- [ ] **Step 7: GATE G2.** Present the test output and the as-built queue. Push after approval.

---

## Phase 3: Trust guards, and Entra and n8n live

### Task 3.1: Coverage-drop guard (T1)

**Files:**
- Modify: `backend/src/connectors/sdk/types.ts`:
  - `SyncResult.coverage: Record<string, number>`
  - `PersistStats.visibilityDropped?: Array<{ type: string; previous: number; current: number }>`
- Modify: `backend/src/connectors/sdk/base.ts:136`. `complete` additionally requires `!coverageDropped(previous, current, 0.2)`. Unless the connection has `accept_coverage_drop = true`, which is then reset to false after the sync.
- Create: `backend/db/migrations/010_coverage.sql` (`ALTER TABLE connection ADD COLUMN accept_coverage_drop BOOLEAN NOT NULL DEFAULT false`)
- Modify: every connector `sync()` (n8n, entra, google, ai_admin, csv) to fill `coverage`, with a count per `resourceType`.
- Modify: `backend/src/routes/settings.ts`. Add `POST /api/connections/:id/accept-coverage-drop`, admin only and audited.
- Modify: `frontend/features/settings/ConnectionsView.tsx`. Show a warning, with the "Accept and apply on next sync" action.
- Test: `backend/tests/pg/partialSync.test.ts`, `backend/tests/connectors/coverage.test.ts`

**Interfaces:**
- Produces: `coverageDropped(previous: Record<string, number> | null, current: Record<string, number>, threshold: number): Array<{ type: string; previous: number; current: number }>`. It returns an empty array when there's no previous run. A type absent from current counts as 0.

- [ ] **Step 1: UI approval.** Send a text mockup of the connection card warning: "Visibility dropped: channels 8 → 5. Nothing was removed." with the action button. Wait for approval.
- [ ] **Step 2: Write the failing tests.**
  - `coverage drop of 21% skips closing and records visibilityDropped`
  - `coverage drop of 20% closes normally`
  - `first sync has no previous and closes normally`
  - `accepted drop closes on next sync then resets the flag`
  - `type missing from current counts as zero`
- [ ] **Step 3: Run the tests.** Expected: FAIL.
- [ ] **Step 4: Implement.** Read the previous coverage from the last `sync_run` with `status = 'completed'` for this connection, in `stats.coverage`.
- [ ] **Step 5: Run the tests.** Expected: PASS.
- [ ] **Step 6: Commit.** `git commit -m "feat(trust): coverage-drop guard on vanished-row closing"`

### Task 3.2: Response validation at the boundary (T3)

**Files:**
- Create: `backend/src/connectors/sdk/validate.ts`
- Create: `backend/src/connectors/{entra,n8n,google,ai_admin}/schemas.ts`
- Modify: each connector to parse every list response through `parsePage`
- Test: `backend/tests/connectors/validate.test.ts`, plus each connector's test file

**Interfaces:**
- Produces: `parsePage<T>(schema: z.ZodType<T>, data: unknown, module: string, issues: SyncIssues): T[]`. A shape failure calls `issues.core(module, new Error('<module>: field <path> <problem>'))` and returns `[]`. Fields the docs say are nullable are `.nullable()` in the schema, never defaulted.

- [ ] **Step 1: Write the failing tests.**
  - `renamed required field becomes a core error naming the field`
  - `documented-nullable mail null is accepted and yields no email ref`
  - `extra unknown fields are ignored`
- [ ] **Step 2: Run the tests.** Expected: FAIL.
- [ ] **Step 3: Implement `parsePage`, the schemas, and the connector changes.**
- [ ] **Step 4: Run the tests.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(trust): validate every connector response at the boundary"`

### Task 3.3: Guard: token-exchange exception and 403 retry (T8)

**Files:**
- Modify: `backend/src/connectors/sdk/guard.ts`
- Modify: `backend/src/connectors/entra/index.ts`, which uses `postTokenRequest`
- Test: `backend/tests/connectors/guard.test.ts`

**Interfaces:**
- Produces: `ReadOnlyHttpGuard.postTokenRequest(url: string, body: URLSearchParams | Record<string, unknown>, headers?: Record<string,string>): Promise<GuardResponse>`. It is allowed only when the URL matches the `TOKEN_ENDPOINTS` list:
  - `^https://login\.microsoftonline\.com/[^/]+/oauth2/v2\.0/token$`
  - `^https://api\.github\.com/app/installations/\d+/access_tokens$`

  Every call is audited with the host only.

- [ ] **Step 1: Write the failing tests.**
  - `postTokenRequest to an allowed token endpoint succeeds`
  - `postTokenRequest to any other URL throws`
  - `403 with retry-after is retried`
  - `403 with x-ratelimit-remaining 0 waits until x-ratelimit-reset`
  - `403 without those headers fails immediately`
- [ ] **Step 2: Run the tests.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the tests.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(guard): audited token-exchange exception; 403 rate-limit retry"`

### Task 3.4: Source rules and grade check (T2)

**Files:**
- Modify: `backend/src/connectors/sdk/sourceRules.ts` (created in Task 1.7 with `REF_KEYS`). Add `STATED_RULES`, the single source for which (source, edge type, owner kind) can be `stated`. Extend `REF_KEYS` for slack, jira and github as those connectors land.
- Test: `backend/tests/connectors/gradeRules.test.ts`

Allowed `stated` combinations:

| Source | Edge type | Owner kind / detail |
|---|---|---|
| `connector:entra` | `owns` | `owner` (app owners) |
| `connector:entra` | `member_of` | |
| `connector:entra` | `reports_to` | |
| `connector:n8n` | `owns` | `owner` |
| `connector:n8n` | `depends_on` | |
| `connector:n8n` | `runs_on_credentials_of` | |
| `connector:n8n` | `calls_model` | |
| `connector:jira` | `owns` | `owner` (project lead, component lead) |
| `connector:jira` | `backs_up` | only if G0 chose option (a) |
| `connector:slack` | `member_of` | |
| `connector:github` | `member_of` | |

Everything else must be `inferred`.

- [ ] **Step 1: Write the failing tests.** `every connector sync output obeys stated rules`. Run each connector against its recorded fixtures, and assert every `stated` edge's (source, type, ownerKind) is in the list.
- [ ] **Step 2: Run the tests.** Expected: FAIL (module missing).
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the tests.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(trust): source rules pin which evidence may be stated"`

### Task 3.5: Entra: groups, reporting lines, aliases, secret expiry

**Files:**
- Modify: `backend/src/connectors/entra/index.ts`, `backend/src/connectors/entra/schemas.ts`
- Create: `backend/tests/fixtures/entra/`. Recorded real responses, captured once via Task 3.6, and checked against the docs' example shapes until then.
- Test: `backend/tests/connectors/entra.test.ts`

Endpoints:

| Endpoint | Becomes | Notes |
|---|---|---|
| `GET /groups?$select=id,displayName,mail&$top=999` | entities `group:entra:<id>` | |
| `GET /groups/{id}/members?$select=id&$top=999` | `member_of` edges, `stated` | Persons only. Non-user members are skipped and counted in coverage. |
| `GET /users/{id}/directReports?$select=id` | inverted to `reports_to` (report to manager), `stated`, `sourceRef 'user:<managerId>/directReports'` | Run for every user. |
| `GET /applications?$select=id,appId,displayName,createdDateTime,passwordCredentials,keyCredentials&$top=999` | `credential` entity `credential:entra:<appId>:<keyId>` per secret or certificate, with fact `credential_expires_at` (`stated`) from `endDateTime`, and edge credential `depends_on` app | |

Coverage keys: `entra_user`, `entra_group`, `entra_group_member`, `entra_app`, `entra_app_credential`. A directReports failure for one user is a core error, because a missing manager would close edges.

- [ ] **Step 1: Write the failing tests.**
  - `groups become group entities with member_of from users`
  - `directReports are inverted into reports_to`
  - `app password credential becomes credential entity with credential_expires_at`
  - `directReports failure is a core error and nothing closes`
  - `non-user group member is skipped and counted`
- [ ] **Step 2: Run the tests.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the tests.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(entra): groups, reporting lines, aliases, app secret expiry"`

### Task 3.6: Record real responses for tests

**Files:**
- Create: `backend/scripts/recordFixtures.ts`. It runs a connector's GETs with `.env.connectors` credentials and writes the responses to `backend/tests/fixtures/<source>/<resource>.json`, after `sanitize()`.
- Create: `backend/src/connectors/sdk/sanitize.ts`
- Test: `backend/tests/connectors/sanitize.test.ts`

**Interfaces:**
- Produces: `sanitize(payload: unknown, secrets: string[]): unknown`. It removes token-like values (strings matching `/^(xox[abp]-|ghp_|github_pat_|ATATT|sb_secret_|eyJ)/`) and any configured secret.

  Names and emails are kept, because they are identifiers. They live in a private repo, but that is still a storage decision (Q13). The owner approves the first recorded file before commit.

- [ ] **Step 1: Write the failing tests.**
  - `sanitize removes slack, github, atlassian, supabase tokens and JWTs`
  - `sanitize removes configured secrets wherever nested`
- [ ] **Step 2: Run the tests.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the tests.** Expected: PASS.
- [ ] **Step 5: Record fixtures.** Run `npx tsx scripts/recordFixtures.ts entra n8n`. Show the owner the file list and one sample. Commit only after approval: `git commit -m "test(fixtures): recorded real Entra and n8n responses (sanitized)"`.

### Task 3.7: Entra and n8n live locally

- [ ] **Step 1: Complete R2 (and R6 if G0 needs it).** The owner does it. I verify with `npx tsx scripts/platformProbe.ts`.
- [ ] **Step 2: Bootstrap the admin.** On the local database: `npx tsx db/bootstrapUser.ts --email <owner's choice> --name "<name>" --role admin --hr`.
- [ ] **Step 3: Add the connections.** The owner adds the Entra and n8n connections in Settings, then presses Sync now on each.
- [ ] **Step 4: Check the runs.** Query the `sync_run` stats, run `npm run check:provenance` (expected exit 0), and build a count table:
  - Entra: users, groups, apps, and `reports_to` edges. Compare with the Entra admin centre counts, which the owner reads out.
  - n8n: workflows and credentials. Compare with the n8n UI.
  - Linking: the auto-link count, and the queue count.
- [ ] **Step 5: GATE G3.** Present the table. The owner confirms A1 and A2. Push after approval.

---

## Phase 4: Slack connector

### Task 4.1: Slack connector

**Files:**
- Create: `backend/src/connectors/slack/index.ts`, `schemas.ts`
- Modify: `backend/src/connectors/sdk/runner.ts`:
  - `CONFIG_SCHEMAS.slack = z.object({ botToken: z.string().regex(/^xoxb-/) })`
  - `build()` gets a `slack` case
- Modify: `frontend/features/settings/ConnectionForm.tsx`, `AddConnectionModal.tsx` (the Slack form)
- Test: `backend/tests/connectors/slack.test.ts`, with recorded fixtures under `tests/fixtures/slack/`

Endpoints and mapping (spec §4.4 and §5):

| Endpoint | Becomes |
|---|---|
| `users.list` (cursor, `limit=200`) | `account:slack:<id>`, refs `{ slackUserId, email: profile.email ?? null, isBot: is_bot \|\| is_app_user, deleted }` |
| `conversations.list?types=public_channel,private_channel&exclude_archived=true` (cursor, `limit=200`) | `group:slack:<id>`, name `#<name>` |
| `conversations.members` per channel (cursor) | account `member_of` group, `stated` |
| channel `creator` | account `owns` group, `owner_kind 'creator'`, grade `inferred` |

- `deleted: true` produces an account fact `status = 'departed'` (`stated`). That fact is the input for Task 8.3.
- Coverage keys: `slack_user`, `slack_channel`, `slack_member`.
- Concurrency: one request at a time. The guard honours 429 `Retry-After`.
- Every Slack response has `ok`. `ok:false` becomes a core error with Slack's `error` code, for example `missing_scope`, `not_in_channel` or `invalid_auth`.

- [ ] **Step 1: UI approval.** Send a text mockup of the Slack connection form: one "Bot token" field, a help line listing the required scopes, and Test connection and Save. Wait for approval.
- [ ] **Step 2: Write the failing tests.**
  - `users become accounts with email from profile`
  - `bots are accounts flagged isBot and never auto-linked`
  - `channel membership becomes stated member_of`
  - `channel creator becomes inferred creator ownership`
  - `ok false missing_scope is a core error naming the scope`
  - `cursor pagination follows next_cursor until empty`
  - `deleted user gets departed status fact`
- [ ] **Step 3: Run the tests.** Expected: FAIL.
- [ ] **Step 4: Implement.**
- [ ] **Step 5: Run the tests.** Expected: PASS, including Task 3.4's grade test with Slack added.
- [ ] **Step 6: Commit.** `git commit -m "feat(slack): read-only Slack connector"`

### Task 4.2: Slack live

- [ ] **Step 1: Complete R3.** The owner does it.
- [ ] **Step 2: Probe.**
- [ ] **Step 3: Record the Slack fixtures.** Run Task 3.6's script, with the owner's approval.
- [ ] **Step 4: Sync.** The owner adds the connection and syncs.
- [ ] **Step 5: Report.** Users, channels and memberships, against the Slack admin counts. Auto-link rate (how many Slack accounts linked by exact email or alias). The queue count.
- [ ] **Step 6: GATE G4.** Present the report. If the match rate is below 100% for human accounts, the owner decides: more aliases in Entra (R2), or linking in the queue. Push after approval.

---

## Phase 5: Jira connector

### Task 5.1: Confirm the endpoints from phase 0

- [ ] **Step 1: Check the Jira paths.** Read `phase0-results.md`. Every Jira path in Task 0.1 must be `working`. Any that isn't: stop and bring the owner the real response. Don't guess another path.

### Task 5.2: Jira connector

**Files:**
- Create: `backend/src/connectors/jira/index.ts`, `schemas.ts`
- Modify: `runner.ts`:
  - `CONFIG_SCHEMAS.jira = z.object({ site: z.string().regex(/^https:\/\/[a-z0-9-]+\.atlassian\.net$/), email: z.string().email(), apiToken: z.string().min(1), tokenExpiresAt: z.string().date() })`
  - A `jira` case in `build()`
- Modify: the frontend connection form (Jira)
- Test: `backend/tests/connectors/jira.test.ts`, with recorded fixtures

Mapping (spec §4.5 and §5):

| Data | Becomes |
|---|---|
| Users (`/rest/api/3/users/search`, `startAt`/`maxResults=100`) | `account:jira:<accountId>` for `accountType === 'atlassian'` only. Refs: `email: emailAddress ?? null`, `active`. `active:false` gives a status fact `departed`. |
| Projects (`project/search?expand=lead`) | `project:jira:<id>`, name `<key> <name>`. Lead `owns` project, `owner_kind 'owner'`, `stated`. |
| Components (`project/{key}/components`) | Each component's `lead` `owns` project, `owner_kind 'owner'`, `stated`, `sourceRef 'component:<id>'`. Components are not entities (YAGNI, spec §5). |
| Backups, if G0 chose (a) | Actors of the role named in G0 give `backs_up` project, `stated`. |
| Backups, if G0 chose (b) or (c) | No `backs_up` from Jira. |

- The token expiry date from config becomes a credential fact `credential_expires_at` on a `credential:jira:connector` entity. Settings then warns before the connector itself breaks.
- Coverage keys: `jira_user`, `jira_project`, `jira_component`.
- Issues are not ingested.

- [ ] **Step 1: UI approval.** Send a text mockup of the Jira form (site URL, email, API token, token expiry date). Wait for approval.
- [ ] **Step 2: Write the failing tests.**
  - `project lead becomes stated owner`
  - `component lead becomes stated owner with component sourceRef`
  - `hidden Jira email yields account with no email and queues it`
  - `app and customer accountTypes are skipped`
  - `inactive user gets departed status fact`
  - `backs_up only produced under the G0 role convention` (parameterised on config)
  - `token expiry recorded as credential_expires_at`
- [ ] **Step 3: Run the tests.** Expected: FAIL.
- [ ] **Step 4: Implement.**
- [ ] **Step 5: Run the tests.** Expected: PASS.
- [ ] **Step 6: Commit.** `git commit -m "feat(jira): read-only Jira connector"`

### Task 5.3: Jira live

- [ ] **Step 1: Do the live run.** R5, probe, record fixtures (with approval), sync.
- [ ] **Step 2: Report.** Projects and leads against the Jira UI. The OPS backup result under the G0 convention. The account match rate.
- [ ] **Step 3: GATE G5.** Push after approval.

---

## Phase 6: GitHub connector

### Task 6.1: GitHub App authentication

**Files:**
- Create: `backend/src/connectors/github/auth.ts`
- Test: `backend/tests/connectors/githubAuth.test.ts`

**Interfaces:**
- Produces: `class GitHubAppAuth { constructor(appId: string, privateKeyPem: string, installationId: number | null, guard: ReadOnlyHttpGuard); token(): Promise<string> }`
  - It caches the installation token until 5 minutes before `expires_at`.
  - It resolves the installation id via `GET /orgs/{org}/installation` with the JWT when it's null.
  - The JWT is signed with `node:crypto`.

- [ ] **Step 1: Write the failing tests.**
  - `mints installation token via postTokenRequest`
  - `reuses cached token until 5 minutes before expiry`
  - `refreshes after expiry`
  - `bad private key gives a configuration error without the key text`
- [ ] **Step 2: Run the tests.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the tests.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(github): GitHub App installation auth"`

### Task 6.2: GitHub connector

**Files:**
- Create: `backend/src/connectors/github/index.ts`, `schemas.ts`
- Modify: `runner.ts`:
  - `CONFIG_SCHEMAS.github = z.object({ org: z.string().min(1), appId: z.string().regex(/^\d+$/), privateKeyPem: z.string().includes('PRIVATE KEY'), installationId: z.string().regex(/^\d+$/).optional() })`
  - A `github` case in `build()`
- Modify: the frontend connection form (GitHub)
- Modify: `backend/src/jobs/scheduler.ts`. Add `connector-sync-daily-github-fanout` (`0 3 * * *`), passing `{ fanout: true }` to `executeSync` for GitHub connections.
- Test: `backend/tests/connectors/github.test.ts`, with recorded fixtures

Mapping (spec §4.3 and §5). Paging uses the `Link` header, `per_page=100`.

Every hour:

| Data | Becomes |
|---|---|
| `orgs/{org}/members` and `memberships/{username}` | `account:github:<id>`. Refs: `login`, `email: null` (GitHub gives no usable email, spec §4.3), `isBot: type === 'Bot'`, `orgRole`. |
| `orgs/{org}/teams`, plus `teams/{slug}/members` with `role` | `group:github:<teamId>`. Members `member_of` team, `stated`. |
| `orgs/{org}/repos` | `repository:github:<id>`, name `full_name`. |
| `teams/{slug}/repos` (permissions) | If the team has `admin` on the repo, team `depends_on` repo, `inferred`. Team-level admin is permission, not ownership. |
| `repos/{o}/{r}/collaborators?affiliation=all` | Collaborators with `role_name === 'admin'` `owns` repo, `owner_kind 'key_principal'`, `inferred`. Org owners who inherit admin are excluded, using `orgRole === 'admin'`, so an owner-by-inheritance isn't counted as a repo principal. |

Daily (fan-out):

| Data | Becomes |
|---|---|
| CODEOWNERS (`contents/.github/CODEOWNERS`, then root, then `docs/`) | Each `@user` owner `owns` repo, `owner_kind 'owner'`, `inferred` (CODEOWNERS states review ownership, not accountability). A team owner becomes team `owns` repo, `inferred`. |
| `stats/contributors` (202 means retry on the next daily run, not an error) | Fact `last_used_at` on the repo, from the latest week with commits, `inferred`. |

- Coverage keys: `github_member`, `github_team`, `github_repo`, `github_collaborator`.

- [ ] **Step 1: UI approval.** Send a text mockup of the GitHub form (organization, App ID, private key upload, optional installation id). Wait for approval.
- [ ] **Step 2: Write the failing tests.**
  - `members become accounts with no email`
  - `team membership is stated member_of`
  - `repo admin collaborator becomes inferred key_principal`
  - `org owner inheriting admin is not a repo principal`
  - `CODEOWNERS user becomes inferred owner`
  - `stats 202 is not an error`
  - `Link header pagination`
  - `hourly sync skips fan-out; daily includes it`
- [ ] **Step 3: Run the tests.** Expected: FAIL.
- [ ] **Step 4: Implement.**
- [ ] **Step 5: Run the tests.** Expected: PASS, including the grade-rules test.
- [ ] **Step 6: Commit.** `git commit -m "feat(github): read-only GitHub connector with daily fan-out"`

### Task 6.3: GitHub live and linking

- [ ] **Step 1: Do the live run.** R4, probe, record fixtures (with approval), sync.
- [ ] **Step 2: Link the queue.** The owner links GitHub accounts in the queue (Task 2.7). I report the queue before and after.
- [ ] **Step 3: Report.** Repos, teams and collaborators against GitHub. The owner checks the three forced username mismatches are linked correctly.
- [ ] **Step 4: GATE G6.** Push after approval.

---

## Phase 7: Grant detection (Make, Zapier)

### Task 7.1: Verify the grant endpoints

- [ ] **Step 1: Read the docs, then probe.** Read the official docs for each:
  - Entra `GET /servicePrincipals` and `GET /oauth2PermissionGrants`, and their application permissions
  - GitHub `GET /orgs/{org}/installations`, and whether an App can call it
  - Slack: any non-Enterprise way to list installed apps

  Add a probe check per endpoint to Task 0.1's `probes.ts`, with tests in the same style, and run it.
- [ ] **Step 2: Record the results.** Write each endpoint as verified, not available, or needs a permission, in `phase0-results.md`.
- [ ] **Step 3: GATE G7a.** The owner approves which sources to build, and any extra Entra permission (for example `Directory.Read.All` for grants), which needs a new admin consent.

### Task 7.2: Grant detection

**Files:** extend `entra/index.ts` (and `github/index.ts` if G7a approved it), plus their schemas.

Mapping:

| Data | Becomes |
|---|---|
| A service principal whose `appDisplayName` matches `/zapier\|make\.com\|integromat/i` | entity `vendor:<name>` |
| Each delegated grant `principalId` (a user) to that SP | person `grants_access_to` vendor, `stated` (Entra states the grant) |
| `consentType 'AllPrincipals'` | admin-consented. The edge comes from the consenting app, with no person. |

- [ ] **Step 1: Write the failing tests.**
  - `zapier delegated grant becomes person grants_access_to vendor`
  - `tenant-wide consent has no person edge`
  - `non-matching apps ignored`
- [ ] **Step 2: Run the tests.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the tests.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(entra): detect Make/Zapier through OAuth grants"`
- [ ] **Step 6: GATE G7.** Present the grant report. Push after approval.

---

## Phase 8: Reliability and scale

### Task 8.1: Parallel syncs and one rebuild per batch (S1, S2)

**Files:**
- Modify: `runner.ts`:
  - `syncAll()` enqueues each connection on `connector-sync`, with `singletonKey = connectionId`, instead of looping.
  - The hydrate in `executeSync` goes through `scheduleHydrate()`.
- Create: `backend/src/services/hydrateScheduler.ts`
- Modify: `backend/src/jobs/scheduler.ts`. `connector-sync` queue concurrency is 3.
- Test: `backend/tests/pg/scheduler.test.ts`, `backend/tests/services/hydrateScheduler.test.ts`

**Interfaces:**
- Produces: `scheduleHydrate(): Promise<void>`. It debounces for 3 s. Every caller awaits the same rebuild, so a client polling for "connected" still sees the new data.

- [ ] **Step 1: Write the failing tests.**
  - `three syncs finishing within 3s trigger one hydrate`
  - `a slow connection does not delay others`
  - `same connection never runs twice at once`
- [ ] **Step 2: Run the tests.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the tests.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "perf(sync): parallel connections, one graph rebuild per batch"`

### Task 8.2: Raw payload dedup and retention (S3)

**Files:**
- Create: `backend/db/migrations/011_raw_payload_hash.sql` (`payload_hash CHAR(64)`, plus an index on `(connection_id, resource_type, external_id, payload_hash)`)
- Modify: `base.ts`, raw landing. Insert only when the latest stored hash for the key differs. Unchanged rows record the run in `sync_run.stats.rawUnchanged`.
- Modify: `scheduler.ts`. Add a daily job `raw-payload-prune` (`30 3 * * *`): delete rows older than 30 days that are not the latest version for their key and are not cited by an active edge or fact `source_ref`.
- Test: `backend/tests/pg/rawPayload.test.ts`

- [ ] **Step 1: Write the failing tests.**
  - `identical payload on second sync is not stored again`
  - `changed payload is stored`
  - `prune keeps the latest version and anything cited`
  - `provenance check still passes after prune`
- [ ] **Step 2: Run the tests.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the tests.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "perf(raw): hash dedup and 30-day retention for raw payloads"`

### Task 8.3: Freshness, and leaver suggestions from tool signals (Q12, T5)

**Files:**
- Modify: `backend/src/views/connectionViews.ts`. A connection is `stale` when `last_sync_at` is more than 3 hours old. GitHub fan-out is stale at 27 hours.
- Modify: `backend/src/services/lifecycle/directoryLifecycle.ts`. When a linked account's status turns `departed` (Slack `deleted`, Jira `active:false`, or GitHub removal) and the person is still active in the directory, add a leaver suggestion with `grade 'inferred'` and reason `'<source> account deactivated'`. Never a departure.
- Modify: `runner.ts`. Call the lifecycle diff for every connector type, not only entra/google.
- Modify: `frontend/features/settings/ConnectionsView.tsx` (stale badge)
- Test: `backend/tests/pg/leaverDetection.test.ts`, `backend/tests/views/connectionViews.test.ts`

- [ ] **Step 1: UI approval.** Send a text mockup of the stale badge: "Last synced 4 h ago, stale". Wait for approval.
- [ ] **Step 2: Write the failing tests.**
  - `connection stale after 3 hours`
  - `slack deleted account of active directory person creates inferred leaver suggestion`
  - `tool deactivation never creates a departure`
  - `directory-departed person gets no duplicate suggestion`
- [ ] **Step 3: Run the tests.** Expected: FAIL.
- [ ] **Step 4: Implement.**
- [ ] **Step 5: Run the tests.** Expected: PASS.
- [ ] **Step 6: Commit.** `git commit -m "feat(lifecycle): freshness and tool-side leaver suggestions"`

### Task 8.4: Failure drills

**Files:**
- Test: `backend/tests/pg/failureDrills.test.ts`, which simulates every failure class with an injected fetch
- Create: `docs/test-org/failure-drills.md`, the live drill log

- [ ] **Step 1: Write the tests.**
  - `revoked credential: failed run, nothing closed, last_error set`
  - `unreachable host: failed run with network reason`
  - `429 storm: retries then succeeds`
  - `schema drift: core error naming the field`
  - `visibility drop: guarded`
- [ ] **Step 2: Run the tests.** Expected: PASS. These pin behaviour already built in Tasks 3.1–3.3. Any failure here is a bug in those tasks, not new scope.
- [ ] **Step 3: Live drills, with the owner.**
  - Revoke the Slack token.
  - Remove the bot from one private channel. Expect the visibility guard if the drop is over 20%. Otherwise the edges close, which is correct.
  - Disable one test user in Entra. Expect a leaver.
  - Change one Jira project lead.

  Record the observed results in `failure-drills.md`.
- [ ] **Step 4: Commit.** `git commit -m "test(reliability): failure drills, unit and live"`
- [ ] **Step 5: GATE G8.** Push after approval.

---

## Phase 9: Deploy and validate

### Task 9.1: Ground truth into the repo

**Files:**
- Create: `docs/test-org/ground-truth/`, holding the received `/shared/` files with any credential column removed, and a README saying where each came from.

- [ ] **Step 1: Copy the files in.** If R1 didn't get them, record "not received", and validation uses counts read from each platform's UI on the day (spec §9).
- [ ] **Step 2: Commit, after the owner approves the contents.**

### Task 9.2: Deploy to the demo deployment

- [ ] **Step 1: Move the connections to the live database.** On R7's database:
  - Run `bootstrapUser.ts` for the demo admin (the account the owner chose).
  - The owner adds the five connections in Settings on the deployed app.

  Connection configs are encrypted with the deployment's own key, so they can't be copied from local.
- [ ] **Step 2: Complete R8.** The owner does it. Restart Render.
- [ ] **Step 3: Check the deployment.**
  - `GET /health`
  - `GET /api/connections` shows all connected and none stale
  - `npm run check:provenance` against R7's database exits 0

### Task 9.3: Validation report

**Files:**
- Create: `docs/test-org/validation-report.md`

- [ ] **Step 1: Counts per platform.** The database vs ground truth, for A1–A5.
- [ ] **Step 2: Identity.** Directory people, accounts per source, linked by method (stated or confirmed), the queue size, and the three alias mismatches and three GitHub mismatches resolved (A6).
- [ ] **Step 3: Findings.**
  - Orphan scan output.
  - Single-owner assets with criticality unconfirmed. A7 is reported as "N candidates, 0 confirmed", matching spec §10.2 item 4.
  - Comparison with `spof-list.md`, if received.
- [ ] **Step 4: Provenance and mutation.** Provenance check output. Mutation test results (spec §9).
- [ ] **Step 5: GATE G9.** Present the report. The owner approves switching demos to the live org. Final push.

---

## Execution notes

- Order is strict: phase 0, then 1, then 2, then 3 before any of phases 4–6. Phases 4, 5 and 6 depend only on phase 3 and may run in any order. The order above is by identity value.
- If any probe, live sync or count disagrees with this plan, stop and bring the owner the real output. Never adjust a test to match surprising data without approval.
- Every phase gate restates which runbook steps the owner still owes.
