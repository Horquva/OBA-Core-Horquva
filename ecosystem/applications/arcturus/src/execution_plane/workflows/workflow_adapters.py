from __future__ import annotations

from typing import Any

from ecosystem.applications.arcturus.contracts.shared.base_models import (
    ArcturusValidationError,
)
from ecosystem.applications.arcturus.contracts.execution.workflows.base_models import (
    ActivityStateContract,
)
from ecosystem.applications.arcturus.schemas.execution.workflows.base_schemas import (
    ActivityStatus,
)

PLATFORM_SOURCE = "workflow"


# ---------------------------------------------------------------------------
# Activity State Machine Transitions
# ---------------------------------------------------------------------------

VALID_ACTIVITY_TRANSITIONS: dict[ActivityStatus, set[ActivityStatus]] = {
    ActivityStatus.PENDING: {
        ActivityStatus.IN_PROGRESS,
        ActivityStatus.ESCALATED,
        ActivityStatus.CANCELLED,
    },
    ActivityStatus.IN_PROGRESS: {
        ActivityStatus.COMPLETED,
        ActivityStatus.FAILED,
        ActivityStatus.ESCALATED,
        ActivityStatus.CANCELLED,
    },
    ActivityStatus.ESCALATED: {
        ActivityStatus.PENDING,
        ActivityStatus.IN_PROGRESS,
        ActivityStatus.CANCELLED,
        ActivityStatus.FAILED,
    },
    ActivityStatus.COMPLETED: set(),
    ActivityStatus.FAILED: set(),
    ActivityStatus.CANCELLED: set(),
}


def validate_activity_transition(
    current_status: ActivityStatus,
    target_status: ActivityStatus,
) -> None:
    """
    Validates that transitioning from current_status to target_status
    follows the workflow activity state machine.
    Raises ArcturusValidationError on invalid transition.
    """
    if current_status == target_status:
        return

    allowed = VALID_ACTIVITY_TRANSITIONS.get(current_status, set())
    if target_status not in allowed:
        raise ArcturusValidationError(
            message=(
                f"invalid activity state transition from "
                f"'{current_status.value}' to '{target_status.value}'"
            ),
            platform_source=PLATFORM_SOURCE,
        )


# ---------------------------------------------------------------------------
# Ajwa's EnterpriseInstancePayload -> organizational_context_ref
# ---------------------------------------------------------------------------

def adapt_enterprise_context(enterprise_instance: Any) -> str:
    """
    Translates Ajwa's EnterpriseInstancePayload into the
    organizational_context_ref string expected by
    WorkflowDefinitionContract.organizational_context_ref.

    Does NOT import Ajwa's platform internals — only reads the fields
    already defined on her outbound contract (structural typing, no
    cross-platform coupling).

    Raises ArcturusValidationError if the instance has not passed the
    Day 3-5 constraint engine yet (is_structurally_valid is False), since
    a workflow should never bind to an enterprise structure that hasn't
    been validated.
    """
    if not getattr(enterprise_instance, "is_structurally_valid", False):
        errors = getattr(enterprise_instance, "validation_errors", [])
        raise ArcturusValidationError(
            message=(
                f"enterprise instance '{getattr(enterprise_instance, 'instance_id', '?')}' "
                f"is not structurally valid, cannot bind a workflow to it. "
                f"validation_errors={errors}"
            ),
            platform_source=PLATFORM_SOURCE,
        )

    instance_id = getattr(enterprise_instance, "instance_id", None)
    if not instance_id:
        raise ArcturusValidationError(
            message="enterprise instance payload is missing instance_id",
            platform_source=PLATFORM_SOURCE,
        )

    return instance_id


# ---------------------------------------------------------------------------
# Syeda's AgentAssignmentPayload -> agent_assignment_ref
# ---------------------------------------------------------------------------

def adapt_agent_assignment_ref(
    agent_assignment: Any,
    expected_enterprise_instance_id: str | None = None,
) -> str:
    """
    Translates Syeda's AgentAssignmentPayload into the agent_assignment_ref
    string expected by WorkflowDefinitionContract.agent_assignment_ref.

    If expected_enterprise_instance_id is provided (typically the value
    just returned by adapt_enterprise_context), this verifies the
    assignment payload was generated against the SAME enterprise instance
    the workflow is binding to -- prevents silently wiring a workflow to
    agents assigned under a different/stale enterprise instance.
    """
    assignment_id = getattr(agent_assignment, "assignment_id", None)
    if not assignment_id:
        raise ArcturusValidationError(
            message="agent assignment payload is missing assignment_id",
            platform_source=PLATFORM_SOURCE,
        )

    if expected_enterprise_instance_id is not None:
        actual_ref = getattr(agent_assignment, "enterprise_instance_id", None)
        if actual_ref != expected_enterprise_instance_id:
            raise ArcturusValidationError(
                message=(
                    f"agent assignment '{assignment_id}' targets enterprise instance "
                    f"'{actual_ref}', but workflow is binding to "
                    f"'{expected_enterprise_instance_id}' — mismatched instance"
                ),
                platform_source=PLATFORM_SOURCE,
            )

    return assignment_id


# ---------------------------------------------------------------------------
# Resolving agent -> activity assignment (explicit mapping required)
# ---------------------------------------------------------------------------

def resolve_activity_assignments(
    activities: list[ActivityStateContract],
    agent_assignment: Any,
    activity_id_by_role_id: dict[int, str],
) -> list[ActivityStateContract]:
    """
    Maps agents from Syeda's AgentAssignmentPayload onto the matching
    ActivityStateContract.assigned_agent_id field.

    activity_id_by_role_id: caller-supplied mapping of role_id -> activity_id,
    since AgentAssignmentPayload only carries (agent_id, role_id) and has no
    direct notion of "activity" — that binding is workflow-specific and
    must be explicit, not guessed.

    Raises ArcturusValidationError if a role_id in the assignment payload
    has no corresponding entry in activity_id_by_role_id (fails safe
    instead of silently skipping an agent-to-activity binding).

    Returns a NEW list of ActivityStateContract (contracts are treated as
    immutable inputs here); activities without a matching assignment are
    passed through unchanged.
    """
    activity_by_id = {a.activity_id: a for a in activities}
    updated: dict[str, ActivityStateContract] = {a.activity_id: a for a in activities}

    for assignment in getattr(agent_assignment, "assignments", []):
        role_id = assignment.role_id
        agent_id = assignment.agent_id

        activity_id = activity_id_by_role_id.get(role_id)
        if activity_id is None:
            raise ArcturusValidationError(
                message=(
                    f"no activity mapped for role_id={role_id} "
                    f"(agent_id={agent_id}) — supply an entry in "
                    f"activity_id_by_role_id or exclude this role from the "
                    f"assignment payload"
                ),
                platform_source=PLATFORM_SOURCE,
            )

        if activity_id not in activity_by_id:
            raise ArcturusValidationError(
                message=(
                    f"activity_id_by_role_id maps role_id={role_id} to "
                    f"activity_id='{activity_id}', but no such activity exists "
                    f"in this workflow"
                ),
                platform_source=PLATFORM_SOURCE,
            )

        current = updated[activity_id]
        updated[activity_id] = current.model_copy(
            update={"assigned_agent_id": str(agent_id)}
        )

    # Preserve original ordering
    return [updated[a.activity_id] for a in activities]