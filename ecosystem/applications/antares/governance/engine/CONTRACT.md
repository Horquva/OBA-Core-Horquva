# Trust & Governance Intelligence Platform — Integration Contract

Owner: Kanwal Raveen
Purpose: Tells other Antares platforms exactly what this engine expects as
input and what it returns as output — so any real caller (Zeeshan's Agent
Platform, Zara's Capability Validation, Abbas's Operationalization) can
integrate without guessing field names or re-implementing governance logic.

This is a **contract around the existing implementation** (Din 1 confirmed
`governance/engine/` is real and 48/48 tests genuinely pass) — nothing in
this document describes new architecture. It only makes explicit, in one
place, what the code already does.

Position in the lifecycle:
`Any platform proposes an action → Trust & Governance (Kanwal — this
engine) → ALLOW / REJECT / ESCALATE / HUMAN_REVIEW, with a permanent audit
record`

---

## 1. Two ways to call this engine

| Mode | When to use | Entry point |
|---|---|---|
| Node.js import (`governanceApi.js`) | Same process / same repo import | `require('./governance/engine/governanceApi')` |
| HTTP API (`server.js`, port 4003) | Separate service/process | `POST http://<governance-host>/api/evaluate` |

**Both must go through `governanceApi.js`.** Nothing else in
`governance/engine/` (`runtimeEnforcement.js`, `evaluationEngine.js`,
`authorityCheck.js`) is a supported external entry point — those are
internal chain steps and can change without notice.

> **Din 2 fix applied:** `server.js`'s `POST /api/evaluate` previously
> called `handleActionRequest()` directly, which skipped the AT-5
> untrusted-trust-signal filter that `governanceApi.js` applies. An HTTP
> caller could self-report a fake `ORG_TRUST_SCORE` and push a borderline
> action toward ALLOW. Fixed: the HTTP route now goes through
> `requestGovernanceDecision()`, so the HTTP contract gives the same
> guarantees as the direct import. Verified by re-running the AT-5 case
> over HTTP — a forged signal is now dropped and logged, same as the
> in-process path.

## 2. Input — what a caller must send

```json
{
  "actionRequest": {
    "id": "EVT-123",
    "action": "delete_customer_record",
    "actorId": "agent-zeeshan-047",
    "actorRole": "verified_agent",
    "resourceType": "customer_record",
    "claimedAuthority": "customer_deletion_request"
  },
  "context": { "platform": "zeeshan-agent-platform" },
  "trustSignals": [
    { "actorId": "agent-zeeshan-047", "signalType": "ORG_TRUST_SCORE", "value": 0.87, "source": "trust-engine" }
  ]
}
```

Required: `actionRequest.id`, `actionRequest.actorId`. Everything else in
`actionRequest` is used if present (`claimedAuthority` is checked against
the authority registry; missing it just means no specific-authority claim
is checked, actor verification still runs).

`trustSignals` is optional and additive — the engine never treats a
missing signal as distrust or as auto-trust, only as neutral (per
`CONCEPTS.md`, Trust Signal section). **A signal is silently dropped
(logged, not fatal) if its `source` is not one of the three the engine
trusts:** `trust-engine`, `trust-intelligence-engine-v1`,
`anomaly-detector`. A caller cannot buy an outcome by attaching its own
trust score — the engine only listens to its own recognized scoring
sources.

## 3. Output — what every caller gets back

All three entry points return the same shape (`toExternalResponse` in
`governanceApi.js`):

```json
{
  "outcome": "ALLOW | REJECT | ESCALATE | HUMAN_REVIEW",
  "reason": "human-readable explanation, always names the exact rule id or fail-safe condition",
  "riskLevel": "LOW | MEDIUM | HIGH | CRITICAL",
  "accountableOwner": "string — who answers for this decision",
  "decisionId": "D-...",
  "evidenceId": "EV-...",
  "auditEntryId": "AUD-... | null",
  "auditWriteFailed": true | false
}
```

`auditEntryId` is `null` only for preview calls (see below) — every real
decision is guaranteed either a real audit entry or `auditWriteFailed: true`
surfaced explicitly; it is never silently unrecorded.

## 4. Three entry points, one per real use case

| Function | For | Writes to audit? |
|---|---|---|
| `requestGovernanceDecision(request)` | A real action is about to happen | Yes — mandatory |
| `previewGovernanceOutcome(request)` | "What WOULD happen if this were attempted?" — before granting a capability | No — `auditEntryId` always `null` |
| `queryAuditTrail(filters)` | Read past real decisions. `queryAuditTrail({decisionId})` for one entry, `queryAuditTrail()` for everything | N/A (read-only) |

This engine only answers the governance question. It does **not** do
capability validation, agent orchestration, or operationalization/reporting
itself — those stay the calling platform's own responsibility.

## 5. Sample rule set currently active (`rules.js`)

| Rule | Applies to | Behavior |
|---|---|---|
| R-01 | `read_customer_record` | ALLOW by default |
| R-05 | `update_customer_record` | CONDITIONAL — ALLOW only if org trust ≥ 0.7 and no anomaly, else ESCALATE |
| R-09 | `delete_customer_record` on `customer_record` | Always HUMAN_REVIEW, regardless of trust |
| R-13 | any action, `actorRole: unverified_agent` | Always REJECT, before rules/trust even run |

This is a **sample set for demo/testing**, not the final production rule
book — Din 6 (already noted in `rules.js`) is where a real rules
store/DB replaces this hardcoded list.

## 6. Known integration gaps (must resolve before production use)

- **Not actually wired into any real platform yet.** Din 1 verification
  found `governanceApi.js` has zero real callers outside
  `governance/engine/` itself — the "3 integrated platforms" claim in
  `FINAL_DEMO.md` describes test-file simulations, not real traffic.
  Zeeshan's `capability-service/app/services/governance_service.py` has an
  unwired stub (`receive_governance_rules(..., source="kanwal")`) that is
  the natural real entry point — this is Din 3's job.
- **`GET /api/decisions` does not return real decision history.** It
  re-runs 3 canned demo scenarios on every call and appends the real audit
  trail underneath. Any dashboard consuming this (the gateway does) is
  showing demo output, not live governance activity, until Din 3+
  produces real traffic to audit.
- **Rules are hardcoded**, not loaded from a shared store — flagged
  above, tracked as a pre-production item, not a Din 2 blocker.

## 7. Status

- [x] Core decision chain implemented and unit-tested (48/48, Din 1-6)
- [x] Public contract (`governanceApi.js`) implemented (Din 7 code) and now
      formally documented here (Din 2)
- [x] HTTP path brought into line with the documented contract (Din 2 fix:
      `/api/evaluate` now enforces the same trust-signal-source validation
      as the direct import)
- [ ] Verified against Zeeshan's real `capability-service` calling in (Din 3)
- [ ] Verified against Zara's or Abbas's real services calling in (Din 3/4)
- [ ] `GET /api/decisions` replaced with real decision history instead of
      re-run demo scenarios
