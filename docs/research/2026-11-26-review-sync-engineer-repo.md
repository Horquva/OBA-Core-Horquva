# Review: `origin/sync_engineer_repo` (Engineer A, 14 commits)

Reviewer: Engineer B (Affan). Date: 26 November 2026. Branch tip: `decd2532`, based on `37ab6310`.
Plan: `docs/superpowers/plans/2026-11-23-real-platform-connectors.md`.

## 1. Summary

The branch covers 0.A, 1.1, 1.2, 1.3, 1.5 (backend), 1.7, 2.2, 2.3, 2.5 (core) and 2.6. The core of the work is sound: fixtures are out of the runtime, the server refuses to start without a database, `identity_link` is in place with the right partial indexes, and automatic linking and attribution follow the plan's rules with good test coverage.

It should not be fast-forwarded into `mvp/v1-continuity` yet. Three things block it (section 3). Section 4 lists changes I'd like before G2. Section 5 is minor.

## 2. Verification

| Check | Result |
|---|---|
| Backend `tsc` | clean |
| Frontend `tsc` | clean |
| Backend unit (`npm test`) | 61 files, 475 tests, all pass |
| Postgres (`npm run test:pg`, local `horquva_test`) | 53 of 55 pass; 2 fail (see 3.1 and 3.2) |
| Playwright e2e (local `horquva_e2e`) | 6 of 6 pass (2.2 min), seeded through `tests/e2e/seedE2E.ts` |

## 3. Blocking

### 3.1 Unmatched n8n accounts are no longer queued

`identity/syncHook.ts` now selects only `kind === 'account'`, but `connectors/n8n/index.ts` still emits n8n users as `kind: 'person'`. Before this branch they were queued; now they are silently dropped. `tests/pg/connectors.test.ts` ("queues n8n accounts nobody in the directory matches") fails for this reason.

This is a regression on its own, and it closes when B's half of Task 2.5 lands (n8n and ai_admin emit `account:<source>:<id>`). Proposal: B does that half on top of this branch, and both land together.

### 3.2 The provenance pg test never reaches the code under test

`tests/pg/provenance.test.ts` inserts `config_encrypted = 'enc'` into a JSONB column and fails with `invalid input syntax for type json`. Task 1.7 is therefore unproven on Postgres. Please insert valid JSON (for example `'{}'`), and add the plan's missing test `the CLI exits 1 when any entity is unbacked`.

### 3.3 `STATED_RULES` does not match Task 3.4, and changes to it need the owner

The plan's table keys a rule on (source, edge type, owner kind). `assertGradeRules` keys on (source, edge type, target kind taken from the `toId` prefix) and ignores `ownerKind`. So an `owns` edge with `ownerKind: 'creator'` or `'key_principal'` passes as `stated`, which the global constraints forbid.

The set also has entries the plan does not allow:

- `connector:entra|grants_access_to|vendor`: derived from permissions, so it must be `inferred`.
- `connector:jira|backs_up|*`: allowed only if G0 chooses option (a). G0 hasn't run.
- `connector:github|owns|repository`, `connector:slack|member_of|group`.
- All `google`, `csv` and `ai_admin` rules.

Please make the set match the Task 3.4 table exactly and key it on `ownerKind` for `owns` edges. Any addition goes to the owner as its own change (plan C.5, step 4).

## 4. Before G2

### 4.1 Provenance query: per-connection join and cost

The plan joins `raw_payload` to an entity on `(connection_id, external_id)`, with the ref key for that connection's type. `findUnbackedEntities` instead matches any ref key from any connector against any raw payload, including the CSV `email` key. An entity can be "backed" by an unrelated connection's payload.

It is also a correlated `NOT EXISTS` that runs `jsonb_each_text` against every `raw_payload` row for each entity. The only index is `(connection_id, resource_type, external_id)`, so this is a full scan per entity. `raw_payload` grows every hour until Task 8.2, so this will be slow against the 20k benchmark. Suggest resolving each entity's connection and ref key first, then a keyed lookup.

### 4.2 Closing an attributed edge never reaches Postgres

Attributed edges exist only in memory (`attributeAccounts` during hydrate). `graphRepo.closeEdges` matches on `(from_id, to_id, type)`, so closing a person-to-asset attributed copy updates no row. The raw account edge stays open, and the copy reappears on the next hydrate.

