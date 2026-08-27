# Runtime Integration — From Documented Interface to Actual Execution

**Purpose:** Prove the frozen interface (see Interface Freeze document) works when actually called at runtime by an external caller — not just described in documentation.

## Constraint Acknowledged Up Front

No other Antares platform's source code (Technology Intelligence, Organizational Futures, Trust & Verification, Enterprise Validation, Integration & Ecosystem) exists in the delivered package. It would violate the ownership boundary to invent that code. Instead, this phase built two small, honest client scripts that exercise the real HTTP contract exactly as a genuine upstream or downstream platform would — using only the public interface, never internal modules.

These scripts are included as build artifacts (`integration/upstream_candidate_producer.py`, `integration/downstream_result_consumer.py`) and were executed against a live, locally-hosted instance of the actual service — not a mock.

## What Was Actually Run

**Upstream producer** — acts as a discovery-style platform:
1. Submits a realistic capability (an invoice-reconciliation automation candidate, with a real problem statement, target org, dependencies, one evidence reference) via `POST /capabilities`.
2. Triggers validation via `POST /capabilities/{id}/validate`.

**Downstream consumer** — acts as an operationalization/approval-style platform:
1. Reads the human-readable report via `GET /capabilities/{id}/report`.
2. Makes its own routing decision purely from the returned `state` field (ACCEPT / HOLD / REJECT / WAIT) — it never touches internal scoring logic.
3. Reads the full audit trail via `GET /capabilities/{id}/history`.
4. Confirms an unknown `capability_id` correctly returns HTTP 404 rather than a default report.

## Result (see `FULL_EVIDENCE_LOG.txt`, sections 3–4, for the complete raw output)

The submitted candidate scored **0.699** and landed in **REVISION_REQUIRED** — not a fabricated pass. Four of eight dimensions were flagged as weak (evidence quality, explainability, constitutional alignment, OBA compatibility), each with a specific reason. The downstream consumer correctly read this state and made a **HOLD** decision, returning the candidate rather than accepting it. This is the intended lifecycle behavior: a genuinely underspecified candidate must not clear validation.

The unknown-id check confirmed the downstream side cannot be fooled into treating a nonexistent capability as valid — the service returned HTTP 404 and the consumer script treated that as a hard failure, not a default result.

## Conclusion

The documented interface is not just accurate on paper — it was exercised end to end, live, by independent client code standing in for real upstream and downstream platforms, and it behaved exactly as documented, including its failure paths.
