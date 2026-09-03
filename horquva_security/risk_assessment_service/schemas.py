from __future__ import annotations
from typing import Any, Optional
from pydantic import BaseModel, Field
from ai_security_common import RiskLevel, TrustLevel


class RiskSignals(BaseModel):
    agent_trust_level: TrustLevel = TrustLevel.STANDARD
    guardrail_risk: Optional[RiskLevel] = None
    is_sensitive_action: bool = False
    recent_evaluation_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    is_cross_tenant: bool = False


class AssessRiskRequest(BaseModel):
    agent_id: str
    action_type: str
    signals: RiskSignals
    context: dict[str, Any] = Field(default_factory=dict)


class RiskAssessment(BaseModel):
    correlation_id: str
    agent_id: str
    action_type: str
    risk: RiskLevel
    score: float
    rationale: list[str]
