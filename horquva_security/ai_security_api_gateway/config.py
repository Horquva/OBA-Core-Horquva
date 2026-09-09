"""
Downstream service registry. Base URLs are read from environment
variables so this gateway can point at services running on different
hosts/ports in real deployment; sane localhost defaults are provided
for local dev, matching one-port-per-service.
"""
from __future__ import annotations
import os

SERVICE_PORTS = {
    "guardrail-engine": 8101,
    "prompt-security-service": 8102,
    "agent-identity-service": 8103,
    "agent-authorization-service": 8104,
    "tool-permission-service": 8105,
    "context-memory-isolation-service": 8106,
    "model-evaluation-service": 8107,
    "risk-assessment-service": 8108,
    "human-approval-service": 8109,
    "sandbox-service": 8110,
    "kill-switch-controller": 8111,
}

# route prefix -> downstream service name
ROUTES = {
    "guardrail": "guardrail-engine",
    "prompt-security": "prompt-security-service",
    "agents": "agent-identity-service",
    "authz": "agent-authorization-service",
    "tools": "tool-permission-service",
    "memory": "context-memory-isolation-service",
    "model-evaluation": "model-evaluation-service",
    "risk": "risk-assessment-service",
    "approvals": "human-approval-service",
    "sandbox": "sandbox-service",
    "kill-switch": "kill-switch-controller",
}


def service_base_url(service_name: str) -> str:
    env_key = "SVC_" + service_name.upper().replace("-", "_") + "_URL"
    override = os.environ.get(env_key)
    if override:
        return override.rstrip("/")
    port = SERVICE_PORTS[service_name]
    return f"http://localhost:{port}"
