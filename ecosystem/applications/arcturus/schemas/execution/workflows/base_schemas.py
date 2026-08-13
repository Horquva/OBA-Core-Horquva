from __future__ import annotations
from enum import Enum

# ---------------------------------------------------------------------------
# ID PATTERNS
# ---------------------------------------------------------------------------

WORKFLOW_ID_PATTERN = r'^WF-[A-Z]{3}-\d{3}$'   # e.g. WF-BHV-001
ACTIVITY_ID_PATTERN = r'^ACT-\d{4}$'           # e.g. ACT-0001
POLICY_ID_PATTERN = r'^POL-[A-Z]{3}-\d{3}$'    # e.g. POL-BHV-001


# ---------------------------------------------------------------------------
# ACTIVITY STATUS
# ---------------------------------------------------------------------------

class ActivityStatus(str, Enum):
    PENDING = 'pending'
    IN_PROGRESS = 'in_progress'
    COMPLETED = 'completed'
    FAILED = 'failed'
    CANCELLED = 'cancelled'
    ESCALATED = 'escalated'


# Statuses that require a started_at timestamp (used by
# ActivityStateContract.completed_requires_started validator).
TERMINAL_ACTIVITY_STATUSES = {
    ActivityStatus.COMPLETED,
    ActivityStatus.FAILED,
    ActivityStatus.CANCELLED,
}


# ---------------------------------------------------------------------------
# POLICY GOVERNANCE
# ---------------------------------------------------------------------------

class PolicyEnforcementLevel(str, Enum):
    ADVISORY = 'advisory'
    MANDATORY = 'mandatory'
    BLOCKING = 'blocking'


class PolicyViolationAction(str, Enum):
    LOG_ONLY = 'log_only'
    ESCALATE = 'escalate'
    HALT_WORKFLOW = 'halt_workflow'