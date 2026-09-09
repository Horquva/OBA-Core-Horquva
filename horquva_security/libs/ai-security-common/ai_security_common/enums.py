"""Canonical enums shared across all AI Security services."""

from enum import Enum


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Decision(str, Enum):
    ALLOW = "allow"
    BLOCK = "block"
    REQUIRE_APPROVAL = "require_approval"


class DetectionType(str, Enum):
    MALFORMED_INPUT = "malformed_input"
    PROMPT_INJECTION = "prompt_injection"
    UNTRUSTED_CONTENT = "untrusted_content"
    POLICY_VIOLATION = "policy_violation"
    SENSITIVE_ACTION = "sensitive_action"
    OUTPUT_VALIDATION_FAILURE = "output_validation_failure"
    UNAUTHORIZED_TOOL_CALL = "unauthorized_tool_call"
    CROSS_TENANT_ACCESS = "cross_tenant_access"
    EXPIRED_PERMISSION = "expired_permission"


class TrustLevel(str, Enum):
    UNTRUSTED = "untrusted"
    LOW = "low"
    STANDARD = "standard"
    ELEVATED = "elevated"
    FULL = "full"


class ApprovalState(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    DENIED = "denied"
    EXPIRED = "expired"


class TaskState(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    KILLED = "killed"


class KillSwitchState(str, Enum):
    ARMED = "armed"
    TRIPPED = "tripped"
