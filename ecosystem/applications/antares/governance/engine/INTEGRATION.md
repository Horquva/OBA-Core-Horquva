# Governance API & Integration (Din 7)

`governanceApi.js` is the ONLY file other platforms should ever import from. Nothing
else in `governance/engine/` is meant to be called directly from outside.

## Run the tests
```
node governance/engine/governanceApi.test.js   -> 6/6
node governance/engine/runtimeEnforcement.test.js -> 7/7 (still passing after the dryRun addition)
```

## 1. Zeeshan's Agent Platform — `requestGovernanceDecision(governanceRequest)`
Call this when an agent is about to actually perform an action. Full chain runs
(Authority → Rules → Trust → Decision → Audit), and a real, permanent audit entry is
written.

```js
const { requestGovernanceDecision } = require('./governanceApi');

const response = requestGovernanceDecision({
  actionRequest: {
    id: 'EVT-123',
    action: 'delete_customer_record',
    actorId: 'agent-zeeshan-047',
    actorRole: 'verified_agent',
    resourceType: 'customer_record',
    claimedAuthority: 'customer_deletion_request'
  },
  context: { platform: 'zeeshan-agent-platform' },
  trustSignals: [
    { actorId: 'agent-zeeshan-047', signalType: 'ORG_TRUST_SCORE', value: 0.87, source: 'trust-engine' }
  ]
});
// response = { outcome, reason, riskLevel, accountableOwner, decisionId, evidenceId, auditEntryId, auditWriteFailed }
```

## 2. Zara's Capability Validation — `previewGovernanceOutcome(governanceRequest)`
Same input shape. Use this to ask "if this action were attempted, what would the
governance engine say?" — **before** actually granting a capability. Nothing is written
anywhere; `auditEntryId` in the response will always be `null`. This engine only
answers the governance question — it does not implement capability validation itself,
that logic stays on Zara's side.

## 3. Abbas's Operationalization — `queryAuditTrail(filters)`
Read-only. `queryAuditTrail()` returns every real decision ever recorded.
`queryAuditTrail({ decisionId })` returns just the one matching entry (or `[]`).
Never returns anything from a preview call — previews are never recorded.

## Malformed input handling
`trustSignals` sent by a caller are validated against the Din 2 schema before use. A
signal that fails validation is dropped and logged (`console.warn`) — it does not crash
the request, and a dropped signal is treated the same as that signal simply being
absent (which the trust engine already handles as neutral, never as auto-trust).

## What this integration deliberately does NOT do (scope boundary)
- No general capability validation logic — that's Zara's platform.
- No agent orchestration — that's Zeeshan's platform.
- No organizational futures research or knowledge operationalization — that's Abbas's.
- No AI/ML model engineering — this engine only consumes trust signals, it doesn't
  produce them.

This engine's job stays exactly what it's always been: given an action, decide
ALLOW/REJECT/ESCALATE/HUMAN_REVIEW with a reason, and keep the record of why.
