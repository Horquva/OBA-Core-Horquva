from __future__ import annotations
from typing import Any
from pydantic import BaseModel, Field
from ai_security_common import ApprovalState, RiskLevel


class CreateApprovalRequest(BaseModel):
    agent_id: str = Field(min_length=1)
    action: dict[str, Any]
    risk: RiskLevel


class DecideApprovalRequest(BaseModel):
    decided_by: str = Field(min_length=1)
    approve: bool
    reason: str = ""


class ApprovalResponse(BaseModel):
    approval_id: str
    agent_id: str
    action: dict[str, Any]
    risk: RiskLevel
    state: ApprovalState
    decided_by: str | None = None
    reason: str | None = None
