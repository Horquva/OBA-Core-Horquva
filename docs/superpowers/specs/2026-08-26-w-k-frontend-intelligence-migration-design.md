# W-K — Frontend Intelligence Migration

Date: 2026-08-26
Status: design drafted in chat, awaiting owner review of this file. No code changed yet.

Follows W-A through W-J (all landed, per the
[remediation decision log](2026-08-24-oba-remediation-decision-log.md)) and the same-day fixes logged
after them (commits `e53acef`…`f452506`, 2026-08-26). **This is the workstream W-I's own design doc
deferred** ("Frontend risk/health-score client-side recomputation... a separate, larger
frontend-truth-repointing workstream" — W-I design doc §4). It was picked up today after a duplication
sweep found the department/workflow normalization bug (`f452506`) and the owner gave this workstream's
mandate directly, verbatim: *"no intelligence should be in frontend everything related to intelligence
calculation should be in backend the frontend should get it from backend the way it is supposed to be
either from graph or derived like a systematic approach so we do not keep finding the same problem over
and over again."*

---

## 1. The problem this solves

Every workstream this remediation has run — W-C's canonical definitions, W-D's truth layer, this
session's own duplication sweeps — has found the same shape of bug: a fact gets computed twice,
independently, and drifts. Six of those were fixed one at a time today (M18/M53, vendor/tool risk,
department-rollup criticality, `DecisionSupportQueue`'s fabricated scores, and the department/workflow
normalization bug). The owner's instruction reframes this from "keep finding and fixing individual
duplicates" to "stop the class of bug at its source": **frontend components should render what the
backend computed — via `derived.js` or the brain graph — not compute their own version of the same
judgment.**

Two exhaustive audits (one per `frontend/lib/*.ts` file — all 22 read in full; one per
`frontend/components/**/*.tsx` file scanning for inline scoring not routed through `lib/`) found the
full extent of what's left. This section is their combined, deduplicated ground truth.

### 1.1 Active bug: two live tiers can disagree on screen right now

`frontend/lib/risk.ts`'s `deriveRisk()`/`deriveRiskScore()` is the client-side formula
`predictiveRisk.ts` was built to replace — its own doc comment already says so. It is still imported by
`components/simulation/ScenarioSandbox.tsx` and `components/ownership/DependencyPipeline.tsx`, so the
same agent can show one tier on `/risk` (backend-sourced, canonical) and a different tier inside these
two components (this file's own 20/40/70 bands). `calculateHealthScore()` in the same file is dead code
— exported, never imported anywhere.

### 1.2 Routing fixes: the backend already computes it; nothing calls it

Two places recompute a judgment the backend already ships on a route nobody reads:

- `frontend/lib/graph.ts`'s `getSPOFs()` (ad hoc: ≥3 victims AND no backup AND high/critical) vs.
  `/api/risks`'s `spofVerdict()` in `backend/domain/definitions.js` (sole owner AND no backup AND
  criticality ≥ high — no dependent-count gate). `/api/risks` is mounted and correct but only ever
  pinged by `EndpointHealthGrid.tsx`, never read by a real page. The two rules disagree (dependent-count
  gate vs. not), so this is a routing fix bundled with a rule reconciliation, not a plain swap.
- `frontend/lib/riskIntelligence.ts`'s `buildFactors()` (its own 40/30/15/15 point scheme) vs.
  `derived.js`'s `predictiveRisk()`, which already returns `contributingFactors` and human-readable
  `reasons[]` per agent over `/api/predictive-risk/agents` — a route this same file already calls for
  the tier. It ignores the factors the response already carries and re-derives its own.

### 1.3 Fabricated numbers (the class this session already fixed twice — two instances remain)

Same anti-pattern as the already-fixed `VerifiedAdvisorPanel.tsx` (arithmetic confidence score) and
`DecisionSupportQueue.tsx` (impact/urgency/blast-radius from a label):

- `components/recommendations/OpportunityBacklogTab.tsx:20-32` — `leverageScore` starts at 50, adds
  fixed point values for CRITICAL/HIGH/Quick/Medium, capped at 99. No real basis.
- `components/simulation/TwinSyncStatus.tsx:14-26` — a `lagMs` "replication lag" computed as
  `max(8, round(totalNodes*0.4))`, and a 3-state sync status off an unowned-agent ratio with no backend
  signal behind either number.

### 1.4 Duplicated threshold judgments (same rule, coded independently more than once)

- The "human SPOF" test (`≥3` agents with no backup, owned by one person) is independently coded in
  `ownership/OwnershipOverview.tsx`, `ownership/OwnershipList.tsx`, and `ownership/DependencyPipeline.tsx`
  — three chances for the threshold to drift, zero shared source.
- `dropSeverity()` (health-delta → CRITICAL/HIGH/MEDIUM/LOW at 7/3/1) is duplicated verbatim in
  `simulation/ScenarioRanking.tsx` and `simulation/ImpactSummary.tsx`.

### 1.5 Real intelligence with no backend equivalent — full modules

These compute a genuine multi-factor score or classification, entirely client-side, with nothing on the
backend answering the same question at the same granularity:

| File | What it computes | Backend today |
|---|---|---|
| `lib/aiToolIntelligence.ts` | Composite tool-risk score (0–100, 5 weighted factors) → tier | `/api/tool-intelligence` returns only booleans (`hasBackup`/`hasPolicy`/`isCritical`) + spend, no score, no tier — and is itself unconsumed except by the health pinger |
| `lib/knowledgeRisk.ts` | Per-person `concentrationScore` (criticality-weighted share of org assets) → 4-tier `riskTier` | `/api/knowledge/intelligence`'s `knowledgeRiskScore` answers a different, already-disambiguated question (absolute score off `knowledge_assets` only) |
| `lib/orgMemory.ts` | Per-asset `MemoryStatus` (4-state) + IMHS + per-owner `carrierTier` | `backend/routes/memory/memory.js` computes a same-named 4-status taxonomy with a **different formula** over a different input |
| `lib/continuityRisk.ts` | Per-asset `survivalStatus` + `governanceScore`, rolled up per department | Nothing per-asset exists; M18/M19 are org/department aggregates only |
| `lib/recommendations.ts` | 7-rule prioritization engine (orphaned/no-backup/concentration/undocumented × agents+workflows, tools w/o backup) with hand-authored prose | Brain module M04 covers 3 of the 7 rules, no prose, no effort estimate |
| `components/ownership/HumanDependencyRisks.tsx` | Per-owner weighted composite (agent risk + workflow risk×12/8 + tool risk×10) → 4-tier | Nothing — no backend concept of aggregate "risk carried by this person across everything they own" |
| `components/ownership/DependencyPipeline.tsx` | A **second, different** per-person composite (4/3/2/1 weighted sum) for the *same people* as the row above | Same gap — and disagrees with the row above on top of not existing |
| `components/knowledge/KnowledgeConcentrationGauge.tsx` | Bus-factor (accumulate-to-50%) + HHI (Σshare²) statistical concentration score, 4-tier | Nothing — genuine statistics computed from scratch client-side |
| `components/map/BlastRadiusSimulator.tsx` | Client-side BFS + decay formula (`0.65^hop × 100`) cascade-impact score | `domain/simulations.js` (W-I) has real cascade reach and severity banding but no blast-radius/decay scoring |
| `components/ai-tools/OutageImpactPanel.tsx` | Outage severity (`≥5/≥3/≥1` impacted) + a second ranking formula (`3×workflows + 2×agents + depts`) | Same gap as `aiToolIntelligence.ts` — same domain, should migrate together |
| `components/map/HiddenDependencyOverlay.tsx` | Infers "hidden" edges (transitive, shared-owner, shared-resource) from raw agents/dependencies — not a score, but a client-computed graph judgment | Nothing exposed; the brain graph already has the real edges these three functions are trying to approximate |

### 1.6 Explicitly not in scope

`lib/commandIndex.ts`'s `scoreTarget()` is command-palette text-relevance ranking (which nav result
best matches what you typed) — a UI concern, not an organizational-intelligence judgment. It stays
client-side; nothing here migrates it.

