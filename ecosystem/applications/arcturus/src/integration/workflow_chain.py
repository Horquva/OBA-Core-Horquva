from __future__ import annotations

from typing import Any
from pydantic import ValidationError

from ecosystem.applications.arcturus.contracts.shared.base_models import (
    ArcturusValidationError,
    SimulationContext,
)
from ecosystem.applications.arcturus.contracts.execution.workflows.base_models import (
    ActivityStateContract,
    PolicyGovernanceContract,
    WorkflowDefinitionContract,
    WorkflowExecutionEvidence,
)
from ecosystem.applications.arcturus.schemas.execution.workflows.base_schemas import (
    ActivityStatus,
    PolicyEnforcementLevel,
    PolicyViolationAction,
)

PLATFORM_SOURCE = "workflow"


# ---------------------------------------------------------------------------
# Result container
# ---------------------------------------------------------------------------

class WorkflowChainResult:
    """
    Bundled output of a single Day 5 workflow-chain run.

    - workflow: the compiled WorkflowDefinitionContract
    - execution_trace: diagnostic dict of workflow activity execution
    - sla_result: dict of SLA compliance, breaches, and elapsed seconds
    - evidence: WorkflowExecutionEvidence, the outbound payload consumed by
      validation and governance reporting
    """

    def __init__(
        self,
        workflow: WorkflowDefinitionContract,
        execution_trace: dict[str, Any],
        sla_result: dict[str, Any],
        evidence: WorkflowExecutionEvidence,
    ) -> None:
        self.workflow = workflow
        self.execution_trace = execution_trace
        self.sla_result = sla_result
        self.evidence = evidence


# ---------------------------------------------------------------------------
# Internal Adapters (In-Process Contract Transformers)
# ---------------------------------------------------------------------------

def _adapt_enterprise_context(enterprise_instance: Any) -> str:
    """Translates EnterpriseInstancePayload into organizational_context_ref."""
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

    return str(instance_id)


def _adapt_agent_assignment_ref(
    agent_assignment: Any,
    expected_enterprise_instance_id: str | None = None,
) -> str:
    """Translates AgentAssignmentPayload into agent_assignment_ref."""
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

    return str(assignment_id)


def _resolve_activity_assignments(
    activities: list[ActivityStateContract],
    agent_assignment: Any,
    activity_id_by_role_id: dict[int, str],
) -> list[ActivityStateContract]:
    """Maps agents from AgentAssignmentPayload onto ActivityStateContract.assigned_agent_id."""
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

    return [updated[a.activity_id] for a in activities]


# ---------------------------------------------------------------------------
# Day 5 chain entry point
# ---------------------------------------------------------------------------

def run_workflow_chain(
    context: SimulationContext,
    workflow_id: str,
    workflow_name: str,
    activities: list[ActivityStateContract],
    enterprise_instance: Any,
    agent_assignment: Any,
    activity_id_by_role_id: dict[int, str],
    sla_seconds: dict[str, float] | None = None,
    policy: PolicyGovernanceContract | None = None,
    evidence_id: str = "EVID-001",
    description: str = "",
    created_by: str = "javeria.rafhan",
) -> WorkflowChainResult:
    """
    Day 5 integration chain wrapper for the Behavior & Workflow platform.
    Consumes and produces Pydantic contracts only (Rule §2.1).
    """

    # 1. Adapt enterprise context
    organizational_context_ref = _adapt_enterprise_context(enterprise_instance)

    # 2. Adapt agent assignment, verified against the matching enterprise instance
    agent_assignment_ref = _adapt_agent_assignment_ref(
        agent_assignment,
        expected_enterprise_instance_id=organizational_context_ref,
    )

    # 3. Resolve per-activity agent bindings
    resolved_activities = _resolve_activity_assignments(
        activities=activities,
        agent_assignment=agent_assignment,
        activity_id_by_role_id=activity_id_by_role_id,
    )

    # 4. Compile the workflow contract
    try:
        workflow = WorkflowDefinitionContract(
            context=context,
            workflow_id=workflow_id,
            name=workflow_name,
            description=description,
            activities=resolved_activities,
            organizational_context_ref=organizational_context_ref,
            agent_assignment_ref=agent_assignment_ref,
            created_by=created_by,
        )
    except ValidationError as exc:
        raise ArcturusValidationError(
            message=f"workflow compilation failed: {exc}",
            platform_source=PLATFORM_SOURCE,
        ) from exc

    # 5. Evaluate SLA compliance
    limits = sla_seconds or {}
    breaches: list[str] = []
    elapsed_seconds: dict[str, float] = {}

    for activity in workflow.activities:
        if activity.started_at is None or activity.completed_at is None:
            continue

        elapsed = (activity.completed_at - activity.started_at).total_seconds()
        elapsed_seconds[activity.activity_id] = elapsed
        limit = limits.get(activity.activity_id)

        if limit is not None and elapsed > limit:
            breaches.append(activity.activity_id)

    sla_result = {
        "compliant": not breaches,
        "breaches": breaches,
        "elapsed_seconds": elapsed_seconds,
    }

    # 6. Enforce governance policy, if supplied
    if policy is not None and not sla_result["compliant"]:
        if policy.violation_action == PolicyViolationAction.ESCALATE:
            raise ArcturusValidationError(
                message=(
                    f"policy {policy.policy_id} escalated for workflow "
                    f"{policy.applies_to_workflow_id}; breaches={breaches}"
                ),
                platform_source=PLATFORM_SOURCE,
            )
        elif (
            policy.enforcement_level == PolicyEnforcementLevel.BLOCKING
            and policy.violation_action == PolicyViolationAction.HALT_WORKFLOW
        ):
            raise ArcturusValidationError(
                message=(
                    f"workflow {policy.applies_to_workflow_id} halted by "
                    f"blocking policy {policy.policy_id}; breaches={breaches}"
                ),
                platform_source=PLATFORM_SOURCE,
            )

    # 7. Build execution trace
    activity_traces = []
    for activity in workflow.activities:
        activity_traces.append(
            {
                "activity_id": activity.activity_id,
                "name": activity.name,
                "status": activity.status.value,
                "assigned_agent_id": activity.assigned_agent_id,
                "started_at": activity.started_at,
                "completed_at": activity.completed_at,
            }
        )

    execution_trace = {
        "workflow_id": workflow.workflow_id,
        "workflow_name": workflow.name,
        "organizational_context_ref": workflow.organizational_context_ref,
        "agent_assignment_ref": workflow.agent_assignment_ref,
        "activities": activity_traces,
    }

    # 8. Build outbound evidence bundle
    completed = sum(1 for a in workflow.activities if a.status == ActivityStatus.COMPLETED)
    failed = sum(1 for a in workflow.activities if a.status == ActivityStatus.FAILED)
    escalated = sum(1 for a in workflow.activities if a.status == ActivityStatus.ESCALATED)

    evidence = WorkflowExecutionEvidence(
        context=context,
        evidence_id=evidence_id,
        workflow_id=workflow.workflow_id,
        total_activities=len(workflow.activities),
        completed_activities=completed,
        failed_activities=failed,
        escalated_activities=escalated,
        sla_compliant=sla_result["compliant"],
    )

    return WorkflowChainResult(
        workflow=workflow,
        execution_trace=execution_trace,
        sla_result=sla_result,
        evidence=evidence,
    )
