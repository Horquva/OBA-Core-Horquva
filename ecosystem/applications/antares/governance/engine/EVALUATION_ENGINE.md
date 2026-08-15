# Governance Evaluation Engine (Din 3-4)

`evaluationEngine.js` — takes a proposed action and returns a real ALLOW / REJECT /
ESCALATE / HUMAN_REVIEW decision, with a reason, using the Din 2 models.

## How to run it yourself
```
node governance/engine/evaluationEngine.test.js
```
8/8 scenarios pass — one for each outcome, plus an unknown-action fail-safe case and an
anomaly-flag escalation case.

## Decision precedence (this is the actual logic, memorize this order)
1. A **REJECT_IF_MATCH** rule matched → **REJECT**, always. Trust can never undo a hard rule.
2. **No rule matched at all** → **HUMAN_REVIEW**. Unknown action = not safe, never auto-ALLOW.
3. A **REQUIRE_HUMAN_REVIEW_IF_MATCH** rule matched → **HUMAN_REVIEW**, regardless of trust.
4. Computed risk is **HIGH/CRITICAL** (from rule severity + anomaly + low org trust) →
   **ESCALATE**, even if no rule blocked it outright.
5. A **CONDITIONAL** rule matched → **ALLOW** only if org trust ≥ 0.7 and no anomaly,
   otherwise **ESCALATE**.
6. An **ALLOW_IF_MATCH** rule matched (and nothing above fired) → **ALLOW**.

## Files in this delivery
- `rules.js` — sample rule set (R-01 read, R-05 conditional update, R-09 PII delete,
  R-13 reject unverified actor) — replace/extend with real rules as they're defined.
- `evaluationEngine.js` — `evaluateAction(actionRequest, context, rules, trustSignals)`
  returns `{ decision, evidence }`.
- `evaluationEngine.test.js` — 8 scenarios proving every outcome path.

## Known gaps (deliberately left for later days)
- `nextDecisionId`/`nextEvidenceId` are simple counters — Din 6 (runtime enforcement +
  persistence) should replace these with real, collision-safe ID generation.
- Rules are hardcoded in `rules.js` — a real rules store/DB comes later.
- No integration yet with Zeeshan/Zara/Abbas's platforms — that's Din 7.
