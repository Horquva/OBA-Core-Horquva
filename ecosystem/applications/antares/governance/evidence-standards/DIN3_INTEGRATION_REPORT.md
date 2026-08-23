# Din 3 — Connect Governance to a Real Antares Runtime Consumer

**Goal:** "governance exists" → "Antares actually uses it". Verified with a real, run-it-yourself demo, not a written claim.

## What Din 1 found was fake
`demo_day7_governance.py` (Zeeshan's platform) called:
```python
create_policy(session, ..., created_by="kanwal")
```
with a **hand-typed** rule string. It was *labeled* as coming from Kanwal's engine but never actually did — no code anywhere called out to her engine. This is the exact "roadmap vs runtime" gap Din 1 was built to catch.

## What Din 3 actually built

1. **`GET /api/rules`** added to `governance/engine/server.js` — the engine's real, live rule set (`rules.js`) exposed read-only, so an external platform can pull real rules instead of inventing them.
2. **`kanwal_governance_sync.py`** in Zeeshan's `capability-service` — calls that endpoint over real HTTP, honestly translates Kanwal's 4-outcome rule model into Zeeshan's 1-boolean Policy model, and registers the result through `receive_governance_rules()` — an integration point that existed in the code since Din 7's original build but had **zero real callers** until this.
3. **`demo_din3_kanwal_integration.py`** — proves it live.

## Proof (actual run output, not a claim)

```
--- Step 1: Real HTTP call to Kanwal's live engine (GET /api/rules) ---
Policies actually created from Kanwal's real rules (2):
  - [kanwal:R-05] Updates are conditional on trust  (requires_approval=True, provenance=kanwal_governance)
  - [kanwal:R-09] PII deletion requires human review (requires_approval=True, capability_id=<real id>, provenance=kanwal_governance)

Rules that could NOT be translated, reported honestly (2):
  - R-01 (ALLOW_IF_MATCH): needs no Policy row — no-op by design
  - R-13 (REJECT_IF_MATCH): Zeeshan's Policy model has no REJECT concept — no enforcement path yet

--- Step 2: Run a REAL agent task against the capability R-09 now covers ---
Task status immediately after run_agent_task: blocked
Task result: None  (proves it did NOT execute)
```

The task blocked **because of R-09**, pulled live from Kanwal's engine seconds earlier — not because of a fake policy someone typed into a demo file.

## Honest gap — not fixed, not hidden

**R-13 ("unverified actors always rejected") has no enforcement path on Zeeshan's side.** Zeeshan's Policy model only knows `requires_approval: bool` — there is no REJECT concept in it at all. Unverified-actor rejection currently only happens inside Kanwal's own engine when *her* API is called directly; it does nothing to protect Zeeshan's local `authority_check()`, which is driven purely by capability grants, not by Kanwal's actor-verification rules.

This is a real architectural gap between the two platforms' governance models, not a Din 3 bug — flagging it for **Din 4** (prove one legitimate end-to-end boundary scenario) or **Din 7** (final integration) to decide: either Zeeshan's authority_check gains a REJECT-capable hook, or Kanwal's engine stays the sole enforcement point for actor verification and Zeeshan is told to route actor-identity questions to her `requestGovernanceDecision()` directly instead of through the Policy sync.

## Files delivered
- `server.js` (updated again — `/api/rules` route added on top of Din 2's fix)
- `kanwal_governance_sync.py`
- `demo_din3_kanwal_integration.py`
