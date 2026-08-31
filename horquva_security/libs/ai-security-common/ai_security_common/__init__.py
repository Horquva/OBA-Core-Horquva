"""
ai_security_common — Shared Security Contracts (/libs/ai-security-common/)

Canonical types used by every AI Security service. One canonical
security primitive per concept — no duplicated models. Services
import from here instead of redefining their own copies.
"""

from .enums import (
    ApprovalState,
    Decision,
    DetectionType,
    KillSwitchState,
    RiskLevel,
    TaskState,
    TrustLevel,
)
from .models import (
    AgentIdentity,
    ApprovalRequest,
    Detection,
    EvaluationResult,
    GuardrailDecision,
    KillSwitchStatus,
    PermissionGrant,
    SecurityDecisionMetadata,
    SecurityEvent,
    ToolDescriptor,
)
from .errors import SecurityError, AuthorizationError, ValidationError, NotFoundError

__all__ = [
    "ApprovalState",
    "Decision",
    "DetectionType",
    "KillSwitchState",
    "RiskLevel",
    "TaskState",
    "TrustLevel",
    "AgentIdentity",
    "ApprovalRequest",
    "Detection",
    "EvaluationResult",
    "GuardrailDecision",
    "KillSwitchStatus",
    "PermissionGrant",
    "SecurityDecisionMetadata",
    "SecurityEvent",
    "ToolDescriptor",
    "SecurityError",
    "AuthorizationError",
    "ValidationError",
    "NotFoundError",
]
