# Final Demo (Din 10) — Trust & Governance Intelligence Platform

## Run it
```
node governance/engine/demo.js
```

## What it shows
Three real proposed actions, each walked through the full chain live:
```
Action Request -> Authority Check -> Rules Check -> Trust Check -> Decision -> Audit
```

1. **PII deletion request** (the original Din 1 story) — verified actor, valid authority,
   good trust score — but Rule R-09 still forces **HUMAN_REVIEW**, because a policy rule
   is never overridden by trust.
2. **A clean read** by a trusted actor — sails through to **ALLOW**.
3. **An unverified actor** tries to read a record — caught at the very first stage,
   **REJECT**, rules/trust never even run.

Every scenario prints which rule fired (or didn't), the risk level, the accountable
owner, and the full reason — that's the explainability requirement: nothing is a black
box, every outcome traces back to a specific rule id, authority check result, or
fail-safe condition.

## Full project test count (all 10 days, run together)
| Day | File | Tests |
|---|---|---|
| 2 | models.test.js | 8/8 |
| 3-4 | evaluationEngine.test.js | 8/8 |
| 5 | trustIntelligenceEngine.test.js | 11/11 |
| 6 | runtimeEnforcement.test.js | 7/7 |
| 7 | governanceApi.test.js | 6/6 |
| 8-9 | adversarialTests.test.js | 8/8 |
| **Total** | | **48/48** |

## One-line project summary (for your presentation/LinkedIn)
"Built a governance and trust intelligence engine for Antares that decides
ALLOW/REJECT/ESCALATE/HUMAN_REVIEW on every proposed AI agent action — with policy
rules, trust scoring, authority verification, an immutable audit trail, and an
adversarial-testing pass that found and fixed a real trust-signal-spoofing
vulnerability. 48/48 tests passing, integrated with 3 other Antares platforms."

## What to say if asked "how does it decide?"
Walk through the precedence order once, out loud, using Scenario 1 as the example:
"A REJECT rule always wins over everything. If nothing rejects it but no rule covers the
action at all, it defaults to human review — never auto-allow. If a rule explicitly
requires review, that stands regardless of trust. Only after all of that does trust and
risk get a say, and even then, high risk can escalate a normally-clean action."
