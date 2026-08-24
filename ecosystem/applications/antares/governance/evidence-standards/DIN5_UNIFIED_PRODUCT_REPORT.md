# Din 5 — Actual Governance State Available to the Unified Product

**Boundary respected:** no frontend code touched. `gateway.js` and the dashboard stay exactly as they are — this was purely about making sure the API they already call returns *real* data instead of fake data. Their existing code (`governance.data.decisions`, `.length`, raw pass-through — checked, no per-field access) works unmodified with the new shape.

## The gap (found back in Din 1, fixed now)

`GET /api/decisions` used to call `runScenarios()` — which **re-ran the same 3 canned demo cases every single time it was hit** — and returned that as `decisions`. The gateway's dashboard was showing `governance_decisions: 3` forever, no matter what actually happened in the system. That's not "actual governance state," that's a static demo replaying itself.

## The fix

`decisions` is now built from `queryAuditTrail()` — the real audit log. The old demo walkthrough didn't get deleted (still useful for docs/onboarding) — it moved to its own `sampleScenarios` key so a dashboard can never again mistake it for live activity.

## Proof (real run)

1. Sent one real decision via `POST /api/evaluate` (a fresh `read_customer_record` request).
2. Called `GET /api/decisions` immediately after:
```
decisions (REAL state) count: 1
decisions: [{ decisionId: "D-...", auditEntryId: "AUD-...", outcome: "ALLOW", ... }]
sampleScenarios count (separate, illustrative only): 3
```
The real decision — and only the real decision — showed up in `decisions`. The 3 demo cases are still there, but clearly separated.

## Honest limitation flagged, not fixed

The audit store is **in-memory only** (`governance/audit/auditLog.js` says so directly in its own comments). That means:
- While the server keeps running, `GET /api/decisions` is accurate real-time state.
- If the server restarts, the whole audit trail — and therefore everything the unified product would show — resets to empty. There is no durable history yet.

Replacing the in-memory store with a real DB/log is **new architecture**, which is explicitly out of scope for this contract-fixing pass (per Din 2's own constraint). Documented clearly in `CONTRACT.md` section 6 so whoever owns the unified product/frontend knows exactly what durability guarantee they do and don't have today.

## Files delivered
- `server.js` (updated — `/api/decisions` now serves real state)
- `CONTRACT.md` (updated — known-gaps section corrected, new response-shape section, status checklist brought current through Din 5)
