# REVAMP VALIDATION AUDIT & REVERSE-ENGINEERING REPORT

> **Scope**: Every code change from the revamp build-out (PR #199 + branch `feat/uuid-primary-keys`, Phases 0–4), validated against the two prior baselines of the layered arc.
> **Method**: fresh verification baseline → cross-layer metrics → engine benchmarks (legacy vs new on identical fixtures) → whole-app smoke harness (24 routes driven) → static SQL cross-validation of migrations 19–24 → per-module over-engineering interrogation.
> **Posture**: verdicts-only — no product code was changed during this audit; findings carry proposed fixes for explicit approval.
> **Date**: 2026-09-27

---

## 1. Executive Verdict

The revamp achieves what it set out to do: the three MVP features are real engines with evidence trails, the write path exists with idempotency and a longitudinal record, multi-tenancy is enforced at three levels, and the ingestion layer a connector needs is in place. **1,161 automated checks across 51 suites pass, Python parity is exact to 2.8e-17, and the whole-app smoke harness drives 24 routes with 23 passing.**

However, this audit's whole-app dimension surfaced **two critical defects that every per-module test missed**, one of them in the inherited Engine A integration:

| # | Severity | Finding | Status |
|---|---|---|---|
| F-1 | **Critical** | **`blastRadius()` semantics are inverted.** The eIRWR walk flows *upstream* (root-cause direction — correct for Engine B's U variable), but `blastRadius()` reads it as downstream impact. A leaf agent with **zero dependents scores 100/100** (its mass flows up to its hub) while the true hub scores lower; belief scores are unnormalized so any connected node clamps at 100. Consumers affected: `agent-spofs` ranking, replaceability's criticality axis, `changeImpact.blast_radius_score`. | **OPEN — fix proposed (§6.1)** |
| F-2 | **Critical** | **`app.use(express.json())` consumes webhook bodies before the ingest router.** In the assembled app every JSON webhook (GitHub/Slack/Standard-Webhooks — i.e., all of them) fails signature verification with 401, because the router receives `req.body` as a parsed object and signs `"[object Object]"`. Per-router tests passed because they mounted the router without the global JSON parser — only the whole-app harness caught it. The CSV importer survives (`text/csv` isn't JSON-parsed). | **OPEN — one-line fix proposed (§6.2)** |
| F-3 | High | Tenant sweep v1 missed multi-line query chains (83 sites, incl. cross-tenant write on the owner PATCH) | Fixed (a11ed72) |
| F-4 | High | Tenant degraded mode was fail-open on transient orgs-lookup errors | Fixed (a11ed72) |
| F-5 | High | Brain graph singleton mixed orgs on boot; `/graph/reload` let a caller swap the global graph | Fixed (a11ed72, primary-org binding) |
| F-6 | Critical (migration) | sql/19 twin lifecycle bugs (`asset_uuid` never declared; `systems.owner_uuid` untyped + no fill/drop/rename) | Fixed (a11ed72) |
| F-7 | Medium | `app_users` (password hashes) had no RLS | Fixed (a11ed72) |
| F-8 | Medium | Agent prompt caching premise was false (volatile block inside `systemInstruction`) | Fixed (Phase 4.4) |

**The headline lesson (test-design):** 51 suites can be green while two critical defects ship — because unit suites verify modules against their *intended* semantics ("blast radius is non-zero", "signature verifies") and never assemble the whole app. The smoke harness is now the missing third leg: module tests + parity suite + whole-app dry run.

---

## 2. Layered Comparative Metrics (the three-codebase arc)

| Metric | Layer 1: Heuristics (`1aa0828`) | Layer 2: Engines (PR #199) | Layer 3: Revamp (HEAD) |
|---|---|---|---|
| domain+lib LOC | 3,992 | 4,766 (+19%) | **6,502** (+36% over L2) |
| routes LOC | 9,316 | 9,336 | **10,145** |
| write endpoints (total) | 10 | 10 | **23** |
| — of which graph-mutating | **1** (owner PATCH) | **1** | **12** (owner PATCH via mutations + 10 CRUD + 1 reassign) + 2 staging (webhook/CSV) |
| test files | 45 | 46 | **57** (11 new suites) |
| automated checks | — | ~900 | **1,161, 0 failing** |
| schema | 42+ tables, SERIAL PKs, 0 org columns, 0 RLS on business tables | same | **62 live tables, UUID PKs on the 6 entity tables, org_id on 54, RLS on 59** (52 via the sql/20 dynamic loop + 7 explicit), tenant policy verified complete by static diff |
| risk engine | additive point table (35/30/27/18/25/20) + unweighted BFS | Engine A/B (kept) | Engine A/B **wired into** SPOF route, human risk, replaceability, concentration, change impact |
| change record | none | none | `dependency_change_log` + trigger backstop + score/evidence ledger |
| ingestion | none | none | staging + identity bridge + HMAC receiver + CSV importer |

**Growth is not bloat, by layer:** L1→L2 +774 LOC replaced a 15-factor additive table with two published engines + a Python parity harness; L2→L3 +1,736 domain/lib LOC delivered six new domain engines (replaceability, concentration, scoreLedger, mutations, changeImpact, volatility), tenancy infrastructure, and the ledger — ~290 LOC per engine. The routes layer grew only +809 LOC for 11 new write endpoints because every write routes through one 250-line mutation layer.

---

## 3. Engine Benchmark — legacy vs two-engine pipeline (same fixture)

Full transcript: `backend/risk_engine/benchmark_layered_comparison.js` (the legacy engine is re-implemented inline from the historical constants; audit instrumentation only).

**Per-agent scores (6-agent slice):**

| Agent | Legacy additive | Engine B posterior |
|---|---|---|
| Agent1 (critical hub, documented, unbacked owner) | 50 | 12 |
| Agent3 (high, documented) | 30 | 12 |
| Agent5 (low, documented) | 30 | 2 |

The divergence is the point: legacy +20 for the *recorded* 'critical' label (the removed feedback loop) while Engine B prices actual evidence — and reports the hub's true impact where it belongs, in blast radius (§4 below — which is also where finding F-1 lives).

**The compounding case the original audit called out ("35+18=53 lies"):**
- Legacy: 53 (linear 35+18)
- Engine B: **92** (P(Critical)=0.88) — the CPT anchor (0,0,2,2)=92; non-linear compounding, exactly as the audit demanded.

**Monotonicity:** adding a backup: legacy table has no lever (backup state invisible); Engine B 12→2, monotone ✓.

**Cascade (14 nodes/12 edges, seed scale):** legacy BFS sweep 0.055 ms, Engine A sweep 0.152 ms (memoized) — both sub-millisecond; the difference is qualitative (κ-weighting, attenuation), not speed. **But see F-1: the blast-radius reading is inverted.**

---

## 4. Dry Runs — whole-app smoke harness

`backend/risk_engine/audit_smoke_harness.js` boots the real Express app (auth → tenant middleware → 15 routers) over an in-memory Supabase and drives 24 routes:

```
24 routes driven, 23 ✓, 1 ✗ (the F-2 webhook-body defect, reproduced end-to-end)
change-log rows written: 5 | staged payloads: 1 | audit rows: 11
```

Verified flows include: real login → token; all five Feature endpoints (200); RBAC denials for member role on CRUD and succession (403 with role named); owner PATCH → change-log row → **idempotent replay** (three calls, one record, `replayed:true`); CRUD create/edge-add with impact envelope; D-70 succession; HMAC-signed ingest → staged; tampered signature → 401; CSV roster → staged + processed; unauthenticated read → 401; score ledger + volatility responding before and after mutations.

**Live-DB verification checklist** (to execute against production once migrations 19–24 are applied):

```
1. cd backend && node run_migrations.js                    # applies 19–24; expect "all migrations recorded" on re-run
2. Verification queries (Supabase SQL editor):
   select table_name from information_schema.columns where column_name='org_id';            -- expect 54
   select entity_type, count(*) from agents... -- id type check: select data_type from information_schema.columns where table_name='agents' and column_name='id';  -- expect uuid
   select count(*) from pg_policy where policy_name='tenant_isolation';                      -- expect ≥ 59
3. node risk_engine/audit_smoke_harness.js                 # offline re-check after migration
4. Live HTTP: login → GET /api/predictive-risk/agents → PATCH owner with Idempotency-Key (send twice; expect replayed:true on the second) → POST signed webhook → GET /api/briefing/volatility
5. Watch for: [tenant] degrading warnings (orgs table must resolve), graph reload after PATCH (source.loadedAt moves)
```

---

## 5. Static SQL Validation (migrations 19–24)

Mechanical cross-checks (scripts, not eyeballs): every `update`/`rename` target in 19 declared as a twin ✓; every re-added FK column exists in the final schema ✓; every table referenced by 20–24 is live ✓ (62 tables); RLS coverage diff: every `org_id` table covered (52 dynamic via the sql/20 loop + 7 explicit) ✓; `audit_log` deliberately policy-less (RLS enabled + revoke → deny-all for non-service roles, fail-closed by design). The id-mapping, FK-readd and RLS checks caught three migration-breaking bugs during the build (F-6) — the migration files are now consistent, but **they have never executed against a real Postgres** (hence checklist step 1).

---

## 6. Over-Engineering Interrogation (verdicts-only)

Each module was asked: is this necessary, is it over-built, and what would the simpler correct alternative be?

| Module | Verdict | Reasoning |
|---|---|---|
| AsyncLocalStorage tenant context (lib/tenant.js) | **KEEP** | The alternative — threading `orgId` through 130+ call sites — is more code, more churn, and one forgotten parameter is a tenant leak. The ALS is 15 lines and makes scoping a single choke point (`applyOrgScope`). |
| opossum circuit breaker on graph load | **KEEP (borderline)** | A hand-rolled retry loop would drop the dependency, but the breaker also guards the reload endpoint against concurrent failure storms and gives the half-open probe for free. Cost: one small, mature dep. Not over-engineered, close to the line. |
| sql/23 out-of-band triggers | **KEEP** | ~60 lines of SQL; the change log's credibility with auditors depends on "bypassing the API leaves a record". Cheapest possible honesty guarantee. |
| Split-window CUSUM on the weekly window | **SIMPLIFY LATER** | h=5 is statistically unreachable in a 3–4-point monitored half-week — the weekly `drift` field is inert by construction. The 30-day drift is sound. Simplification: drop the weekly drift field, keep velocityBand (already done semantically — velocityBand carries the weekly signal). Cosmetic. |
| BFS `cascadeReach` retained beside Engine A | **KEEP** | The count and the probability are different true statements the UI labels separately ("largest downstream chain" vs blast radius). Collapsing them would lose a true, cheap answer. Maintenance cost noted: two graph representations must stay direction-consistent — see F-1, where exactly this bit. |
| CRUD layer before any connector ships | **KEEP (borderline YAGNI)** | Justified by two real consumers today: the ingest processor uses EMPLOYEE_* mutations, and admin edits need the write surface; deleting it would orphan the mutation layer's only REST exposure. If connectors slip months, the employees PUT is the first thing to drop. |
| Full UUID migration (user decision) | **KEEP, with documented residual risk** | The twin-swap migration is the riskiest artifact in the set (three bugs found by static validation, one class of them would have broken mid-transaction). Mitigation: the static checks + checklist step 1 (run on staging first). The simpler composite-ID alternative would have left every consumer paying the namespace tax forever. |
| dependency-scan composite re-deriving SPOF verdicts inline | **SIMPLIFY LATER** | The scan re-implements ~15 lines of the agent-spofs section rather than calling it. Minor duplication, no correctness risk today (both read the same roots); consolidate when the scan grows. |
| Volatility ledger vs score ledger (two append-only tables) | **KEEP** | Different questions: `dependency_change_log` records *events* (what changed, its cascade), `score_history` records *conclusions* (what we scored, replayable from its evidence tuple). Merging them would couple event capture to score cadence. |
| 11 new test suites (~150 checks) for ~4,900 changed LOC | **KEEP** | Ratio ≈ 1 automated check per 33 changed lines, and the suites caught 3 real engine-level defects during the build (cloneRoots key iteration, breaker volume threshold, CUSUM baseline). Under-, not over-invested — F-1/F-2 prove the gap is *whole-app* testing, not module testing. |

**Was any of it unnecessary?** Two honest near-misses: the weekly CUSUM field (inert) and the scan's inline SPOF re-derivation (duplicated). Neither is harmful; both are recorded as simplify-later. Nothing built was found redundant enough to recommend removal.

---

## 7. Proposed Fixes for the Two Open Critical Findings

**F-1 — blastRadius direction + saturation.** The walk flows node → its *dependencies* (root-cause direction; correct for U). Blast radius needs the transpose: seed the node, read mass on its *dependents*. Minimal fix: build a second eIRWR engine instance from the reversed edge list (`source`/`target` swapped) inside `buildEngine`, and read `blastRadius` from it; address saturation by reporting the κ-weighted mass of dependents *excluding* the seed, normalized against Σκ of reachable dependents (calibration constant authored + honesty-tabled). Then re-point the three consumers and re-baseline the monotonicity/sensitivity assertions the current tests lack (a hub must outrank a leaf; upgrading edge criticality must move the number).

**F-2 — webhook body consumption.** One-line class of fix: mount `/api/ingest` before `app.use(express.json())` (it is already above the auth gate for the same reason), or add `verify: (req,res,buf)=>{req.rawBody=buf}` to the global parser and have the receiver sign `req.rawBody`. First option is the smallest diff and cannot regress other routes.

---

## 8. Verification Numbers (this audit, this tree)

- Backend: **1,161 checks / 51 suites / 0 failed** (`node tests/run-all.js`)
- Python parity: CPT tensor 243/243 entries at max err 2.8e-17; power iteration parity 0.0; anchors exact
- Frontend: `next build` ✓ (all 21 routes prerendered)
- Smoke harness: **24 routes driven, 23 ✓**; the 1 failure is F-2 reproduced
- Static SQL: 0 reference problems across 19–24; RLS coverage complete
- Benchmarks: legacy vs engine per-agent table, compounding case 53 vs 92, monotonicity ✓, cascade timings 0.055/0.152 ms (semantics caveat F-1)

*Sign-off: Validation Audit — 2026-09-27. Verdicts-only posture; no product code changed during this audit. The benchmark and smoke harness are committed as audit instrumentation (`backend/risk_engine/benchmark_layered_comparison.js`, `backend/risk_engine/audit_smoke_harness.js`).*
