# Trust Intelligence Engine (Din 5)

Pulled the trust/risk logic out of `evaluationEngine.js` into its own module,
`trustIntelligenceEngine.js`, and added two new things.

## Run the tests
```
node governance/engine/trustIntelligenceEngine.test.js   -> 11/11
node governance/engine/evaluationEngine.test.js           -> 8/8 (unchanged behavior, confirmed after refactor)
```

## What's new vs Din 3-4

**1. `decisionConfidence`** — a third, separate number. NOT model confidence, NOT org
trust. It answers "how confident is the governance engine in the call it's about to
make," blended from both signals (org trust weighted 0.6, model confidence 0.4 — org's
learned history matters more than an actor's self-reported certainty), reduced by any
anomaly. It's for explainability/audit only — it never changes ALLOW/REJECT/ESCALATE/
HUMAN_REVIEW itself.

**2. `oversightLevel`** — NONE / LOW / STANDARD / MANDATORY. Separate from the outcome,
so Din 7's integration can route actions to the right review queue without recomputing
anything. A rule requiring review, or CRITICAL risk, always forces MANDATORY.

## What stayed the same (still true, now enforced by its own module)
- `MODEL_CONFIDENCE` and `ORG_TRUST_SCORE` are always read as two separate signals —
  never merged before `computeDecisionConfidence` does it deliberately and visibly.
- `evaluateRisk` fail-safe rules are unchanged: unmatched action → at least MEDIUM risk,
  anomaly → at least HIGH risk, regardless of rule severity.

## Files in this delivery
- `trustIntelligenceEngine.js` — the new module (`assessTrustSignals`, `evaluateRisk`,
  `computeDecisionConfidence`, `determineOversight`, `runTrustIntelligence`).
- `trustIntelligenceEngine.test.js` — 11 tests for the new module on its own.
- `evaluationEngine.js` — **updated**: now imports `runTrustIntelligence` instead of
  having trust logic inline. Re-download and replace your existing copy.
- `evaluationEngine.test.js` — unchanged, included so you have the matching version;
  re-ran it after the refactor and all 8 scenarios still pass.
