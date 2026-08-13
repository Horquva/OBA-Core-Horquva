from __future__ import annotations

from datetime import datetime
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
)

from ecosystem.applications.arcturus.schemas.execution.workflows.base_schemas import (
    PolicyEnforcementLevel,
    PolicyViolationAction,
)


class WorkflowService:
    def __init__(self, context: SimulationContext) -> None:
        self.context = context

    def compile_workflow(
        self,
        workflow_id: str,
        name: str,
        activities: list[ActivityStateContract],
        organizational_context_ref: str,
        agent_assignment_ref: str,
        description: str = "",
        created_by: str = "javeria.rafhan",
    ) -> WorkflowDefinitionContract:
        try:
            return WorkflowDefinitionContract(
                context=self.context,
                workflow_id=workflow_id,
                name=name,
                description=description,
                activities=activities,
                organizational_context_ref=organizational_context_ref,
                agent_assignment_ref=agent_assignment_ref,
                created_by=created_by,
            )
        except ValidationError as exc:
            raise ArcturusValidationError(
                message=f"workflow compilation failed: {exc}",
                platform_source="workflow",
            ) from exc

    def evaluate_sla(
        self,
        workflow: WorkflowDefinitionContract,
        sla_seconds: dict[str, float] | None = None,
    ) -> dict[str, Any]:
        limits = sla_seconds or {}

        breaches: list[str] = []
        elapsed_seconds: dict[str, float] = {}

        for activity in workflow.activities:
            if activity.started_at is None or activity.completed_at is None:
                continue

            elapsed = (
                activity.completed_at - activity.started_at
            ).total_seconds()

            elapsed_seconds[activity.activity_id] = elapsed

            limit = limits.get(activity.activity_id)

            if limit is not None and elapsed > limit:
                breaches.append(activity.activity_id)

        return {
            "compliant": not breaches,
            "breaches": breaches,
            "elapsed_seconds": elapsed_seconds,
        }

    def build_execution_trace(
        self,
        workflow: WorkflowDefinitionContract,
    ) -> dict[str, Any]:
        activities: list[dict[str, Any]] = []

        for activity in workflow.activities:
            activities.append(
                {
                    "activity_id": activity.activity_id,
                    "name": activity.name,
                    "status": activity.status.value,
                    "assigned_agent_id": activity.assigned_agent_id,
                    "started_at": activity.started_at,
                    "completed_at": activity.completed_at,
                }
            )

        return {
            "workflow_id": workflow.workflow_id,
            "workflow_name": workflow.name,
            "organizational_context_ref": workflow.organizational_context_ref,
            "agent_assignment_ref": workflow.agent_assignment_ref,
            "activities": activities,
        }

    def enforce_policy(
        self,
        policy: PolicyGovernanceContract,
        sla_result: dict[str, Any],
    ) -> None:
        if sla_result.get("compliant", True):
            return

        breaches = sla_result.get("breaches", [])

        if policy.violation_action == PolicyViolationAction.LOG_ONLY:
            return

        if policy.violation_action == PolicyViolationAction.ESCALATE:
            raise ArcturusValidationError(
                message=(
                    f"policy {policy.policy_id} escalated for workflow "
                    f"{policy.applies_to_workflow_id}; breaches={breaches}"
                ),
                platform_source="workflow",
            )

        if (
            policy.enforcement_level == PolicyEnforcementLevel.BLOCKING
            and policy.violation_action == PolicyViolationAction.HALT_WORKFLOW
        ):
            raise ArcturusValidationError(
                message=(
                    f"workflow {policy.applies_to_workflow_id} halted by "
                    f"blocking policy {policy.policy_id}; breaches={breaches}"
                ),
                platform_source="workflow",
            )