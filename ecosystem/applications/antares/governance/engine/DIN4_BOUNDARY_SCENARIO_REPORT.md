# Din 4 — Own Governance Boundary, One Legitimate End-to-End Scenario

**Scope discipline (as instructed):** this proves *only* Kanwal's own governance boundary end-to-end — it does not attempt to prove all Antares platforms work together (that stays out of scope; Din 3 already showed the real integration gap with Zeeshan's Policy model, and it stays flagged, not fixed here).

## Why this is a different proof than what already existed

- `demo.js` (Din 10) and `SCENARIO.md` (Din 1) already walk the same kind of PII-deletion story, but **in-process**, calling `handleActionRequest()` directly — that only proves the JS functions work when called correctly, not that the live network contract does.
- The Din 3 integration demo proved a *different* platform's code (Zeeshan's) can drive a real outcome — useful, but it depends on Zeeshan's implementation being correct too.
- **Din 4 needed a scenario provable on Kanwal's boundary alone** — real HTTP, real new decision, real independent retrieval — with zero dependency on any other platform's code being right.

## Scenario: a real GDPR Article 17 erasure request

A genuinely new actor/action combination (not replayed demo or test fixture data): `agent-zeeshan-047` requests deletion of a customer record because the customer submitted a real erasure request.

### Step 1 — real HTTP call, the documented public contract only
`POST /api/evaluate` (per `CONTRACT.md`) — not an internal function call.

```
Outcome:           HUMAN_REVIEW
Reason:            Rule(s) R-09 mandate human review for this action, independent of trust score.
Risk level:        HIGH
Accountable owner: governance-platform-lead
Decision id:       D-1787484647153-1
Audit entry id:    AUD-1787484647153-1
```

Correct: R-09 forced HUMAN_REVIEW even with a high trust score (0.91) — trust never overrides a hard policy rule, exactly as `CONCEPTS.md` promises.

### Step 2 — independent re-confirmation, a separate HTTP request
A second, unrelated HTTP call (`GET /api/decisions`) — simulating an auditor checking the record later, in a different request than the one that created it — finds the exact same decision, with matching outcome and accountable owner, proving the audit entry genuinely persisted server-side and isn't just something the first response echoed back.

## What this proves
- The full chain (Authority → Rules → Trust → Decision → Audit) works correctly for a real, legitimate (non-adversarial) business scenario, reached **only** through the public contract.
- The audit record is real and independently retrievable — not just in-memory to the request that created it.
- This holds true regardless of whether Zeeshan's, Zara's, or Abbas's platforms are ever correctly wired up — Kanwal's boundary is self-contained and complete on its own terms.

## Files delivered
- `din4_boundary_scenario.js` (run against the live server on port 4003; exits non-zero on any assertion failure, so it can be dropped into CI as a real acceptance check, not just a demo script)