`lib/evidenceGate.ts` (a deliberate, documented hand-kept TS port of `definitions.js`'s evidence
primitives — no shared runtime between `backend/` and `frontend/` exists to eliminate this any other
way) and `lib/simulation.ts`/`lib/decisionIntelligence.ts`/`lib/predictiveRisk.ts`/`lib/normalize.ts`
(already-correct thin-mapper patterns, three of them precedents this workstream should match) are
unaffected.

## 2. Target architecture

The pattern this workstream converges everything on already exists three times in this codebase and
works:

1. `predictiveRisk.ts` — thin `Map` builder over `/api/predictive-risk/agents`'s real payload.
2. `lib/decisionIntelligence.ts` — types only; the scoring engine lives entirely in
   `backend/routes/decisionIntelligence.js`.
3. `lib/simulation.ts` (post-W-I) — a field-reshaping mapper, comment-marked "no risk/health
   recomputation," over real `/api/simulations/*` routes.

For each item in §1.5, the backend gets (or already has, per §1.2) a real computation — a `derived.js`
function for root-table aggregates, a brain module for graph-structural questions (per D-12's existing
split, which W-I confirmed and this workstream does not revisit), exposed on a route. The frontend
file becomes a thin fetch + type, matching the three precedents above. Components read the computed
result and render it; they stop computing it.

