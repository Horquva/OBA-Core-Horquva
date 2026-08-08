# horquva_security_py — AI Security Control Plane (W3)

Sibling package to `horquva_modules_py/`. 12 independently runnable
FastAPI services + one shared contracts library, implementing the W3
"Core Implementation & Control-Plane Activation" scope.

## Install

```bash
cd horquva_security_py
pip install -e libs/ai-security-common
pip install -r requirements.txt
```

## Run all tests

```bash
cd ..   # repo root, one level above horquva_security_py/
PYTHONPATH=. python -m pytest horquva_security_py/ -v
```
78 tests across all 12 services, all passing.

## Run a service locally

Each service is `uvicorn <package>.main:app --port <port>`, e.g.:

```bash
uvicorn horquva_security_py.guardrail_engine.main:app --port 8101
uvicorn horquva_security_py.ai_security_api_gateway.main:app --port 8100
```

Port map (also in `ai_security_api_gateway/config.py`):

| Service | Port |
|---|---|
| ai-security-api-gateway | 8100 |
| guardrail-engine | 8101 |
| prompt-security-service | 8102 |
| agent-identity-service | 8103 |
| agent-authorization-service | 8104 |
| tool-permission-service | 8105 |
| context-memory-isolation-service | 8106 |
| model-evaluation-service | 8107 |
| risk-assessment-service | 8108 |
| human-approval-service | 8109 |
| sandbox-service | 8110 |
| kill-switch-controller | 8111 |

The gateway is the only service meant to be internet-facing; every
other service trusts the gateway to have already authenticated the
caller and checked the kill switch.

## Every service, one line each

- **guardrail-engine** — evaluates input/output content, returns a machine-readable allow/block/require_approval decision.
- **prompt-security-service** — focused prompt-only checks: direct vs indirect injection, instruction conflicts, sanitization.
- **agent-identity-service** — agent registration, credential issue/rotate/verify, trust level, re-verification interval.
- **agent-authorization-service** — RBAC roles + scoped/temporary grants + ABAC vetoes (sensitive resources, force-deny).
- **tool-permission-service** — tool registry, per-agent capability binding, per-call authorization.
- **context-memory-isolation-service** — tenant/session-partitioned memory; owner-only read/delete; TTL expiry.
- **model-evaluation-service** — scores a batch of (prompt, output) samples against safety criteria, pass/fail + findings.
- **risk-assessment-service** — aggregates signals (trust level, guardrail risk, sensitivity, eval score, cross-tenant) into one RiskLevel + transparent rationale.
- **human-approval-service** — approval queue; hard-blocks self-approval (an agent can never approve its own action).
- **sandbox-service** — isolated session lifecycle with capability allowlist + call budget (control-plane model, not an actual OS sandbox).
- **kill-switch-controller** — global + scoped emergency stop; global always wins; no self-reset by whoever tripped it.
- **ai-security-api-gateway** — single entry point: API-key auth, per-agent rate limiting, kill-switch check, routing, correlation IDs, one normalized error contract. Proxies to every service above over HTTP.

## Shared Security Contracts

`libs/ai-security-common/ai_security_common/` — canonical pydantic
models and enums (`RiskLevel`, `Decision`, `GuardrailDecision`,
`AgentIdentity`, `PermissionGrant`, `EvaluationResult`,
`ApprovalRequest`, `SecurityEvent`, `KillSwitchStatus`, etc.) and
error types (`SecurityError`, `AuthorizationError`, `ValidationError`,
`NotFoundError`). Every service built after guardrail-engine imports
from here instead of redefining its own copies.

**guardrail-engine itself still has its own local copies** (built
before this library existed, per the original TODO(shared-contracts)
markers in its `schemas.py`) — worth a follow-up pass to point it at
`ai_security_common` too, so there's truly one canonical definition
platform-wide.

## What's honestly stubbed / not production-ready yet

- **Everything is in-memory.** Every store (`store.py` in each
  service) is a plain dict that resets when the process restarts.
  Fine for demonstrating the contract and passing tests; needs a real
  database before this handles real traffic.
- **guardrail-engine's policy evaluator** (`AllowAllPolicyEvaluator`)
  is a stub — no real policy engine exists yet.
- **No Security Events service exists** — nothing actually persists
  `SecurityEvent` records anywhere yet, even though the model is
  defined in shared contracts and services log locally.
- **Gateway's API-key issuance endpoint is unauthenticated** — in a
  real deployment that endpoint needs to be locked to operators / driven
  by agent-identity-service registration, not open as it is here.
- **sandbox-service models session lifecycle only** — it does not
  actually execute anything in an isolated OS/container sandbox; wiring
  a real isolation backend is infra work outside this scope.
- **Cross-service calls mostly aren't wired up yet** except gateway →
  kill-switch-controller. E.g. risk-assessment-service doesn't
  automatically pull guardrail-engine's last decision — callers
  currently have to pass signals in explicitly. Chaining these for
  real end-to-end flows is the natural next step.

## Negative-path / security test coverage already in place

- guardrail-engine: malformed input, injection phrases, untrusted
  retrieved content, sensitive actions, schema rejection, null bytes.
- context-memory-isolation-service: cross-agent, cross-tenant, and
  cross-session access all explicitly tested as denied; non-owner
  delete denied; TTL expiry denied.
- agent-authorization-service: no-role/no-grant denial, sensitive
  resource requiring explicit grant even with admin role, expired
  temporary grant denial, explicit force-deny veto.
- human-approval-service: self-approval rejected, double-decision
  rejected.
- kill-switch-controller: self-reset-by-tripper rejected, global trip
  blocks every scope.
- ai-security-api-gateway: missing/invalid API key rejected, unknown
  route 404s, killed agent gets 423, rate limit enforced (429).

Still missing from Testing/Negative-Security-Testing per the doc:
unauthorized-agent end-to-end flows through the real gateway → service
chain (current gateway tests use a mock transport, not the real
services), and cross-service integration tests generally.
