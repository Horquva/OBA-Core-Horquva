# Runtime Enforcement (Din 6)

Wires the full chain together and defines exactly what happens when information is
missing at any stage — that's the actual Din 6 deliverable, not just "make it work."

```
Action Request -> Authority Check -> Rules Check -> Trust Check -> Decision -> Audit
```

## Run the tests
```
node governance/engine/runtimeEnforcement.test.js   -> 7/7
```

## The 3 fail-safe rules (memorize these — this is what Din 6 is actually testing)

**1. Authority check fails → immediate REJECT, rules/trust never run.**
An unverified actor, or an actor claiming authority it doesn't hold, is rejected before
any policy or trust logic even sees the request. No rule and no trust score can rescue
a failed authority check.

**2. No rule matches the action → HUMAN_REVIEW.** (carried over from Din 3-4/5)
Unknown = not safe. The engine never defaults an unrecognized action to ALLOW.

**3. Audit write fails on an ALLOW decision → downgraded to HUMAN_REVIEW.**
This is the new one for Din 6. If the system cannot record that an action happened and
why, it will not let that action proceed silently — an unauditable ALLOW becomes a
HUMAN_REVIEW instead. If the audit write fails on an outcome that was already
restrictive (REJECT/ESCALATE/HUMAN_REVIEW), the outcome is kept as-is — it's already
the safe choice — but the failure is surfaced via `auditWriteFailed: true` so it isn't
silently lost.

## New files
- `security/authorityCheck.js` — Stage 1. Sample in-memory authority registry +
  `authorityCheck(actionRequest, registry)`.
- `governance/audit/auditLog.js` — Stage 4. Append-only, immutable entries, no
  update/delete function exists. `simulateFailure` option exists only to make the
  fail-safe path testable — a real audit store's real failures (disk full, DB down)
  will trigger the same downgrade path once this in-memory version is swapped out.
- `governance/engine/runtimeEnforcement.js` — orchestrates all 6 stages,
  `handleActionRequest(actionRequest, context, rules, trustSignals, options)`.
- `governance/engine/runtimeEnforcement.test.js` — 7 scenarios covering both REJECT
  paths, the clean ALLOW path, the still-HUMAN_REVIEW-with-authority PII case, and both
  audit-failure fail-safe cases.

## Note on defense-in-depth
Rule R-13 (reject unverified actors, inside `rules.js`) now overlaps with the new
Authority Check — that's intentional. Authority Check is the primary gate; R-13 is a
backup net inside the rules layer in case Authority Check is ever bypassed or
misconfigured. Don't remove R-13 when integrating Authority Check.

## Known gaps (left for Din 7+)
- `AUTHORITY_REGISTRY` and the audit log are both in-memory — need to be backed by
  real services before this leaves demo/dev.
- No real network/platform boundary yet — Din 7 is where Zeeshan/Zara/Abbas's platforms
  actually call into `handleActionRequest` over an exposed API.