## 3. Decisions

| # | Decision |
|---|---|
| D-52 | Delete `lib/risk.ts`'s `deriveRisk()`/`deriveRiskScore()` and dead `calculateHealthScore()`; repoint `ScenarioSandbox.tsx` and `DependencyPipeline.tsx` to `predictiveRisk.ts`'s canonical tier. |
| D-53 | Wire `getSPOFs()` to `/api/risks`'s `spofVerdict()` and `riskIntelligence.ts`'s factor display to `predictiveRisk()`'s existing `contributingFactors`/`reasons` — both already computed backend-side, just unconsumed. The `getSPOFs()` dependent-count-gate vs. `spofVerdict()`'s ownership-only rule needs one product call: keep the backend's simpler definition, or add a dependent-count factor to `spofVerdict()` itself so there is still only one SPOF definition. |
| D-54 | Remove the two remaining fabricated numbers (`OpportunityBacklogTab.tsx`'s `leverageScore`, `TwinSyncStatus.tsx`'s `lagMs`/sync-status) — same treatment as `VerifiedAdvisorPanel.tsx`/`DecisionSupportQueue.tsx` this session: back with a real number or drop it and show only what's real, honestly labeled. |
| D-55 | One backend-sourced "human SPOF" verdict (extends `spofVerdict()` or a new `derived.js` function) replacing the independently-coded `≥3` threshold in `OwnershipOverview.tsx`, `OwnershipList.tsx`, and `DependencyPipeline.tsx`. |
| D-56 | Simulation severity banding (`dropSeverity()`, duplicated in `ScenarioRanking.tsx`/`ImpactSummary.tsx`) moves into `domain/simulations.js` alongside W-I's `severityFor()`, returned on the scenario/rank response instead of recomputed twice client-side. |
| D-57 | New backend "human dependency risk" computation (new `derived.js` function or brain module) reconciling `HumanDependencyRisks.tsx` and `DependencyPipeline.tsx`'s two disagreeing per-person composites into one. Needs an owner call on the weighting formula — both existing schemes (12/8/10 and 4/3/2/1) are ad hoc, neither is a clear survivor. |
| D-58 | `aiToolIntelligence.ts`'s composite score/tier and `OutageImpactPanel.tsx`'s severity/ranking formulas migrate together into a real backend tool-risk computation (extends `/api/tool-intelligence` past its current booleans-only shape, or a new brain module) — same domain, one migration. |
| D-59 | `knowledgeRisk.ts`'s `concentrationScore` migrates to a new backend computation, distinct from the already-disambiguated `knowledgeRiskScore`. |
| D-60 | `orgMemory.ts` vs. `backend/routes/memory/memory.js` reconciliation — same 4-status taxonomy name, different formula. Needs an owner call on which formula is canonical before either side is touched. |
| D-61 | `continuityRisk.ts`'s per-asset `survivalStatus`/`governanceScore` migrates to a new backend computation — genuinely missing today; M18/M19 (already exposed, `e53acef`) are org/department aggregates, not per-asset. |
| D-62 | Expand brain module M04 to cover all 7 rules `recommendations.ts` implements today (currently 3), then repoint the frontend to consume it instead of generating locally. Largest single item in this workstream. |
| D-63 | `BlastRadiusSimulator.tsx`'s decay-based cascade scoring migrates into `domain/simulations.js` (W-I) as a blast-radius function, not a sixth independent cascade implementation. |
| D-64 | `HiddenDependencyOverlay.tsx`'s three edge-inference functions migrate to a backend graph-analytics function (using the existing `A.` analytics helpers brain modules already share) exposed via a route. |

