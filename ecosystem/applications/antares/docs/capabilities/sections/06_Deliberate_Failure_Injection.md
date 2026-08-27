# Deliberate Failure Injection — Confirming No False Confidence

**Purpose:** Deliberately break the system in the ways it is most likely to be broken in production — missing evidence, missing dependencies, unknown identifiers, empty submissions — and confirm it reports failure honestly rather than manufacturing a false pass.

This is the single most important verification step given the standing rule that a fake success is worse than a visible failure.

## Tests Executed (see `failure_injection/test_failure_injection.py` and `FULL_EVIDENCE_LOG.txt`, section 5)

| # | Injected failure | Required behavior | Actual result |
|---|---|---|---|
| 1 | Completely empty capability submitted | Must NOT reach `VALIDATED`; score must be low | `state=INCOMPLETE`, `score=0.22` — **PASS** |
| 2 | Strong narrative, zero evidence references | `EVIDENCE_QUALITY` dimension must fail and score 0.0, not be silently skipped | `passed=False`, `score=0.0` — **PASS** |
| 3 | Read endpoints called with an unknown `capability_id` | Every read endpoint (`assessment`, `status`, `report`) must return 404, never a default object | All three returned `404` — **PASS** |
| 4 | History requested for an unknown `capability_id` | Must return an empty list, never fabricated transitions | `status=200`, `history=[]` — **PASS** |
| 5 | Revision requested for a `capability_id` that was never submitted | Must fail (404), not silently create a new record | `status=404` — **PASS** |

**Result: 5/5 checks passed.** In every injected-failure scenario, the system either surfaced an explicit low score with itemized reasons, or refused the request outright. At no point did it produce a result that could be mistaken for a genuine success.

## Interpretation

This is real evidence that the "no fake success" requirement is met by the current implementation's actual behavior, not merely by policy or intention. A caller — human or another platform — cannot currently be misled by this service into believing a broken or incomplete capability is validated.

## Known Limitation of This Test Round

These checks were run against the current in-memory implementation. They have not been repeated against a persistent-storage backend, a networked deployment with latency/timeouts, or under concurrent/racing writes — all of which are realistic future failure modes once the persistence gap identified elsewhere in this verification is closed. Failure injection should be re-run after that work lands.
