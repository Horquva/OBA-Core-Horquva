from __future__ import annotations
from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field


class Role(BaseModel):
    name: str
    permissions: list[str] = Field(default_factory=list)  # e.g. "tool:read", "data:export"


class GrantRoleRequest(BaseModel):
    agent_id: str
    role: str


class GrantScopedPermissionRequest(BaseModel):
    agent_id: str
    resource: str
    scope: str
    temporary: bool = False
    ttl_seconds: Optional[int] = None


class AuthorizationCheckRequest(BaseModel):
    agent_id: str
    resource: str
    scope: str
    attributes: dict[str, Any] = Field(default_factory=dict)  # ABAC: data_sensitivity, task_type, time_of_day, etc.


class AuthorizationDecision(BaseModel):
    correlation_id: str
    agent_id: str
    resource: str
    scope: str
    allowed: bool
    reasons: list[str]
    evidence: dict[str, Any] = Field(default_factory=dict)
    decided_at: datetime
