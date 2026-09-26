# OBA Core Risk & Cascade Engine — Expanded Implementation Plan (v2.1)

> **Status**: Draft for implementation — supersedes `IMPLEMENTATION_PLAN.md` §5 (roadmap) and corrects its §3 (engine specs) where marked.
> **Basis**: full read of the legacy code (`backend/domain/derived.js`, `backend/domain/simulations.js`, all consumers), full read of the three papers, and the graphify knowledge graph of this repo.
> **Convention**: every claim carries a file:line reference or a paper section. Items marked **[AUTHORED]** are design decisions (not derivable from papers or data) and are called out as such — same honesty standard `derived.js` already applies to its authored formulas.

---

## Part 0 — What changed vs the original plan (read first)

The original plan's *direction* is correct and is kept: additive point penalties → discrete BBN posterior; unweighted BFS → continuous random-walk cascade. The following corrections came out of validating it against the code and the papers:

| # | Original plan says | Validation result | Resolution |
|---|---|---|---|
| C1 | eIRWR params `R_base=0.20, β=1.5, ρ=0.15, q=2.5` | Paper's defaults are `R_base=0.1, β=2.0, ρ=0.3, q=2.0, μ=0.1` (§4.1). The plan **omits μ entirely** (belief momentum, Eq. 11) — Algorithm 1 cannot be implemented without it. | Use the paper's defaults; add μ=0.1. See SPEC-4. |
| C2 | "converging in <30 iterations (<5 ms)" | Paper Fig. 6: eIRWR needs **~65 iterations** at α=0.15 (vs ~28 for plain PPR). | Convergence guard: ε=1e-6, hard cap 200 iterations; perf target re-set in §6. |
| C3 | Edge weights `critical=3.0, high=2.0, medium=1.0, low=0.5` | Real `dependencies.dependency_type` vocabulary is `critical/high/normal/low` — **`medium` never occurs on an edge** (it is the *entity* vocabulary; `definitions.js` D-65 aliases their rank, not their label). The `dependencies.strength` INTEGER column (seed values 30–90) is real data the plan ignores. | λ map uses `normal`; strength-based weighting is the default with the type map as fallback. See SPEC-4.2. |
| C4 | CPT given as 2 boundary rows + 2 compound examples of 81 rows | The remaining 75 rows are undefined; hand-writing 243 numbers is unauditable. | A deterministic, verifiable generator (two-stage chain logit) reproduces **all four anchors exactly** (verified numerically; see SPEC-2). The 81×3 tensor is generated, then validated by `pgmpy.check_model()` in the Python reference. |
| C5 | "Regression Safety: 100% pass on all 12 existing test suites" | `tests/derived.unit.test.js:237` asserts the additive identity `predictedScore === Σ contributingFactors`, and :231/:234/:235 assert the literal `RISK_FACTORS` point values. **The BBN replacement necessarily breaks these by design.** | These assertions are rewritten as posterior-axiom tests (SPEC-7). "100% pass" is redefined as: all suites pass *after* the enumerated rewrites. |
| C6 | CPTs attributed to arXiv:0906.3968 and :2505.06281 | Paper 2 explicitly **excludes expert assessments** and learns structure+parameters from loss time series (synthetic, 3 nodes). Paper 3 is binary-cardinality, unsmoothed MLE, has **no validation section**, no cascade-exposure node, and garbled CPT tables. Neither paper contains our CPT numbers. | The DAG *shape* and the "BN captures correlation additive schemes miss" thesis are citable. All CPT values, the 3-state cardinalities, the U-variable, and the score formula are **[AUTHORED]**, in the same sense `derived.js`'s pillar formulas are authored. Documented in SPEC-2.0. |
| C7 | Plan §3.1.6 blast-radius formula + severity thresholds | Not in the eIRWR paper (the paper outputs a root-cause ranking, not a blast-radius score). | Kept (they're sensible) but marked **[AUTHORED]**. κ values defined via `entityCriticality`. See SPEC-4.5. |
| C8 | "Replace lines 420–589" | `predictiveRisk` is `derived.js:476-589`; `cascadeReach` is `:154-167` and is separately consumed by `routes/dependencies.js:6,109`. | `cascadeReach` (the BFS count) is **kept** for compatibility; the continuous engine is additive. See SPEC-6. |

---

## Part I — Problem validation (original flaws + newly found ones)

### 1.1 Claimed flaws — all verified

| ID | Claim | Verified at | Verdict |
|---|---|---|---|
| F1 | Linear additive fallacy, clamp at 100 | `derived.js:452-463` (RISK_FACTORS), `:558` (`clamp(sum)`) | **Confirmed.** Factors are added across distinct dimensions (ownership, blast radius, docs, state, recorded risk). |
| F2 | Factor independence treated as additive | `derived.js:558` | **Confirmed** — and worse: the factors are *correlated by construction* (an ownerless agent is almost always also undocumented; both trace to the same missing governance). |
| F3 | Circular self-reference (`agent.risk` → +20 on its own score) | `derived.js:550-556` | **Confirmed.** `recordedRisk` is also still echoed next to `predictedScore` (`:567`), so the circularity is visible to consumers as "score influenced by the label it is compared against". The BBN removes it: recorded risk becomes *evidence*, not a penalty — see the O/D/S/U decision in SPEC-1 (recorded `agent.risk` is deliberately **not** an evidence variable; it is the label `isEmergingThreat` is compared against, preserving that feature's meaning). |
| F4 | Binary percolation cascade (P=1.0 across all hops) | `derived.js:154-167` (`cascadeReach`), `simulations.js:25-41` (`cascadeFrom`) | **Confirmed.** No edge weights, no damping; `severityFor` (`simulations.js:59-67`) then thresholds raw counts (≥5 ⇒ critical). |
| F5 | Unweighted edges | `derived.js:142-151` (`dependencyIndex` keeps `dependency_type` but nothing downstream uses it; `strength` is not even selected into the index) | **Confirmed.** |

### 1.2 Newly found problems (not in the original plan)

| ID | Problem | Location | Impact on this work |
|---|---|---|---|
| P9 | **Dead `healthDelta` for two of five scenarios.** `platformDown` mutates `ai_platforms.status='down'` and `workflowDisruption` mutates `workflows.status='disrupted'` — but *nothing* that `orgHealth` reads consumes those fields (its five sub-scores read `knowledge_assets`, `workflow_runbooks`, `owners`, `tool_backups`, `agents` via predictiveRisk, `workflow_failures`). Both scenarios therefore return `healthDelta ≡ 0` structurally. (`agentFails` and `employeeLeaves` *do* move the score — their mutations feed `STATUS_FAILED` and the ownership terms.) | `simulations.js:336-337, 384-386, 438-440`; `derived.js:1514-1616` | Out of scope to fix silently (changing mutation semantics is a product decision). Recorded as a known defect; see Part VII Phase 4 note. |
| P10 | **`predictiveRisk` is recomputed ~D+2× per `computeAll`**: once directly (`derived.js:1774`), once inside `humanDependencyRisk` (`:617`), and once per department in `orgHealthByDepartment` (`:1673`). `rankAllScenarios` (`simulations.js:461-484`) runs a full `healthScore` (accountability + predictiveRisk + orgHealth) **per scenario** — ~2×(E+A+P) recomputations. Naively embedding an eIRWR power iteration inside `predictiveRisk` multiplies this by ~65 iterations per call. | `derived.js:1771-1801`, `simulations.js:87-108, 461-484` | SPEC-6.3: the engine is built **once per roots bundle** and threaded through callers (all five scenarios mutate ownership/status only — the dependency *topology* is invariant, so the engine is reusable per scenario run). |
| P11 | **Transitive reach is computed but never scored.** `predictiveRisk` computes `cascadeReach` (transitive, `:572`) for output only; the `high_dependency_count` factor (`:518-525`) uses *direct* dependents. A node with 2 direct dependents that transitively reaches 40 entities scores 12 points. | `derived.js:518-525, 572` | The BBN's U variable (upstream exposure) and the continuous blast radius close this gap; the `high_dependency_count` factor is absorbed into U. |
| P12 | **`orgHealthByDepartment` mixes dependency graphs across departments**: `filterRootsByDepartment` (`:1641-1664`) does not filter `dependencies`, so each department's `predictiveRisk` sees the *global* graph (including edges whose endpoints are other departments' agents). | `derived.js:1641-1673` | Keep behavior (defensible: blast radius doesn't stop at department boundaries) but make it explicit in the dept-slice docs; the eIRWR engine for department slices reuses the global engine — no per-department rebuild. |
| P13 | **Consumers depend on the literal `single_owner` key**: `routes/briefing/briefing.js:29` computes `hasNoBackupOwner: 'single_owner' in top.contributingFactors`; `routes/predictive/predictiveRisk.js:53-57` *sums* `contributingFactors` values to rank `topRiskDrivers`. | Consumer registry §5 | SPEC-3.4 defines the new attribution keys and the two-line briefing fix. |
| P14 | **A third banding scheme** for the same score: `signals.js:47-49` re-bands `predictedScore` at 40/70 (vs `threatLevel`'s 35/55/75). | `routes/signals/signals.js:43-56` | Keep the numeric `predictedScore` contract (0-100 int) so this keeps working; flag the inconsistent bands in the glossary. Do not unify in this work (scope). |
| P15 | **`RISK_FACTORS` is a public constants surface**: exported at `derived.js:1879` via `derived.constants`, asserted by tests, and reused by `humanDependencyRisk` (`:647,652`). | `derived.js:1875-1883` | SPEC-3.5: `humanDependencyRisk` keeps its formula but re-anchors its two borrowed constants to named `WORKFLOW_EXPOSURE_SCALE` / `TOOL_EXPOSURE_SCALE` (values 27/30 unchanged — they were always standalone heuristics that happened to borrow the scale). |
| P16 | **`metricGlossary.js` will be false after the swap**: its `predictiveRisk` entry (lines 29-38) documents the point table, the 35/55/75 bands, and `computedIn`. | `domain/metricGlossary.js:29-38` | Phase 5 rewrites the entry (definition, provenance, authored flags). |
| P17 | **Evidence-mapping inconsistency already present**: `predictiveRisk` treats an agent with *zero* knowledge-asset rows as documented (no `undocumented` factor, `:536-540`), while `ownedAssetBase` (`:826-837`) treats zero rows as *not* documented (conjunction over empty set = false). Same fact, two answers, two files. | `derived.js:536-540` vs `:831-837` | SPEC-1 fixes D to "no rows ⇒ Undocumented (0)" — the stricter, consistent reading. **This intentionally changes scores for unassessed agents**; flagged as a behavior change. |
| P18 | **Free-text enum columns**: `agents.status`, `agents.risk` have no CHECK constraints (schema `sql/01_schema_migration.sql:74-78`). Any coercion must use `definitions.normalizeLevel` semantics and an explicit `unknown` path. | schema; `definitions.js:28-56` | SPEC-1 coercion table. |
| P19 | **`isEmergingThreat` must survive**: consumers (`executive.js:119`, `pageContext.js:79,176`) use it; it is defined as *computed band > recorded band* (`derived.js:569`). With BBN scores this still works — but only if `agent.risk` stays out of the evidence (see F3 resolution). | registry §5 | SPEC-3.3. |

---

## Part II — What the papers actually give us (and what they don't)

### 2.1 Paper 1 — eIRWR (arXiv:2608.08073) — Engine A's real spec

Full algorithm extracted (Algorithm 1, Eqs. 1-11). Key points the implementation must honor:

1. **Direction convention (critical).** With update `r ← M·r`, score flows **from a failing dependency into its dependents** (callee→caller in microservice terms). Mapped to OBA: an edge `source depends_on target` means failure at `target` propagates to `source`. This is exactly our blast-radius direction. Walking the transpose is the paper's measured catastrophic case (MRR ≈ 0.01, Table 4).
2. **Weight matrix** (Eq. 1): row-stochastic `w_ij = λ_ij / Σ_k λ_ik` — weights are *relative within each dependent's row*.
3. **Structure**: `M = RowNorm(M_base·diag(C) + A_bwd + A_self)` where `M_base = diag(1−R)·W` (row scaling), `diag(C)` scales **columns** (callee belief), `A_bwd[j,i] = ρ·C_i` on forward edges without a reverse edge, `A_self[i,i] = max(0, C_i − max_j M_fwd[i,j])`.
4. **Outer loop**: `b = (1−μ)s_obs + μr`, `C = b/max(b)`, sharpened teleport `v = b^{q_adapt}/‖b^{q_adapt}‖₁`, `q_adapt = 1 + (q−1)·min(1, max(0, (σ−5)/15))`, `σ = b_max/b̄`. Inner loop: `r ← (1−α)Mr + αv` until `‖Δr‖₁ < ε`.
5. **Parameters (paper §4.1)**: α=0.15, R_base=0.1, β=2.0, ρ=0.3, q=2.0, μ=0.1, ε=1e-6, n_outer=1 ("suffices for most incidents", §3.5).
6. **Paper ambiguities and our decisions** (each flagged A# in the extraction; decisions here are binding for both the JS and Python implementations):

| Ambiguity | Decision |
|---|---|
| A1: when A_bwd/A_self are built | Inside the outer loop, immediately after `C`, before M construction. |
| A2: which matrix Eq. 7's `M_ij` is | Row max of the forward block `M_base·diag(C)` (pre-A_bwd, pre-RowNorm). |
| A3: `N(i)` neighborhood | Out-neighbors (row i of the forward block). |
| A4: no inner-iteration cap | Cap 200 (expect ~65 at α=0.15). |
| A5: zero rows under RowNorm | Leave zero (sub-stochastic; the α·v restart keeps mass bounded). Documented. |
| A6/A7: n_outer semantics | `n_outer = 2` fixed (margin over the paper's 1) with early exit `‖r_t − r_{t−1}‖₁ < ε`. |
| A8: L1 mass drift | L1-normalize r at the start of each outer round before mixing into b. Inner loop follows the paper exactly. |
| A9: prose vs algebra on backward edges | Follow the algebra. |
| A13: degenerate zero seed | If `max(s_obs) = 0`: skip the walk entirely; every exposure output is 0 / U=Protected. Explicit rule (the paper divides by zero here). |

### 2.2 Paper 2 — BBN Operational Risk (arXiv:0906.3968) — what Engine B may cite

- **Citable**: the thesis that BNs capture inter-process *correlations* that independent-pair methods (LDA / our additive table) structurally miss; discrete-state modeling with equal cardinality per node; learning structure/parameters from accumulated loss data.
- **Not citable**: any specific CPT value, 3-state cardinality, or the O/D/S/U DAG — the paper learns topology (PC algorithm) and parameters (frequency MLE) from synthetic *loss time series* over bank business lines, explicitly *without* expert priors, validated only on synthetic data with N=3 nodes.
- **Adopted methodologically**: the discretization stance (equal-width bins over an observed range) informs how we would later *learn* CPT refinements from `workflow_failures` history; until then our CPTs are expert-authored (see SPEC-2.0).

### 2.3 Paper 3 — Cascading Urban Risk BBN (arXiv:2505.06281) — what Engine B may cite

- **Citable**: the pipeline *shape* — per-asset indicator variables → asset Risk-Level node → posterior P(fail|evidence); thresholding raw signals into discrete risk indicators; the cautionary result that unsmoothed MLE on sparse data collapses to near-deterministic CPTs (their n=1202 fingerprint: P=1/1202 and 1201/1202 dominate four of their tables) — which is the argument for our authored, smoothed, boundary-anchored CPTs.
- **Not citable**: any numbers (their tables contain defects — an Agriculture CPT whose columns sum to 1.87, collapsed 16-configuration tables, four identical near-deterministic tables), no validation exists in the paper, and there is **no cascade-exposure node** — our U variable goes beyond it and is **[AUTHORED]**.

### 2.4 Honest provenance statement (to ship in code + glossary)

> Engine B's DAG shape follows the BBN operational-risk literature (arXiv:0906.3968, arXiv:2505.06281). All state spaces, CPT values, the U (cascade exposure) variable, and the score aggregation are authored design values for OBA Core — not measurements and not values from those papers — and are marked `authored: true` in every response, exactly like `pillars.definitionsAreAuthored` today (`derived.js:1441`).

---

## Part III — Target architecture

```
computeAllFromRoots(roots)                      derived.js:1771  (single read of roots, unchanged)
  │
  ├─ riskEngine.buildContext(roots)             NEW backend/domain/riskEngine/index.js
  │    ├─ dependencyIndex(roots)                (reused — derived.js:142, built once)
  │    ├─ Engine A: eirwr.build(edges, λ)       NEW backend/domain/riskEngine/eirwr.js   (pure)
  │    │    └─ org-scan run: distress-seeded r  → U evidence for every agent
  │    └─ Engine B: bayes.buildTensor()         NEW backend/domain/riskEngine/bayes.js   (pure, 81×3)
  │
  ├─ predictiveRisk(roots, ctx)                 same name/signature + optional ctx
  │    ├─ evidence per agent: O, D, S (SPEC-1)  U from ctx (SPEC-1.5)
  │    ├─ posterior lookup + attribution (SPEC-3)
  │    └─ rows: predictedScore, threatLevel, contributingFactors, reasons,
  │             evidence, isEmergingThreat, cascadeReach (count, kept), blastRadius (new)
  ├─ humanDependencyRisk(roots, ctx)            re-anchored constants (SPEC-3.5)
  ├─ orgHealth(roots, {acc, predictiveRisk})    unchanged formula; consumes new scores
  ├─ orgHealthByDepartment(roots, ctx)          reuses ctx engine (P12 documented)
  └─ simulations (separate entry, same ctx pattern)
       employeeLeaves / agentFails / platformDown / workflowDisruption / rankAllScenarios
         ├─ seeds: one-hot per scenario (SPEC-4.4)
         ├─ severityFor: continuous mass thresholds (SPEC-4.6)
         └─ healthScore: predictiveRisk over mutated roots (cheap: tensor lookup;
            engine reused — topology is invariant under all five mutations)
```

**Runtime dependency policy**: engines are pure JS, zero new runtime dependencies (Render deploy untouched). Python (`backend/risk_engine/`: pgmpy, scipy, numpy) is a **dev-time validation harness only** — it verifies the CPT tensor and the JS engines against fixtures; it never runs in production.

---

## Part IV — Objective specifications

### SPEC-1 — Evidence extraction (O, D, S, U)

All mappings are total functions over the free-text columns (P18). Source: `roots` rows only — no derived tables (the file's own rule, `derived.js:14-37`).

**O — Ownership Resilience** (per agent):
| Condition | State |
|---|---|
| `agent.owner_id == null` | 0 Unowned |
| owner exists, `backupIndex(owner_id).hasBackup` false | 1 SingleOwnerNoBackup |
| owner exists with backup | 2 FullyBackedUp |

(Reuses `backupIndex`, `derived.js:124-135`, and the `owner_id`-is-`employees.id` rule documented at `:479-486`.)

**D — Documentation Coverage** (per agent; **fixes P17**, both files now agree):
| Condition | State |
|---|---|
| no `knowledge_assets` rows with `asset_type='agent'` for the agent | 0 Undocumented |
| some rows documented, not all | 1 PartialDoc |
| all rows documented (≥1 row) | 2 FullyDocumented |

**S — Runtime Operational State** (per agent):
| Condition | State |
|---|---|
| `agent.status === 'failed'` | 0 Failed |
| `agent.status === 'inactive'` | 1 Inactive |
| anything else (incl. missing/unknown) | 2 Active |

**U — Upstream Cascading Exposure** (per agent, from Engine A — **[AUTHORED]** thresholds):
- Org-scan run: seed `s_obs` = observed distress only (no BBN output — prevents circularity):
  - agent with `status='failed'` → 1.0; `status='inactive'` → 0.5; workflow nodes with `workflow_failures` count ≥2 → 0.7 (normalized; workflows enter the graph only if they appear in `dependencies`).
  - If `max(s_obs) = 0` (no observed distress anywhere): **skip the walk; U=2 for every agent** (degenerate rule, paper ambiguity A13).
- Otherwise run eIRWR once; `U_i = r_i > 0.40 → 0 HighExposure; r_i > 0.15 → 1 ModerateExposure; else 2 Protected`.
- Known overlap: a failed agent's own seed mass inflates its own `r_i`; accepted because its S=0 already dominates its posterior. A leave-one-out refinement is noted as future work, not built now.

**Recorded `agent.risk` is NOT an evidence variable** (F3): it remains only as the comparison label for `isEmergingThreat` (SPEC-3.3), preserving that feature's semantics while removing the circularity.

### SPEC-2 — CPT tensor (Engine B's core), with verified generator

**2.0 Provenance** — per Part II: shape informed by the BBN literature; every number **[AUTHORED]**, anchored to the four boundary conditions the original plan states. The generator below reproduces all four anchors **exactly** (numerically verified to 4+ decimals during planning) and fills the remaining 75 rows deterministically.

**2.1 Construction (two-stage chain)**: for each of the 81 parent configurations `(o,d,s,u) ∈ {0,1,2}⁴`:

```
Step 1  P(Critical | o,d,s,u) = σ( z_C − (d_O·o + d_D·d + d_S·s + d_U·u) / 2 )
        z_C = ln(0.99/0.01) = 4.595120
        (d_O, d_D, d_S, d_U) = (5.092600, 2.193100, 1.550000, 1.052700)   // sum = 9.8884

Step 2  P(Elevated | ~Critical, o,d,s,u) = σ( z_E − k·(d_O·o + d_D·d + d_S·s + d_U·u) / 2 )
        z_E = ln(0.9/0.1) = 2.197225
        k = (z_E − ln(pe/(1−pe))) / 9.8884   where pe = 0.035/0.995 = 0.0351759
          = 0.557098   →  (e_O, e_D, e_S, e_U) = (2.837100, 1.221800, 0.863500, 0.586500)

Step 3  P(Nominal) = 1 − P(Critical) − P(Elevated)
        (Elevated is drawn only when not Critical ⇒ ordering P(N) ≤ P(E) ≤ 1 is structural)
```

**2.2 Anchor verification (computed, not asserted)**:

| Configuration | P(Nominal/Elevated/Critical) | Target |
|---|---|---|
| (2,2,2,2) all-best | 0.9600 / 0.0350 / 0.0050 | 0.96 / 0.035 / 0.005 ✓ |
| (0,0,0,0) all-worst | 0.0010 / 0.0090 / 0.9900 | 0.001 / 0.009 / 0.99 ✓ |
| (0,2,2,2) unowned+documented | P(C)=0.4500 | 0.45 ✓ |
| (0,0,2,2) unowned+undocumented | P(C)=0.8800 | 0.88 ✓ |

The non-linear compound behavior the plan demands (documentation gap more than doubles an unowned asset's critical probability: 0.45 → 0.88) falls out of the shared logit scale. Sample mid-range outputs (for the parity fixture): (1,1,1,1) → score 51; (2,2,0,2) → score 6; (0,2,0,2) → score 85.

**2.3 Coefficients are the constants surface** (replaces `RISK_FACTORS` in `derived.constants`): `z_C, z_E, d_O, d_D, d_S, d_U, k`, the U thresholds (0.40/0.15), and the score weights (100, 45) — exported and asserted by tests, so the glossary and tests reference definitions rather than re-typed magic numbers (the pattern `derived.js:1873-1875` already established).

**2.4 Python verification** (`backend/risk_engine/bbn_model.py`): build the same DAG in pgmpy (`DiscreteBayesianNetwork` + `TabularCPD`), run `check_model()` (all 81 columns sum to 1), run `VariableElimination` over the full joint and assert it equals direct lookup for all 81 configurations and all 4 counterfactual re-query states — i.e. VE is used to *verify*, while production inference is O(1) table lookup (all parents are always observed; there are no hidden nodes).

### SPEC-3 — Inference, score, attribution, output contract

**3.1 Posterior** (all parents observed ⇒ direct lookup):
```
P(N|e), P(E|e), P(C|e) = tensor[o][d][s][u]
predictedScore = round(100·P(C|e) + 45·P(E|e))          // plan §3.2.4, [AUTHORED], kept
```
Range check: score ∈ [0, 100] with all-best → 2, all-worst → 99. The 35/55/75 `threatLevel` bands (`derived.js:466-471`) are **kept unchanged** — the verified score distribution populates all four bands.

**3.2 Glass-box attribution** (replaces point additions; **[AUTHORED]** presentation choice):
```
attribution(X) = max(0, score(e) − score(e with X←2))   for X ∈ {O, D, S, U}   (integer points)
contributingFactors = { ownership, documentation, runtime_state, cascade_exposure }  (new keys)
reasons = [ human strings derived from the evidence states and Δvalues ]
```
Honesty note shipped in code: the four attributions **do not sum to** `predictedScore` (factor interactions are real; the old additive identity was the fiction). `routes/predictive/predictiveRisk.js:53-57` sums factor values to rank `topRiskDrivers` — still valid on the new scale (values are comparable points).

**3.3 Row schema** (superset of today's — every existing field stays):
```
{ agentId, agentName, predictedScore, threatLevel, recordedRisk,       // unchanged
  isEmergingThreat,                       // unchanged definition (band vs recorded band)
  contributingFactors, reasons,           // NEW keys/values (P13 consumers updated)
  evidence: { ownership, documentation, runtime_state, cascade_exposure },   // NEW, glass box
  cascadeReach,                           // KEPT: transitive BFS count (compat, P-C8)
  blastRadius }                           // NEW: continuous 0-100 (SPEC-4.5)
```

**3.4 Briefing fix (P13)**: `briefing.js:29` `hasNoBackupOwner: 'single_owner' in contributingFactors` → `hasNoBackupOwner: top.evidence.ownership !== 2`. One line; comment updated.

**3.5 `humanDependencyRisk` re-anchor (P15)**: formula unchanged; `RISK_FACTORS.CRITICAL_WORKFLOW`/`SINGLE_OWNER` borrowings become `WORKFLOW_EXPOSURE_SCALE = 27` / `TOOL_EXPOSURE_SCALE = 30` (same values, honest naming, decoupled from the retired table). `agentRisk` term = mean of new BBN scores (drop the `?? 0` fallback's old semantics — scores are always numeric now).

### SPEC-4 — Engine A (eIRWR) in production JS

**4.1 Module**: `backend/domain/riskEngine/eirwr.js` — pure functions, no I/O, no deps beyond the Node stdlib. Sparse CSR-style storage (plain `{indptr, indices, data}` arrays; N ≈ tens–hundreds, E ≈ hundreds — no matrix library needed).

**4.2 Edge weights λ** (C3):
```
λ(edge) = strength/100                       if dependencies.strength is present (seed: 0.30–0.90)
        = { critical: 3.0, high: 2.0, normal: 1.0, low: 0.5 }[dependency_type]   otherwise
        = 1.0                                for 'unknown'/missing type (normalizeLevel sentinel)
```
Row-normalized per Eq. 1 over each dependent's outgoing edges. (Rationale: `strength` is real, currently-unused data that differentiates within type; the type map is the fallback. Alternative — type map only — is a one-line switch, noted for the product owner.)

**4.3 Algorithm**: exactly Part II §2.1 with the paper's defaults (α=0.15, R_base=0.1, β=2.0, ρ=0.3, q=2.0, μ=0.1, ε=1e-6) and our ambiguity decisions (A1–A13). Graph nodes = every `type:id` appearing in `dependencies` (agents, workflows, tools as present).

**4.4 Seeds per use case**:
- Org scan (U evidence): SPEC-1's distress vector.
- `agentFails`: one-hot at the agent.
- `employeeLeaves` / successor: sum of one-hots over the employee's owned agents.
- `platformDown`: sum of one-hots over agents linked via `agent_platform`.
- `workflowDisruption`: one-hot at the workflow node if it has graph edges, else sum of one-hots over its `workflow_dependencies` agents.

**4.5 Continuous blast radius** (**[AUTHORED]** — plan §3.1.6, kept with κ now defined):
```
BlastRadius(seed) = min(100, 100·Σ_{j≠seed} r_j·κ_j)
κ = { critical: 1.0, high: 0.7, normal|medium: 0.4, low: 0.2, unknown: 0.4 }   (via entityCriticality)
```
Computed per agent for the `/agents`-shaped output (batched one-hot runs; early-exit inner loop; N runs ≈ N×65 SpMV — trivial at seed-org scale, meets the perf budget in §6).

**4.6 `severityFor` replacement** (`simulations.js:59-67`), same lowercase contract (`simulationRoutes.test.js:79` pins `riskLevel`):
```
mass = Σ_{impacted j} r_j·κ_j     (r from the scenario's seeded run)
severity = mass ≥ 0.50 ? 'critical' : mass ≥ 0.25 ? 'high' : mass ≥ 0.10 ? 'medium' : 'low'   [AUTHORED]
```
`cascadeFrom` (the impacted-entity *list*) is kept — scenarios still need who-is-impacted for `impactedAgents`/`impactedWorkflows`; only the *severity judgment* switches from count-thresholds to probability mass.

### SPEC-5 — Consumer compatibility contract (regression surface)

Consumers by field (from the registry, §5 below). Hard rules:
1. `predictedScore` stays an integer 0-100; `threatLevel` stays `LOW|MEDIUM|HIGH|CRITICAL` with bands 35/55/75.
2. `contributingFactors` stays an object of numbers (values now attribution points); keys change → exactly two consumers patched (briefing P13; glossary P16).
3. `cascadeReach` (count) unchanged; `blastRadius` added alongside.
4. `impactedAgents`/`impactedWorkflows`/`severity`/`healthBefore`/`healthDelta` response names unchanged (`simulationRoutes.test.js:79`).
5. `isEmergingThreat`, `emergingThreats` unchanged in definition and shape.
6. Provenance fields (`computedAt`, `source`, `inputs`) unchanged; add `engines: { bayes: 'authored-CPT-v1', eirwr: 'paper-param-v1' }`.

### SPEC-6 — Performance & caching

1. `buildContext(roots)` runs once per `computeAllFromRoots`: 1 dependencyIndex build, 1 eIRWR graph build, 1 org-scan run (U), 1 tensor build (done once per process — the tensor is static).
2. `predictiveRisk(roots, ctx)` accepts the context; without ctx it builds one (backwards-compatible signature).
3. Simulations: `rankAllScenarios` builds the context once; each scenario runs only tensor lookups + one seeded walk (topology is invariant under all five mutations — P10). `healthScore` per scenario = accountability + BBN-scored predictiveRisk + orgHealth, same as today but without re-walking.
4. Budget (replaces C2's "<30 iterations"): full org evaluation, 100 agents / 500 dependencies, < 25 ms for the org scan + all blast radii (paper Table 7: 22.6 ms at 17k nodes / 55k edges on comparable hardware; our graphs are 2-3 orders smaller).

---

## Part V — Complete consumer registry (blast radius of this change)

**Backend — data consumers of `predictiveRisk` rows:**
| Consumer | Fields used | Action |
|---|---|---|
| `routes/predictive/predictiveRisk.js` (3 endpoints) | scores, threatLevel breakdown, ΣcontributingFactors, emergingThreats, formatPrediction fields | none (contract held); verify topRiskDrivers on new keys |
| `routes/dependencies.js:109` | `cascadeReach()` function | none |
| `routes/dashboard.js:57-59` | mean predictedScore | none |
| `routes/briefing/briefing.js:20-29, 329-346` | top CRITICAL, `'single_owner' in contributingFactors`, CRITICAL+HIGH list | **patch 3.4** |
| `routes/executive/executive.js:119` | emergingThreats → predicted_score | none |
| `routes/health/health.js:342-374` | CRITICAL filter, predicted_score, threat_level | none |
| `routes/signals/signals.js:43-56` | predictedScore + own 40/70 bands (P14) | none; glossary flag |
| `routes/voice/voice.js:50-62, 213, 252` | predictedScore, threatLevel, reasons[] (spoken) | reasons strings must stay human-readable |
| `routes/intelligence/brainCore.js` + `orchestrator.js` via `signalReaders.readPredictiveRisk` | inverted CRITICAL share; `<50` recommendation gate | none; watch gate flip (expected, intended) |
| `agent/suggestions.js:39-60` | top score, threatLevel, name | none |
| `agent/pageContext.js:69-71, 174-179` | top threats, emergingThreatsCount | none |
| `tools/read-tools.js:87` | find by agentId | none |
| `brain/modules/implementations.js:140-175` | M03 is an authored *mirror*, not a data consumer | update its definition string for consistency |
| `domain/derived.js` internal | orgHealth `:1559-1560` (CRITICAL count), orgHealthByDepartment `:1673`, humanDependencyRisk `:617` | SPEC-3.5, SPEC-6 |
| `domain/metricGlossary.js:29-38` | definition text | **rewrite (P16)** |

**Backend — cascade consumers:** `simulations.js` (5 scenarios + `severityFor` + `healthScore`), `routes/simulations/*.js` (response shaping only) → SPEC-4.4/4.6.

**Frontend (types are loose; verify rendering of new factor keys/values):** `lib/predictiveRisk.ts` (Map by agentName; THREAT_TO_RISK_LEVEL), `lib/riskIntelligence.ts`, `lib/api.ts`, `components/risk/PredictedRiskPanel.tsx`, `components/map/BlastRadiusSimulator.tsx` (uses predictedScore as impact), `components/simulation/ScenarioSandbox.tsx`, `components/ownership/HumanDependencyRisks.tsx`, `components/ownership/DependencyPipeline.tsx`, `components/ownership/OwnershipList.tsx`, `components/dashboard/AgentTable.tsx`, pages `risk`, `simulation`, `ownership`, `map`.

**Tests pinning current behavior (must be rewritten, not "kept green"):**
- `tests/derived.unit.test.js:225-243` — additive identity + literal RISK_FACTORS values (C5) → rewrite as: posterior sums to 1; anchor configurations (SPEC-2.2); monotonicity (worse evidence never lowers score); attribution ≥ 0 and ≤ score; `isEmergingThreat` semantics.
- `tests/derived.unit.test.js:248-297` — humanDependencyRisk formula → update constants references.
- `tests/derived.unit.test.js:754-802` — orgHealth via predictiveRisk → structure intact; spot-check CRITICAL-count sensitivity.
- `tests/simulations.unit.test.js:33-68` — cascadeFrom reach (kept) + severityFor thresholds → rewrite severity cases on mass thresholds.
- `tests/simulationRoutes.test.js:79` — legacy field names → kept green by SPEC-5.4.
- `tests/agentSuggestions.unit.test.js`, `tests/agentData.unit.test.js` — consume suggestion/pageContext shapes → verify, likely untouched.

**New tests:**
- `backend/tests/riskEngine.unit.test.js`: tensor axioms (81 columns sum to 1); anchor table (SPEC-2.2); degenerate-seed rule; eIRWR convergence on a 10-node fixture (‖Δr‖₁ < 1e-6 within 200 iters); blast-radius monotone in seed set; parity vs exported Python fixtures (|Δ| < 1e-9, same arithmetic order).
- `backend/risk_engine/test_risk_engines.py`: pgmpy `check_model()`; VE-vs-lookup equality over all 81 configs × 3 counterfactuals; scipy eIRWR vs fixture vectors; convergence-iteration bound.

---

## Part VI — File plan

**New (JS, runtime):**
- `backend/domain/riskEngine/index.js` — context builder + evidence extraction (SPEC-1)
- `backend/domain/riskEngine/bayes.js` — tensor generator, lookup, score, attribution (SPEC-2/3)
- `backend/domain/riskEngine/eirwr.js` — graph build, λ weights, power iteration, blast radius (SPEC-4)

**New (Python, dev-only):** `backend/risk_engine/{bbn_model.py, eirwr_model.py, test_risk_engines.py, requirements.txt, fixtures/}`.

**Modified:** `backend/domain/derived.js` (predictiveRisk body, humanDependencyRisk constants, constants export, metricGlossary text moved/updated), `backend/domain/simulations.js` (severityFor, engine threading), `backend/routes/briefing/briefing.js` (one line), `backend/domain/metricGlossary.js` (predictiveRisk + humanDependencyRisk entries), `backend/tests/derived.unit.test.js`, `backend/tests/simulations.unit.test.js`, `backend/brain/modules/implementations.js` (M03 definition string), `backend/API_REFERENCE.md`.

**Untouched by design:** `cascadeReach`/`dependencyIndex` signatures, all response field names, `orgHealth`'s formula, `pillars`, `loadRoots`, the memo/stampede layer, `definitions.js`.

---

## Part VII — Execution order (dependency-driven, with exit criteria)

| Phase | Work | Exit criteria |
|---|---|---|
| **0. Baseline freeze** | Run current backend on seed data; capture golden JSON of `/api/predictive-risk/*`, `/api/simulations/*`, orgHealth for before/after diffing. | Golden files committed under `backend/risk_engine/fixtures/baseline/`. |
| **1. Python reference** | `bbn_model.py` (pgmpy), `eirwr_model.py` (scipy), tests; export fixture tensors + fixture r-vectors. | `check_model()` passes; anchors reproduce to 1e-9; VE≡lookup over 81×3; fixture JSONs exported. |
| **2. JS engines** | `riskEngine/bayes.js`, `riskEngine/eirwr.js` (pure). | Parity vs Python fixtures < 1e-9; axioms tests green; no new runtime deps in `package.json`. |
| **3. derived.js integration** | `riskEngine/index.js` context builder; rewrite `predictiveRisk` body (keep name/signature/row schema); thread ctx through `humanDependencyRisk`, `orgHealthByDepartment`; constants swap; briefing one-liner; glossary rewrite. | `computeAllFromRoots` green; all SPEC-5 contract fields present; golden diff shows only intended changes (score values, factor keys, new fields). |
| **4. simulations** | Thread ctx; seeded runs per scenario; `severityFor` on mass; keep `cascadeFrom`/field names. Document P9 (dead healthDelta) as a known issue with options — do not change mutation semantics in this phase. | Simulation tests (rewritten) green; `simulationRoutes.test.js:79` legacy-fields check green; perf budget met. |
| **5. Consumers + frontend sweep** | Verify every registry §5 row against a running backend (spot scripts or existing route tests); fix M03 string, voice reasons prose; check frontend panels render new factor keys and blastRadius. | Full `npm test` green (incl. rewritten suites); no consumer reads a removed/renamed field. |
| **6. Docs & hardening** | `API_REFERENCE.md`, metricGlossary authored-flags, README section on the engines + provenance statement (Part II §2.4); perf benchmark record; memory note. | Docs merged; benchmark numbers recorded in this file's §6 table. |

Phases 1→2→3→4→5 are strictly ordered (each depends on the previous). Phase 0 is parallelizable with Phase 1.

---

## Part VIII — Risks & mitigations

| Risk | Mitigation |
|---|---|
| Score distribution shifts break dashboard expectations / recommendation gates | Golden-diff in Phase 3 makes every shift explicit; gates (`orchestrator.js <50`) flipping is *intended* (the legacy gates were tuned to the fabricated scale); call out in release notes. |
| U-evidence circularity (cascade exposure feeding scores that feed cascades) | U is seeded from **observed state only** (failures/inactive), never from BBN output. Structural, testable. |
| eIRWR mass drift (paper ambiguity A8) | L1-normalize between outer rounds; convergence + mass-bounds asserted in tests. |
| Python toolchain unavailable in some environments | Python is dev-only; CI gate may run it optionally; JS parity fixtures are committed so JS tests never require Python at runtime. |
| `strength`-based weights change relative coupling vs plan's type map | Both one-line switches behind one function (`λ(edge)`); golden diff quantifies the difference; product owner picks default (recommendation: strength-based). |
| Department slices see the global graph (P12) | Behavior preserved and documented; no per-department engine rebuild. |
| Attribution misread as additive (sum ≠ score) | Glossary + code comment state the interaction explicitly; the old identity was the bug. |

---

## Appendix A — Verified numbers (single source of truth)

```
CPT chain coefficients:  z_C=4.595120  z_E=2.197225  k=0.557098
                         d_O=5.092600  d_D=2.193100  d_S=1.550000  d_U=1.052700   (Σ=9.8884)
e-coefficients:          e_O=2.837100  e_D=1.221800  e_S=0.863500  e_U=0.586500
Anchors:                 (2,2,2,2)→.96/.035/.005  (0,0,0,0)→.001/.009/.99
                         (0,2,2,2)→P(C)=.45       (0,0,2,2)→P(C)=.88
Score samples:           (2,2,2,2)→2   (1,1,1,1)→51   (0,2,2,2)→54   (0,0,2,2)→92   (0,0,0,0)→99
eIRWR paper params:      α=.15  R_base=.1  β=2.0  ρ=.3  q=2.0  μ=.1  ε=1e-6  n_outer=1(we:2)
U thresholds [AUTHORED]:  >0.40 HighExposure(0)   >0.15 Moderate(1)   else Protected(2)
Severity mass [AUTHORED]: ≥.50 critical  ≥.25 high  ≥.10 medium  else low
κ [AUTHORED]:             critical 1.0  high 0.7  normal/medium 0.4  low 0.2  unknown 0.4
threatLevel bands:        unchanged 35/55/75 (derived.js:466-471)
```

## Appendix B — Legacy code reference map

| Symbol | Location | Fate |
|---|---|---|
| `RISK_FACTORS` | derived.js:452-463 | retired (constants surface replaced, SPEC-2.3) |
| `predictiveRisk` | derived.js:476-589 | body replaced; signature + row schema preserved |
| `cascadeReach` | derived.js:154-167 | kept as-is (count semantics, 4 consumers) |
| `dependencyIndex` | derived.js:142-151 | kept; engine reads it |
| `threatLevel` bands | derived.js:466-471 | kept |
| `cascadeFrom` | simulations.js:25-41 | kept (impacted list) |
| `severityFor` | simulations.js:59-67 | replaced (mass thresholds) |
| `healthScore`/`healthDelta` | simulations.js:87-108 | kept; feeds from new scores |
| `humanDependencyRisk` | derived.js:616-672 | constants re-anchored |
| `M03` brain module | brain/modules/implementations.js:152+ | definition string update only |