`ScenarioSandbox.tsx`'s remaining "which entity to auto-select" scoring (separate from the `deriveRisk()`
call D-52 removes) is deliberately left client-side: it picks what to simulate, never asserts a verdict
to the user, matching this session's own established precedent for `getSPOFs()`/`deriveRisk()`-as-
internal-ranking (SPOF fix and cascade-direction fix decision log entries, 2026-08-26).

## 4. Recommended phasing

Thirteen decisions spanning three new backend computations, four migrations of existing-but-thin
backend routes, two pure routing fixes, and three mechanical cleanups is workstream-plural, not
workstream-singular — bigger than any single prior workstream in this remediation (W-E, the largest so
far, ran 19 tasks under 6 decisions). Executing all thirteen as one plan risks the same "wall of no-op
renames hiding a real regression" this log's own standing constraints warn against. Recommended
sequencing, cheapest/highest-value first:

1. **D-52** alone — deletes a live, actively-disagreeing bug. Smallest, safest, most valuable first
   move.
2. **D-53, D-54** — pure routing fixes plus the two remaining fabricated numbers. No new backend
   computation required; same pattern as six fixes already landed today.
3. **D-55, D-56** — the two duplicated-threshold cleanups. Small, mechanical, one new small backend
   function each.
4. **D-57 through D-64** — the eight real migrations, each needing a new or expanded backend
   computation. These should become their own sub-workstreams (W-L, W-M, …), sequenced by owner
   priority once 1–3 land, not attempted together.

## 5. Explicitly out of scope

- `lib/commandIndex.ts`'s `scoreTarget()` (§1.6) — UI search relevance, not organizational intelligence.
- Any further SPOF-definition unification beyond D-53/D-55's scope — the decision log's §4 Deferred
  entry on `routes/workflows/spof.js` migrating onto `spofVerdict()` is a separate, already-flagged item.
- Ownership-concentration definition unification (four disagreeing formulas, per the earlier
  duplication sweep) — needs its own product decision, not folded in here.

## 6. Testing & verification

Each sub-workstream should follow this session's established pattern: `tsc --noEmit` after every
frontend change, `npm test` after every backend change, and a live Node script hitting the new/changed
route over real HTTP (mini Express app mounting just the route, as used for `/api/intelligence/continuity`
and `/api/workflows` today) before committing — not browser-based verification, per the owner's standing
instruction for this session.

This table is written in the style of the central decision log but not yet merged into it — awaiting
the owner's review of this file and a decision on which phase to start with.
