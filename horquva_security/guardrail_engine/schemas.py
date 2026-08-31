"""
Schemas for guardrail-engine.

NOTE: These are LOCAL to this service for now. Once
Shared Security Contracts (/libs/ai-security-common/) is implemented,
GuardrailDecision, RiskLevel, and Detection should move there and be
imported instead of redefined, per "One canonical security primitive
--- no duplicated models." Marked with TODO(shared-contracts) below.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator


# TODO(shared-contracts): move to /libs/ai-security-common/
class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# TODO(shared-contracts): move to /libs/ai-security-common/
class Decision(str, Enum):
    ALLOW = "allow"
    BLOCK = "block"
    REQUIRE_APPROVAL = "require_approval"


class ContentType(str, Enum):
    USER_INPUT = "user_input"
    PROMPT = "prompt"
    RETRIEVED_CONTENT = "retrieved_content"
    TOOL_CALL = "tool_call"
    MODEL_OUTPUT = "model_output"


class DetectionType(str, Enum):
    MALFORMED_INPUT = "malformed_input"
    PROMPT_INJECTION = "prompt_injection"
    UNTRUSTED_CONTENT = "untrusted_content"
    POLICY_VIOLATION = "policy_violation"
    SENSITIVE_ACTION = "sensitive_action"
    OUTPUT_VALIDATION_FAILURE = "output_validation_failure"


class Detection(BaseModel):
    """One finding surfaced during evaluation. Always machine-readable."""

    type: DetectionType
    confidence: float = Field(ge=0.0, le=1.0)
    detail: str
    matched_snippet: Optional[str] = None


class InputEvaluationRequest(BaseModel):
    agent_id: str = Field(min_length=1)
    session_id: str = Field(min_length=1)
    content_type: ContentType
    content: str = Field(min_length=1, max_length=200_000)
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("content")
    @classmethod
    def _reject_null_bytes(cls, v: str) -> str:
        if "\x00" in v:
            raise ValueError("content contains null byte(s)")
        return v


class OutputEvaluationRequest(BaseModel):
    agent_id: str = Field(min_length=1)
    session_id: str = Field(min_length=1)
    output: str = Field(min_length=0, max_length=500_000)
    proposed_action: Optional[dict[str, Any]] = None
    metadata: dict[str, Any] = Field(default_factory=dict)


# TODO(shared-contracts): move to /libs/ai-security-common/
class GuardrailDecision(BaseModel):
    """The single machine-readable output of every evaluation call."""

    decision_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    correlation_id: str
    agent_id: str
    session_id: str
    decision: Decision
    risk: RiskLevel
    reasons: list[str]
    detections: list[Detection]
    evaluated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
