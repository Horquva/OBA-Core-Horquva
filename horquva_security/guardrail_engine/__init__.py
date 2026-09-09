"""
guardrail-engine
================

W3 service #1 (Services / Guardrails spec from the master task doc).

Responsibilities (per doc):
    - Validate input schemas
    - Detect malformed input
    - Inspect prompts
    - Detect injection
    - Classify untrusted content
    - Invoke policy evaluation
    - Validate model output
    - Detect sensitive actions
    - Classify risk
    - Block prohibited actions
    - Route high-risk actions to approval
    - Return machine-readable decisions

This service does NOT decide identity/authorization (that's
agent-identity-service / agent-authorization-service) and does NOT
execute models. It is a pure decision engine: content in, a
machine-readable GuardrailDecision out.
"""

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
from .engine import evaluate_input, evaluate_output
from .policy import AllowAllPolicyEvaluator, PolicyEvaluator

__all__ = [
    "ContentType",
    "Decision",
    "Detection",
    "DetectionType",
    "GuardrailDecision",
    "InputEvaluationRequest",
    "OutputEvaluationRequest",
    "RiskLevel",
    "evaluate_input",
    "evaluate_output",
    "AllowAllPolicyEvaluator",
    "PolicyEvaluator",
]
