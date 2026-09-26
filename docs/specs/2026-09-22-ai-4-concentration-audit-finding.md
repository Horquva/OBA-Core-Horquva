# AI-4 — Concentration Audit: Finding

**Task:** AI-4 (Janita Tahir) — determine whether "Dependency Concentration Intelligence" is a new question or a re-framing of an existing formula.
**Branch:** `feature/ai-concentration-audit` (from `upstream/ocos/develop` @ `1aa0828`)
**Blocks:** AI-5 (Muhammad Ahmad Tanveer)

## Answer, up front

**Split answer, not a flat yes/no:**
- **Human side: reuse.** `humanDependencyRisk()` (`backend/domain/derived.js`, line 379) already answers the human half of the target question — per-employee, volume + criticality + backup-absence combined into one tiered score, with the exact fields needed to produce the target-style narrative ("Ahmed owns 8 workflows and 3 agents, no backup").
- **Non-human side: gap, needs new code.** No existing formula evaluates an AI agent, vendor, or system as the over-relied-upon node. Every candidate found — six, not four — is person/owner-centric. This is the real work for AI-5.

## The five concentration formulas (plus one adjacent near-miss)

The lead's brief said "four." A fifth exists and was invisible to a first-pass grep because it lives in `backend/brain/`, a directory a non-recursive `Select-String -Path backend\**\*.js` glob silently skips in PowerShell. Re-running with `Get-ChildItem -Recurse` surfaced it.

| # | Formula | Location | Scope | Counts | Backup-aware? | Output shape |
|---|---|---|---|---|---|---|
| 1 | `knowledgeConcentration()` | `domain/derived.js:703` | per-employee | criticality-weighted % share of org-wide assets (agents+workflows+tools) | No | Score + tier, all employees |
| 2 | `ownershipSpreadScore` | `domain/derived.js:1540`, inside continuity-pillar scoring | org-wide | evenness of raw agent counts across owners | No | One aggregate health score, not per-person |
| 3 | `PENALTY_CONCENTRATION` | `routes/decisionIntelligence.js:64` | per-owner | raw agent count ≥5 | No | –20 penalty inside an unrelated decision-quality score |
| 4 | `concentrationRisk` / `isHumanSpof` | `routes/ownership.js:78,80` | per-owner | raw agent count (≥4 = "high"); separately, ≥3 agents + no backup = SPOF | Partially (`isHumanSpof` only) | Categorical label per owner, agents only |
| 5 | M04 Recommendation Engine, Rule 3 (`ownerConcentrationWarning`) | `brain/modules/implementations.js:421,462,558` | per-owner | raw agent count ≥`CONCENTRATION_THRESHOLD` (4) | No | **Named, specific finding**: `"{owner} owns {n} agents"` + impact sentence — closest existing match to the target's narrative *format* |
| adjacent | `knowledgeRiskScore` | `routes/knowledge/intelligence.js` | per-employee | absolute (not share-based) score over own knowledge_assets | No | Confirmed genuinely distinct from #1 by the code's own header comment — not a 6th concentration candidate, just adjacent territory |
| — | `humanDependencyRisk()` | `domain/derived.js:379` | per-employee | agent risk (via `predictiveRisk()`, backup-aware) + workflow criticality exposure + **unbacked-tool** exposure, combined | **Yes** | Full risk profile per employee: `ownedAgentCount`, `ownedWorkflowCount`, `criticalWorkflowCount`, `ownedToolCount`, `unbackedToolCount`, `totalRiskScore`, `tier` — sorted worst-first |

## Why `humanDependencyRisk()` is the human-side answer

It's the only formula that combines all three things the target feature needs simultaneously: **volume** (counts across agents+workflows+tools), **criticality weighting**, and **backup absence** — and it already returns per-entity counts (`ownedWorkflowCount`, `unbackedToolCount`, etc.) that map directly onto the target's example narrative shape. `knowledgeConcentration()` (#1) is the next closest but has no backup-awareness at all — it measures share of assets held, not risk of those assets having no fallback.

## Why the M04 rule (#5) is close but not a substitute

Its *output format* — a plain-language, named, single-entity finding — is exactly the shape the task doc asks for. But its *scope* is much narrower than `humanDependencyRisk()`: agents only (explicitly commented as "mirroring the frontend's own scope"), no workflows or tools, no backup check. It flags "who owns the most agents," not "who has too much depending on them with no fallback."

## The confirmed scope gap (the actual crux)

**None of the six formulas above ever treats a non-human node — an AI agent, a vendor, or a system — as the concentration hub.** All are keyed on `owner_id` / `employee_id`. The target feature explicitly requires operating on "any node in the graph: person, AI agent, vendor, or system," including cases like "this one AI agent has 12 workflows depending on it with no fallback" (agent-as-hub, not person-as-hub). That case has no existing formula anywhere in the codebase. **This is new code, and it is AI-5's actual scope**, not a re-framing of anything that exists.

## Secondary observations (threshold inconsistencies, not central to the main finding)

- `ownership.js`'s `concentrationRisk` (≥4 agents = "high") and `decisionIntelligence.js`'s `PENALTY_CONCENTRATION` (≥5 agents) answer similar-sounding questions with different cutoffs. Likely legitimate — one is a route's display label, the other a decision-quality penalty — but worth the lead's awareness.
- `ownership.js`'s `concentrationRisk` (≥4, from SQL `roots`) and M04's `CONCENTRATION_THRESHOLD = 4` (from the Knowledge Graph via `graphLoader`) use the *same* threshold for what is functionally the same question, computed independently in two different subsystems. This is closer to a true near-duplicate than the ≥4-vs-≥5 case above, and may be worth the lead deciding whether to consolidate — flagged for her judgment, not assumed to need fixing as part of AI-4/AI-5.

## Process note

An earlier pass on this same branch, in this same codebase's history, shows both failure modes the lead warned against already occurred once each: `M30` (`analytics.js`'s flat `ownershipConcentration()`) was correctly identified and retired as a true duplicate of `knowledgeConcentration()`. Separately, `knowledgeConcentration()` and `knowledgeRiskScore()` were previously confused as the same thing before being correctly split apart, per that function's own header comment. Reading full logic rather than pattern-matching on names caught both directions of the mistake — this audit followed the same approach before concluding the human/non-human split above.

## Recommendation for AI-5

Build the non-human-hub half as new code — likely following `humanDependencyRisk()`'s combined volume+criticality+backup pattern, but keyed on agent/vendor/system nodes rather than `employee_id` — and reuse `humanDependencyRisk()` as-is (or lightly adapted for output formatting) for the human half. A unified "Dependency Concentration Intelligence" feature could plausibly run both and merge results into one ranked, named-finding list across all node types.

---
*Compiled by Janita Tahir, AI-4. Citations are to the exact functions/files/lines read on `feature/ai-concentration-audit` @ `1aa0828`.*
