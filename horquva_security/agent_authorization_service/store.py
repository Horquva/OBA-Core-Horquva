"""
In-memory RBAC roles + ABAC-evaluable scoped/temporary permission
grants. Swap for a persistent store before production use.
"""
from __future__ import annotations
from datetime import datetime, timedelta, timezone
from typing import Optional

from ai_security_common import PermissionGrant

# A small built-in role catalog. Real deployments would manage this
# via an admin API / config, not hardcode it — kept simple here since
# Role/Policy management isn't in scope for W3.
_ROLE_PERMISSIONS: dict[str, list[str]] = {
    "reader": ["data:read"],
    "operator": ["data:read", "tool:execute"],
    "admin": ["data:read", "data:write", "data:export", "tool:execute", "permission:grant"],
}

# ABAC: sensitive resources require an elevated attribute regardless of role.
SENSITIVE_RESOURCE_PREFIXES = ("data:export", "permission:grant", "credential:")


class AuthorizationStore:
    def __init__(self) -> None:
        self._agent_roles: dict[str, set[str]] = {}
        self._grants: list[PermissionGrant] = []

    def grant_role(self, agent_id: str, role: str) -> None:
        if role not in _ROLE_PERMISSIONS:
            raise ValueError(f"unknown role '{role}'")
        self._agent_roles.setdefault(agent_id, set()).add(role)

    def role_permissions(self, agent_id: str) -> set[str]:
        perms: set[str] = set()
        for role in self._agent_roles.get(agent_id, set()):
            perms.update(_ROLE_PERMISSIONS[role])
        return perms

    def grant_scoped_permission(self, *, agent_id: str, resource: str, scope: str,
                                 temporary: bool = False, ttl_seconds: Optional[int] = None) -> PermissionGrant:
        expires_at = None
        if temporary:
            ttl = ttl_seconds or 3600
            expires_at = datetime.now(timezone.utc) + timedelta(seconds=ttl)
        grant = PermissionGrant(agent_id=agent_id, resource=resource, scope=scope,
                                 temporary=temporary, expires_at=expires_at)
        self._grants.append(grant)
        return grant

    def active_grants(self, agent_id: str) -> list[PermissionGrant]:
        now = datetime.now(timezone.utc)
        return [g for g in self._grants if g.agent_id == agent_id and not g.is_expired(at=now)]

    def has_scoped_grant(self, agent_id: str, resource: str, scope: str) -> bool:
        return any(g.resource == resource and g.scope == scope for g in self.active_grants(agent_id))
