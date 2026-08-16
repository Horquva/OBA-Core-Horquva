# Adversarial Testing & Explainability (Din 8-9)

## Run the tests
```
node governance/engine/adversarialTests.test.js   -> 8/8
```
(and re-confirm nothing broke: `governanceApi.test.js` -> 6/6, `runtimeEnforcement.test.js` -> 7/7)

## Attacks tried

| # | Attack | Result |
|---|---|---|
| AT-1 | Verified actor claims an authority it was never granted | Blocked — REJECT |
| AT-2 | Attacker relabels its own `actorRole` to dodge the rules-layer check | Blocked — authority check is keyed on verified `actorId`, not the self-declared role |
| AT-3 | Completely fabricated `actorId`, never registered | Blocked — REJECT |
| AT-4 | Case-spoofed `actorId` ("Agent-1" vs "agent-1") hoping for a loose match | Blocked — lookup is exact-match |
| AT-5 | Self-reported a perfect `ORG_TRUST_SCORE` to force a CONDITIONAL rule to auto-ALLOW | **Found a real weakness — fixed (see below)** |
| AT-6 | Replayed an identical rejected request 3 times | Deterministic — REJECT every time, still individually audited |
| AT-7 | Checked that rejection reasons name the specific actor/rule, not a generic message | Confirmed — reasons are specific and checkable |

## The one real weakness found: trust signal spoofing

Before the fix, `requestGovernanceDecision()` accepted a `trustSignals` array from
whoever was calling it, validated the *shape* of each signal (Din 2's schema), but
never checked *who* was actually asserting it. An attacker could send
`{ signalType: 'ORG_TRUST_SCORE', value: 1.0, source: 'attacker-controlled-client' }`
and the engine would treat it exactly like a real signal from the real trust engine —
enough to push a CONDITIONAL rule straight to ALLOW.

**Fix:** `governanceApi.js` now checks `signal.source` against a `TRUSTED_SIGNAL_SOURCES`
allow-list (`trust-engine`, `trust-intelligence-engine-v1`, `anomaly-detector`). Anything
from an unrecognized source is dropped with a warning — dropped means it's simply
*absent* to the trust engine, which (from Din 5) already treats a missing signal as
neutral, never as automatic trust.

## Explainability

Every decision the engine returns carries a `reason` string built from concrete facts —
the specific rule id that fired, the specific actor and authority involved, or the exact
fail-safe condition that triggered (e.g. "no rule covers this action"). AT-7 and AT-7b
lock this in as a test, not just a hope: a rejection has to name the actor and the wrong
authority; a rule-driven decision has to cite the rule id. A generic "denied" string
would fail these tests.

## Known remaining gap (flagged for later, not fixed here — out of this engine's scope)
The `TRUSTED_SIGNAL_SOURCES` allow-list checks the `source` *label* a signal claims, not
a cryptographic proof of where it came from. A compromised or misconfigured internal
service could still forge a source string. Real signal provenance (signing/verifying
which engine actually produced a signal) is an ML/infrastructure concern outside
Kanwal's governance-layer scope — worth raising with whoever owns trust-signal
generation (Hasnain's side) before this goes to production.
