"""
Authorization decision engine: RBAC role permissions OR an explicit
scoped/temporary grant must cover the requested resource:scope. ABAC
attributes can additionally VETO an otherwise-allowed request (e.g.
high data sensitivity requires an explicit grant, role alone isn't
enough). Explicit-deny wins over any allow signal.
"""
from __future__ import annotations
import uuid
from datetime import datetime, timezone

from .schemas import AuthorizationCheckRequest, AuthorizationDecision
from .store import AuthorizationStore, SENSITIVE_RESOURCE_PREFIXES


def check_authorization(req: AuthorizationCheckRequest, store: AuthorizationStore,
                         *, correlation_id: str | None = None) -> AuthorizationDecision:
    correlation_id = correlation_id or str(uuid.uuid4())
    reasons: list[str] = []
    permission_key = f"{req.resource}:{req.scope}"

    role_perms = store.role_permissions(req.agent_id)
    has_role_perm = permission_key in role_perms or f"{req.resource}" in role_perms
    has_scoped_grant = store.has_scoped_grant(req.agent_id, req.resource, req.scope)

    allowed = has_role_perm or has_scoped_grant
    if has_role_perm:
        reasons.append(f"role permission covers '{permission_key}'")
    if has_scoped_grant:
        reasons.append(f"explicit scoped grant covers resource='{req.resource}' scope='{req.scope}'")
    if not allowed:
        reasons.append(f"no role permission or scoped grant covers '{permission_key}'")

    # ABAC veto: sensitive resource categories require an EXPLICIT grant,
    # a role alone isn't sufficient, regardless of what role granted.
    is_sensitive = any(req.resource.startswith(p) for p in SENSITIVE_RESOURCE_PREFIXES)
    if is_sensitive and not has_scoped_grant:
        allowed = False
        reasons.append(f"resource '{req.resource}' is sensitive: requires an explicit scoped grant, role alone is insufficient")

    # ABAC: explicit deny attribute always wins (continuous re-evaluation
    # hook — e.g. a live risk signal from risk-assessment-service).
    if req.attributes.get("force_deny"):
        allowed = False
        reasons.append("explicit deny attribute set (continuous re-evaluation veto)")

    return AuthorizationDecision(
        correlation_id=correlation_id, agent_id=req.agent_id, resource=req.resource,
        scope=req.scope, allowed=allowed, reasons=reasons,
        evidence={"role_permissions": sorted(role_perms), "has_scoped_grant": has_scoped_grant,
                  "attributes_considered": req.attributes},
        decided_at=datetime.now(timezone.utc),
    )
