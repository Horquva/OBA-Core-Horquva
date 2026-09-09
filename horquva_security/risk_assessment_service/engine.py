"""
Simple additive scoring model -> mapped to a RiskLevel band. Each
signal contributes points; final score is clamped to [0, 1] and
banded. Deliberately transparent/explainable (every contribution is
in `rationale`) rather than a black-box model, since risk decisions
here gate human approval / kill-switch behavior downstream.
"""
from __future__ import annotations
import uuid

from ai_security_common import RiskLevel, TrustLevel
from .schemas import AssessRiskRequest, RiskAssessment

_TRUST_PENALTY = {
    TrustLevel.UNTRUSTED: 0.4,
    TrustLevel.LOW: 0.25,
    TrustLevel.STANDARD: 0.1,
    TrustLevel.ELEVATED: 0.0,
    TrustLevel.FULL: 0.0,
}

_GUARDRAIL_PENALTY = {
    RiskLevel.LOW: 0.0,
    RiskLevel.MEDIUM: 0.15,
    RiskLevel.HIGH: 0.35,
    RiskLevel.CRITICAL: 0.6,
}


def assess_risk(req: AssessRiskRequest, *, correlation_id: str | None = None) -> RiskAssessment:
    correlation_id = correlation_id or str(uuid.uuid4())
    rationale: list[str] = []
    score = 0.0

    trust_penalty = _TRUST_PENALTY[req.signals.agent_trust_level]
    if trust_penalty:
        score += trust_penalty
        rationale.append(f"agent trust level '{req.signals.agent_trust_level}' adds {trust_penalty}")

    if req.signals.guardrail_risk is not None:
        gp = _GUARDRAIL_PENALTY[req.signals.guardrail_risk]
        if gp:
            score += gp
            rationale.append(f"guardrail risk '{req.signals.guardrail_risk}' adds {gp}")

    if req.signals.is_sensitive_action:
        score += 0.3
        rationale.append("action type is flagged sensitive: adds 0.3")

    if req.signals.recent_evaluation_score is not None and req.signals.recent_evaluation_score < 0.8:
        penalty = round((0.8 - req.signals.recent_evaluation_score), 2)
        score += penalty
        rationale.append(f"recent evaluation score {req.signals.recent_evaluation_score} below 0.8: adds {penalty}")

    if req.signals.is_cross_tenant:
        score += 0.5
        rationale.append("cross-tenant action: adds 0.5")

    score = max(0.0, min(1.0, round(score, 4)))

    if score >= 0.75:
        risk = RiskLevel.CRITICAL
    elif score >= 0.5:
        risk = RiskLevel.HIGH
    elif score >= 0.2:
        risk = RiskLevel.MEDIUM
    else:
        risk = RiskLevel.LOW

    if not rationale:
        rationale.append("no risk-contributing signals present")

    return RiskAssessment(correlation_id=correlation_id, agent_id=req.agent_id,
                           action_type=req.action_type, risk=risk, score=score, rationale=rationale)
