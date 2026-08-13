# governance/engine/models/

Machine-readable definitions of the 4 core governance objects (Din 2 deliverable).

- `governanceRule.schema.json` — JSON Schema for GovernanceRule (static policy)
- `trustSignal.schema.json` — JSON Schema for TrustSignal (dynamic trust/risk signal)
- `governanceDecision.schema.json` — JSON Schema for GovernanceDecision (final ruling)
- `evidence.schema.json` — JSON Schema for Evidence (immutable decision record)

The `.schema.json` files are the source of truth for any external platform integrating
with this engine (Zeeshan's agents, Zara's capability validation, Abbas's
operationalization — Din 7). Our own engine code uses `../models.js`, which mirrors
these schemas as plain dependency-free JS factory + validator functions
(`createGovernanceRule`, `createTrustSignal`, `createGovernanceDecision`,
`createEvidence`), so the engine never has to import a JSON Schema library just to
build a decision.

Run `node ../models.test.js` from this folder's parent to verify all 4 models
(8/8 tests, rebuilt from Din 1's customer-record-deletion scenario).
