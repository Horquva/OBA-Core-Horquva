from __future__ import annotations

from datetime import datetime, timezone
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
    ActivityStatus,
    PolicyEnforcementLevel,
    PolicyViolationAction,
)
from ecosystem.applications.arcturus.src.execution_plane.workflows.workflow_adapters import (
    validate_activity_transition,
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

    def validate_dependency_graph(
        self,
        workflow: WorkflowDefinitionContract,
    ) -> None:
        """
        Validates the DAG dependency structure of activities in a workflow.
        Checks for:
        1. Non-existent dependency references.
        2. Self-dependencies.
        3. Circular dependencies (cycles).
        """
        activity_ids = {a.activity_id for a in workflow.activities}
        adj: dict[str, list[str]] = {a.activity_id: [] for a in workflow.activities}

        for activity in workflow.activities:
            for dep_id in activity.dependencies:
                if dep_id not in activity_ids:
                    raise ArcturusValidationError(
                        message=(
                            f"activity '{activity.activity_id}' references non-existent "
                            f"dependency '{dep_id}' in workflow '{workflow.workflow_id}'"
                        ),
                        platform_source="workflow",
                    )
                if dep_id == activity.activity_id:
                    raise ArcturusValidationError(
                        message=(
                            f"activity '{activity.activity_id}' has a self-dependency in "
                            f"workflow '{workflow.workflow_id}'"
                        ),
                        platform_source="workflow",
                    )
                adj[dep_id].append(activity.activity_id)

        # Cycle detection using DFS
        visited: dict[str, int] = {a_id: 0 for a_id in activity_ids}  # 0=unvisited, 1=visiting, 2=visited

        def dfs(node: str, path: list[str]) -> None:
            visited[node] = 1
            for neighbor in adj.get(node, []):
                if visited[neighbor] == 1:
                    cycle = " -> ".join(path + [neighbor])
                    raise ArcturusValidationError(
                        message=(
                            f"circular dependency detected in workflow "
                            f"'{workflow.workflow_id}': {cycle}"
                        ),
                        platform_source="workflow",
                    )
                if visited[neighbor] == 0:
                    dfs(neighbor, path + [neighbor])
            visited[node] = 2

        for a_id in activity_ids:
            if visited[a_id] == 0:
                dfs(a_id, [a_id])

    def advance_activity(
        self,
        workflow: WorkflowDefinitionContract,
        activity_id: str,
        target_status: ActivityStatus,
        timestamp: datetime | None = None,
    ) -> ActivityStateContract:
        """
        Advances an activity's status adhering to state machine rules
        and DAG dependency preconditions.
        """
        activity_map = {a.activity_id: a for a in workflow.activities}
        if activity_id not in activity_map:
            raise ArcturusValidationError(
                message=(
                    f"activity '{activity_id}' not found in workflow "
                    f"'{workflow.workflow_id}'"
                ),
                platform_source="workflow",
            )

        activity = activity_map[activity_id]
        now = timestamp or datetime.now(timezone.utc)

        # Validate state machine transition
        validate_activity_transition(activity.status, target_status)

        # If transitioning to IN_PROGRESS or COMPLETED, verify dependencies are COMPLETED
        if target_status in (ActivityStatus.IN_PROGRESS, ActivityStatus.COMPLETED):
            for dep_id in activity.dependencies:
                dep_act = activity_map.get(dep_id)
                if dep_act is None or dep_act.status != ActivityStatus.COMPLETED:
                    raise ArcturusValidationError(
                        message=(
                            f"cannot advance activity '{activity_id}' to '{target_status.value}': "
                            f"dependency '{dep_id}' status is '{dep_act.status.value if dep_act else 'unknown'}'"
                        ),
                        platform_source="workflow",
                    )

        # Apply state changes and timestamp tracking
        updates: dict[str, Any] = {"status": target_status}
        if target_status == ActivityStatus.IN_PROGRESS and activity.started_at is None:
            updates["started_at"] = now
        elif target_status in (ActivityStatus.COMPLETED, ActivityStatus.FAILED, ActivityStatus.CANCELLED):
            if activity.started_at is None:
                updates["started_at"] = now
            updates["completed_at"] = now

        updated_activity = activity.model_copy(update=updates)

        # Update in workflow activities list
        idx = next(i for i, a in enumerate(workflow.activities) if a.activity_id == activity_id)
        workflow.activities[idx] = updated_activity

        return updated_activity

    def get_unblocked_activities(
        self,
        workflow: WorkflowDefinitionContract,
    ) -> list[ActivityStateContract]:
        """
        Returns all activities currently in PENDING state whose dependencies
        have all reached COMPLETED status.
        """
        activity_map = {a.activity_id: a for a in workflow.activities}
        unblocked: list[ActivityStateContract] = []

        for activity in workflow.activities:
            if activity.status != ActivityStatus.PENDING:
                continue

            all_deps_completed = all(
                activity_map.get(dep_id) is not None
                and activity_map[dep_id].status == ActivityStatus.COMPLETED
                for dep_id in activity.dependencies
            )

            if all_deps_completed:
                unblocked.append(activity)

        return unblocked

    def create_workflow_event(
        self,
        workflow_id: str,
        activity_id: str,
        old_status: ActivityStatus,
        new_status: ActivityStatus,
        tick: int = 0,
        details: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """
        Constructs a normalized event dictionary for Runtime and Synthetic Data streaming.
        """
        return {
            "event_type": "WORKFLOW_ACTIVITY_STATUS_CHANGED",
            "workflow_id": workflow_id,
            "activity_id": activity_id,
            "old_status": old_status.value,
            "new_status": new_status.value,
            "tick": tick,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "details": details or {},
        }