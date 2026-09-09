# guardrail-engine

**AI Security Control Plane — W3 Service #1 — Owner: Muhammad Afaq Bhatti**

A FastAPI microservice that turns raw input/output content into a
single machine-readable `GuardrailDecision`. It is the first of the
12 W3 services and does not depend on any of the others yet — the
policy-evaluation step is a stub (`AllowAllPolicyEvaluator`) until
the real policy engine exists.

## What it does (per the W3 spec)

- Validate input schemas (pydantic, at the API boundary)
- Detect malformed input (control characters beyond what schema validation catches)
- Inspect prompts / detect injection (heuristic pattern matching)
- Classify untrusted content (retrieved/tool content addressing the agent directly)
- Invoke policy evaluation (stub — see `policy.py`)
- Validate model output
- Detect sensitive actions (fund transfer, delete, credential change, etc.)
- Classify risk (low / medium / high / critical)
- Block prohibited actions / route high-risk actions to approval
- Return machine-readable decisions

## Install / run

```bash
pip install -r ../requirements.txt
uvicorn horquva_security_py.guardrail_engine.main:app --reload --port 8101
```

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | liveness |
| GET | `/ready` | readiness |
| POST | `/guardrail/evaluate-input` | evaluate a prompt/user-input/retrieved-content/tool-call |
| POST | `/guardrail/evaluate-output` | evaluate a model output / proposed action |

Both POST endpoints return a `GuardrailDecision`:

```json
{
  "decision_id": "…",
  "correlation_id": "…",
  "agent_id": "agent-1",
  "session_id": "session-1",
  "decision": "allow | block | require_approval",
  "risk": "low | medium | high | critical",
  "reasons": ["…"],
  "detections": [{"type": "...", "confidence": 0.85, "detail": "...", "matched_snippet": "..."}],
  "evaluated_at": "2026-08-08T…Z"
}
```

## Decision policy

- `CRITICAL` risk (explicit policy violation) → `block`
- `HIGH` risk (injection match, untrusted content addressing the agent,
  sensitive action) → `require_approval` (never auto-blocked and never
  auto-allowed — keeps the "no autonomous self-approval for high-impact
  actions" non-negotiable intact)
- `MEDIUM`/`LOW` → `allow`

## Tests

```bash
pytest horquva_security_py/guardrail_engine/tests/ -v
```

20 tests: allow path, block path, require-approval path, malformed
input, injection phrases (parametrized), untrusted retrieved content,
sensitive actions, and negative/schema tests (missing fields, empty
content, null bytes, malformed request → 422 not 500).

## Demo

```bash
python -m horquva_security_py.guardrail_engine.demo
```

Expected final line: `All modules ran successfully.`

## Known stubs / TODOs (tracked, not hidden)

- `policy.py`: `AllowAllPolicyEvaluator` is a placeholder — swap for
  the real policy engine when it exists. Named loudly so nobody
  mistakes it for real enforcement.
- `schemas.py`: `GuardrailDecision`, `RiskLevel`, `Decision`, `Detection`
  are defined locally and marked `TODO(shared-contracts)` — move to
  `/libs/ai-security-common/` once Shared Security Contracts is built,
  per "one canonical security primitive, no duplicated models."
- No audit/Security-Events integration yet — the logging middleware is
  a placeholder for that.
- Not exposed directly to untrusted callers — sits behind
  `ai-security-api-gateway` (not yet built), which owns authn/authz.
- Injection pattern list is a first pass, meant to grow from AI
  Red Teaming findings (Attack → Finding → Guardrail → Regression Test).
