"""
Core guardrail-engine decision pipeline.

Input path  : validate schema -> detect malformed -> inspect prompt ->
              detect injection -> classify untrusted content ->
              invoke policy evaluation -> classify risk -> decide
Output path : validate output -> detect sensitive action ->
              classify risk -> decide

Both paths converge on the same GuardrailDecision shape so every
caller (gateway, services) gets one consistent, machine-readable
contract.
"""

from __future__ import annotations

import uuid

from .patterns import (
    find_injection_matches,
    find_untrusted_address_matches,
    has_control_characters,
)
from .policy import AllowAllPolicyEvaluator, PolicyEvaluator
from .schemas import (
    ContentType,
    Decision,
    Detection,
    DetectionType,
    GuardrailDecision,
    InputEvaluationRequest,
    OutputEvaluationRequest,
    RiskLevel,
)

# Action types that are always treated as sensitive regardless of
# other signals — deliberately conservative defaults. Real tiering
# should come from tool-permission-service's trust tiers once that
# service exists; this local list is a placeholder seam.
SENSITIVE_ACTION_TYPES: frozenset[str] = frozenset(
    {
        "delete",
        "payment",
        "fund_transfer",
        "credential_change",
        "permission_grant",
        "data_export",
        "irreversible_write",
    }
)

_RISK_ORDER = {
    RiskLevel.LOW: 0,
    RiskLevel.MEDIUM: 1,
    RiskLevel.HIGH: 2,
    RiskLevel.CRITICAL: 3,
}


def _max_risk(*levels: RiskLevel) -> RiskLevel:
    return max(levels, key=lambda lvl: _RISK_ORDER[lvl])


def evaluate_input(
    request: InputEvaluationRequest,
    *,
    policy_evaluator: PolicyEvaluator | None = None,
    correlation_id: str | None = None,
) -> GuardrailDecision:
    policy_evaluator = policy_evaluator or AllowAllPolicyEvaluator()
    correlation_id = correlation_id or str(uuid.uuid4())

    detections: list[Detection] = []
    reasons: list[str] = []
    risk = RiskLevel.LOW

    # 1. Detect malformed input (schema validation already happened via
    #    pydantic before this function is ever called; here we catch the
    #    things a schema can't express, e.g. control characters).
    if has_control_characters(request.content):
        detections.append(
            Detection(
                type=DetectionType.MALFORMED_INPUT,
                confidence=1.0,
                detail="content contains non-printable control characters",
            )
        )
        reasons.append("malformed input: control characters present")
        risk = _max_risk(risk, RiskLevel.MEDIUM)

    # 2. Inspect prompt / 3. Detect injection.
    injection_matches = find_injection_matches(request.content)
    for pattern, snippet in injection_matches:
        detections.append(
            Detection(
                type=DetectionType.PROMPT_INJECTION,
                confidence=0.85,
                detail=f"matched injection pattern: {pattern}",
                matched_snippet=snippet,
            )
        )
    if injection_matches:
        reasons.append(f"{len(injection_matches)} prompt-injection signature(s) matched")
        risk = _max_risk(risk, RiskLevel.HIGH)

    # 4. Classify untrusted content — only meaningful for content that
    #    isn't the direct user speaking to the agent.
    if request.content_type in (ContentType.RETRIEVED_CONTENT, ContentType.TOOL_CALL):
        address_matches = find_untrusted_address_matches(request.content)
        for pattern, snippet in address_matches:
            detections.append(
                Detection(
                    type=DetectionType.UNTRUSTED_CONTENT,
                    confidence=0.7,
                    detail=(
                        f"retrieved/tool content directly addresses the agent "
                        f"(pattern: {pattern}) — possible indirect injection"
                    ),
                    matched_snippet=snippet,
                )
            )
        if address_matches:
            reasons.append("untrusted content attempts to address the agent directly")
            risk = _max_risk(risk, RiskLevel.HIGH)

    # 5. Invoke policy evaluation.
    policy_result = policy_evaluator.evaluate(
        agent_id=request.agent_id,
        content_type=request.content_type.value,
        content=request.content,
    )
    if not policy_result.allowed:
        detections.append(
            Detection(
                type=DetectionType.POLICY_VIOLATION,
                confidence=1.0,
                detail=policy_result.reason,
            )
        )
        reasons.append(f"policy violation: {policy_result.reason}")
        risk = _max_risk(risk, RiskLevel.CRITICAL)

    # 6. Classify risk was accumulated inline above; 7-9. Decide.
    decision = _decide(risk, detections)
    if not reasons:
        reasons.append("no violations detected")

    return GuardrailDecision(
        correlation_id=correlation_id,
        agent_id=request.agent_id,
        session_id=request.session_id,
        decision=decision,
        risk=risk,
        reasons=reasons,
        detections=detections,
    )


def evaluate_output(
    request: OutputEvaluationRequest,
    *,
    correlation_id: str | None = None,
) -> GuardrailDecision:
    correlation_id = correlation_id or str(uuid.uuid4())

    detections: list[Detection] = []
    reasons: list[str] = []
    risk = RiskLevel.LOW

    # Validate model output.
    if has_control_characters(request.output):
        detections.append(
            Detection(
                type=DetectionType.OUTPUT_VALIDATION_FAILURE,
                confidence=1.0,
                detail="model output contains non-printable control characters",
            )
        )
        reasons.append("output validation failure: control characters present")
        risk = _max_risk(risk, RiskLevel.MEDIUM)

    # Detect sensitive actions.
    action = request.proposed_action or {}
    action_type = str(action.get("type", "")).lower()
    if action_type in SENSITIVE_ACTION_TYPES:
        detections.append(
            Detection(
                type=DetectionType.SENSITIVE_ACTION,
                confidence=1.0,
                detail=f"proposed action '{action_type}' is in the sensitive-action set",
            )
        )
        reasons.append(f"sensitive action proposed: {action_type}")
        risk = _max_risk(risk, RiskLevel.HIGH)

    decision = _decide(risk, detections)
    if not reasons:
        reasons.append("no violations detected")

    return GuardrailDecision(
        correlation_id=correlation_id,
        agent_id=request.agent_id,
        session_id=request.session_id,
        decision=decision,
        risk=risk,
        reasons=reasons,
        detections=detections,
    )


def _decide(risk: RiskLevel, detections: list[Detection]) -> Decision:
    """
    Block prohibited actions / route high-risk actions to approval /
    return machine-readable decisions.

    CRITICAL -> block outright (e.g. explicit policy violation).
    HIGH     -> require human approval, not an automatic block, so a
                legitimate high-risk action isn't silently dropped —
                this matches the non-negotiable "no autonomous
                self-approval for high-impact actions" without also
                becoming "no high-impact actions are ever possible".
    MEDIUM/LOW -> allow.
    """
    if risk == RiskLevel.CRITICAL:
        return Decision.BLOCK
    if risk == RiskLevel.HIGH:
        return Decision.REQUIRE_APPROVAL
    return Decision.ALLOW
