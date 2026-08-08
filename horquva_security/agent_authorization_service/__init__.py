"""
agent-authorization-service

RBAC + ABAC + scoped/temporary permissions + continuous re-evaluation.
Depends conceptually on agent-identity-service for "who is this agent"
but does NOT call it directly here (kept decoupled — the gateway is
what chains identity -> authorization per request).
"""