Today this is harmless: `attestationService.ts:495` closes the copy but adds a `confirmed` edge that outranks it, and `:505` closes the raw edge too because its predicate matches both. Any later path that closes an owner's edge (handover reassignment, for example) would fail silently. Suggest that closing an edge whose `sourceRef` carries `|link:` also closes the underlying account edge, with a test.

### 4.3 Task 1.3 has no test

The plan's test `google connector without service account key throws a configuration error naming serviceAccountKeyJson` is missing. `tests/connectors/directory.test.ts` still builds the Google connector with `serviceAccountKeyJson: '{}'`.

### 4.4 `postTokenRequest` is not audited

Task 0.A said to ship `postTokenRequest` complete, and Task 3.3 says every call is audited with the host only. There is no audit call yet. Fine to land with 3.3, but please note it in the hand-off message (plan C.6).

## 5. Minor

- `REF_KEYS` is `Record<string, string[]>`, not `Record<string, string>` as planned. That's reasonable; I'll update the plan.
- `runner.ts` treats only `entra` and `google` as directory syncs. CSV is also a directory source.
- The `037eb87e` title says dev sign-in uses real users, but `frontend/lib/session.tsx` is untouched. That half is mine (Task 1.5 UI). A title like "bootstrap app accounts (backend)" would be accurate.
- `backend/.env.example` still shows `DEMO_LOGIN_EMAIL=alex@acme.com`.
- Removing `demo:reset` ends the October demo deployment's reset procedure. That's intended (the plan repurposes that deployment), but nobody should run the old runbook after this lands.
- `identity_queue.resolveLink` writes no `identity_link`, and migration 009 drops `linked_person_id`. Admin links from the queue have no effect until Task 2.7. It was a no-op before too, so this isn't a regression, but 2.7 must land before G2.

## 6. Process

- Plan C.5 uses local `a/<task>` branches, fast-forwarded after review, with nothing pushed except `mvp/v1-continuity` at a gate. A shared pushed branch also works. Let's agree on one and update the plan.
- Phase 2 started before G0 and G1. The plan's critical path puts G1 and 0.A before Phase 2. The work is fine, but G1 still needs to be presented and approved before any of this is pushed.
- Task 1.3 was in B's lane. That's harmless; for future tasks, let's change lanes explicitly in chat first.

## 7. Proposed merge order

1. A fixes 3.2 and 3.3 on the branch.
2. B lands Task 2.5 (connectors) on top, which fixes 3.1.
3. Both run the full checks, including Playwright.
4. Fast-forward `mvp/v1-continuity` locally. Push only after G1 is approved.

## 8. Resolution (26 November, same day)

The owner asked B to fix the findings and merge. A's 14 commits were rebased onto `af4cd5fa` (docs-only, no conflicts) and fast-forwarded into local `mvp/v1-continuity`, authorship kept. Then:

| Finding | Resolution |
|---|---|
| 3.1 n8n accounts not queued | B's Task 2.5 half: n8n and OpenAI users are `account:<source>:<id>`; owner and credential edges start at the account. |
| 3.2 provenance pg test | Valid JSON and the current `attestation_task` columns; plus `the CLI exits 1 when any entity is unbacked` and a cross-connection case. |
| 3.3 `STATED_RULES` | Keyed on (source, edge type). `owns` needs `ownerKind` `owner` (absent counts as owner until connectors set it in 3.4). Jira `backs_up` sits behind `JIRA_BACKS_UP_STATED = false` until G0. The Google and CSV literal-field rules were kept, because existing connectors emit them. That addition beyond the plan's table needs the owner's sign-off. |
| 4.1 provenance join | Set-based query: a payload backs an entity only through a ref key of its own connection type. `REF_KEYS` lists only keys connectors write. |
| 4.2 attributed-edge close | `ContinuityGraph.closeEdges` closes the stored edge behind an attributed copy (and the reverse), and persists only stored edges. |
| 4.3 Task 1.3 test | Added to `tests/connectors/directory.test.ts`. |
| 4.4 token audit | Left for Task 3.3. |
| 5 CSV as a directory | Withdrawn. `syncHook` and the orphan scan treat only Entra and Google as directories, so the runner is consistent. |

Still open: n8n `model:*` entities (derived from workflow nodes) have no ref key, so the provenance check will report them once it runs against live data. The Anthropic model list in `connectors/ai_admin` is hard-coded, which breaks the no-fabricated-data rule.
