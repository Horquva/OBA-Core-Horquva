"""Canonical pydantic models shared across all AI Security services."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from pydantic import BaseModel, Field

from .enums import (
    ApprovalState,
    Decision,
    DetectionType,
    KillSwitchState,
    RiskLevel,
    TrustLevel,
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _new_id() -> str:
    return str(uuid.uuid4())


class SecurityDecisionMetadata(BaseModel):
    """Attached to every decision-bearing response for evidence/audit."""

    decision_id: str = Field(default_factory=_new_id)
    correlation_id: str
    made_by_service: str
    made_at: datetime = Field(default_factory=_now)


class Detection(BaseModel):
    type: DetectionType
    confidence: float = Field(ge=0.0, le=1.0)
    detail: str
    matched_snippet: Optional[str] = None


class GuardrailDecision(BaseModel):
    decision_id: str = Field(default_factory=_new_id)
    correlation_id: str
    agent_id: str
    session_id: str
    decision: Decision
    risk: RiskLevel
    reasons: list[str]
    detections: list[Detection]
    evaluated_at: datetime = Field(default_factory=_now)


class AgentIdentity(BaseModel):
    agent_id: str
    display_name: str
    owner: str
    trust_level: TrustLevel = TrustLevel.STANDARD
    registered_at: datetime = Field(default_factory=_now)
    last_verified_at: Optional[datetime] = None
    active: bool = True


class ToolDescriptor(BaseModel):
    tool_id: str
    name: str
    trust_tier: TrustLevel = TrustLevel.STANDARD
    allowed_capabilities: list[str] = Field(default_factory=list)


class PermissionGrant(BaseModel):
    grant_id: str = Field(default_factory=_new_id)
    agent_id: str
    resource: str  # e.g. tool_id, data scope, action type
    scope: str  # e.g. "read", "write", "execute"
    granted_at: datetime = Field(default_factory=_now)
    expires_at: Optional[datetime] = None
    temporary: bool = False

    def is_expired(self, *, at: Optional[datetime] = None) -> bool:
        if self.expires_at is None:
            return False
        return (at or _now()) >= self.expires_at


class EvaluationResult(BaseModel):
    evaluation_id: str = Field(default_factory=_new_id)
    subject_id: str  # model id, agent id, etc.
    passed: bool
    score: float = Field(ge=0.0, le=1.0)
    findings: list[str] = Field(default_factory=list)
    evaluated_at: datetime = Field(default_factory=_now)


class ApprovalRequest(BaseModel):
    approval_id: str = Field(default_factory=_new_id)
    agent_id: str
    action: dict[str, Any]
    risk: RiskLevel
    state: ApprovalState = ApprovalState.PENDING
    requested_at: datetime = Field(default_factory=_now)
    decided_at: Optional[datetime] = None
    decided_by: Optional[str] = None
    reason: Optional[str] = None


class SecurityEvent(BaseModel):
    event_id: str = Field(default_factory=_new_id)
    event_type: str
    source_service: str
    agent_id: Optional[str] = None
    correlation_id: Optional[str] = None
    severity: RiskLevel = RiskLevel.LOW
    detail: str
    occurred_at: datetime = Field(default_factory=_now)
    metadata: dict[str, Any] = Field(default_factory=dict)


class KillSwitchStatus(BaseModel):
    scope: str  # "global" | agent_id | task_id
    state: KillSwitchState
    tripped_at: Optional[datetime] = None
    tripped_by: Optional[str] = None
    reason: Optional[str] = None
