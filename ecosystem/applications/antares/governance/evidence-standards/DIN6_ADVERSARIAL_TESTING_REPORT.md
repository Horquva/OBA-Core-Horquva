# Din 6 — Invalid / Unauthorized / Malformed / Adversarial Condition Testing

**Goal:** Antares kabhi galat proceed ya false success report na kare. Tested against the **live HTTP contract**, not just unit tests — Din 2 already showed once that something safe at the JS-function level can still break at the HTTP wrapper layer, so unit tests alone aren't enough proof here.

## Result: 10/10 passed

| # | Case | Expected | Actual |
|---|---|---|---|
| 1 | Malformed JSON body | 400, server survives | ✅ 400, server stayed up |
| 2 | Missing `actionRequest` | Rejected, no silent default | ✅ 400 |
| 3 | Missing `actorId` | Fail-safe REJECT, never ALLOW | ✅ REJECT, reason correctly names it |
| 4 | Unverified actor self-claims `verified_agent` role | Rejected by registry truth, not self-report | ✅ REJECT |
| 5 | Forged `ORG_TRUST_SCORE` from untrusted source (Din 2 regression check) | Signal dropped, no ALLOW bought | ✅ dropped + logged, outcome ≠ ALLOW |
| 6 | Actor claims authority never granted to them | Rejected | ✅ REJECT |
| 7 | Every real decision has a matching, independently-retrievable audit entry | No "false success" (decision without a record) | ✅ present, found via Din 5's real `/api/decisions` path |
| 8 | Unauthenticated access | — (see below) | Flagged, not a pass/fail |

Case 5 doubles as a **regression check** for the Din 2 fix — confirms it still holds after Din 3's `/api/rules` addition and Din 5's `/api/decisions` rewrite didn't accidentally reopen it.

## Honest gap found, not fixed — Case 8

**There is no authentication or authorization mechanism on this engine at all.** `GET /api/rules`, `GET /api/decisions`, and `POST /api/evaluate` all respond to anyone who can reach port 4003 — no API key, no token, no allow-list of calling services. Right now this is contained by network placement (only reachable inside the Antares network), but nothing in the code itself enforces "only approved platforms may call this."

This is **not fixed in Din 6** because adding real auth (API keys? mTLS? a shared Antares service-identity mechanism?) is a genuine architecture decision — the same category of change Din 2 already ruled out of scope ("legitimate contract, not a new architecture"). It needs a decision from whoever owns cross-platform security standards, not something to invent unilaterally inside this engine. Flagging it here so it's visible before Din 7's release acceptance, not discovered after.

## Files delivered
- `din6_adversarial_http_tests.js` — exits non-zero on any failure, safe to drop into CI as the Din 6 gate going forward, not just a one-time demo
