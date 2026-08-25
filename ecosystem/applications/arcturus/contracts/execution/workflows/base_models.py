from __future__ import annotations

import re
from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from pydantic import Field, field_validator, model_validator

from ecosystem.applications.arcturus.contracts.shared.base_models import (
    ContractEnvelope,
)

from ecosystem.applications.arcturus.schemas.execution.workflows.base_schemas import (
    ACTIVITY_ID_PATTERN,
    POLICY_ID_PATTERN,
    TERMINAL_ACTIVITY_STATUSES,
    WORKFLOW_ID_PATTERN,
    ActivityStatus,
    PolicyEnforcementLevel,
    PolicyViolationAction,
)


class ActivityStateContract(ContractEnvelope):
    activity_id: str = Field(
        ...,
        pattern=ACTIVITY_ID_PATTERN,
    )

    name: str = Field(
        ...,
        min_length=1,
    )

    status: ActivityStatus = Field(
        default=ActivityStatus.PENDING,
    )

    assigned_agent_id: str | None = Field(
        default=None,
        description="References an agent from Syeda's AgentAssignmentPayload.",
    )

    dependencies: list[str] = Field(
        default_factory=list,
        description="List of activity_id values that must be COMPLETED before this activity can execute.",
    )

    started_at: datetime | None = None

    completed_at: datetime | None = None

    metadata: dict[str, Any] = Field(
        default_factory=dict,
    )

    @model_validator(mode="after")
    def completed_requires_started(self) -> "ActivityStateContract":
        if (
            self.status in TERMINAL_ACTIVITY_STATUSES
            and self.started_at is None
        ):
            raise ValueError(
                f"activity {self.activity_id} cannot be "
                f"'{self.status.value}' without a started_at timestamp"
            )

        if (
            self.completed_at is not None
            and self.started_at is not None
            and self.completed_at < self.started_at
        ):
            raise ValueError(
                f"activity {self.activity_id}: "
                "completed_at cannot precede started_at"
            )

        return self


class WorkflowDefinitionContract(ContractEnvelope):
    workflow_id: str = Field(
        ...,
        pattern=WORKFLOW_ID_PATTERN,
    )

    name: str = Field(
        ...,
        min_length=1,
    )

    description: str = Field(
        default="",
    )

    activities: list[ActivityStateContract] = Field(
        default_factory=list,
    )

    organizational_context_ref: str = Field(
        ...,
        description="ID of the EnterpriseInstancePayload from Ajwa.",
    )

    agent_assignment_ref: str = Field(
        ...,
        description="ID of the AgentAssignmentPayload from Syeda.",
    )

    created_by: str = Field(
        default="javeria.rafhan",
    )

    @field_validator("activities")
    @classmethod
    def must_have_at_least_one_activity(
        cls,
        value: list[ActivityStateContract],
    ) -> list[ActivityStateContract]:
        if not value:
            raise ValueError(
                "a workflow must contain at least one activity"
            )

        return value

    @model_validator(mode="after")
    def activity_ids_must_be_unique(
        self,
    ) -> "WorkflowDefinitionContract":
        ids = [activity.activity_id for activity in self.activities]

        if len(ids) != len(set(ids)):
            raise ValueError(
                f"duplicate activity_id values in workflow "
                f"{self.workflow_id}"
            )

        return self


class PolicyGovernanceContract(ContractEnvelope):
    policy_id: str = Field(
        ...,
        pattern=POLICY_ID_PATTERN,
    )

    applies_to_workflow_id: str = Field(
        ...,
        pattern=WORKFLOW_ID_PATTERN,
    )

    enforcement_level: PolicyEnforcementLevel

    rule_description: str = Field(
        ...,
        min_length=1,
    )

    violation_action: PolicyViolationAction = Field(
        default=PolicyViolationAction.LOG_ONLY,
    )

    @model_validator(mode="after")
    def blocking_policies_must_halt(
        self,
    ) -> "PolicyGovernanceContract":
        if (
            self.enforcement_level == PolicyEnforcementLevel.BLOCKING
            and self.violation_action == PolicyViolationAction.LOG_ONLY
        ):
            raise ValueError(
                f"policy {self.policy_id} is BLOCKING but "
                "violation_action is LOG_ONLY — a blocking policy "
                "must halt or escalate"
            )

        return self


class WorkflowExecutionEvidence(ContractEnvelope):
    """
    Outbound payload: Javeria's Workflow platform -> Amina's Validation platform.
    Summarizes a completed/in-progress workflow run for evaluation and evidence review.
    """

    evidence_id: str = Field(
        ...,
        min_length=1,
        description="Unique identifier for this evidence record",
    )

    workflow_id: str = Field(
        ...,
        pattern=WORKFLOW_ID_PATTERN,
    )

    total_activities: int = Field(
        ...,
        ge=0,
    )

    completed_activities: int = Field(
        ...,
        ge=0,
    )

    failed_activities: int = Field(
        ...,
        ge=0,
    )

    escalated_activities: int = Field(
        default=0,
        ge=0,
    )

    sla_compliant: bool = Field(
        ...,
        description="True only if no activity breached its SLA limit",
    )

    @model_validator(mode="after")
    def activity_counts_cannot_exceed_total(
        self,
    ) -> "WorkflowExecutionEvidence":
        counted = (
            self.completed_activities
            + self.failed_activities
            + self.escalated_activities
        )

        if counted > self.total_activities:
            raise ValueError(
                "completed_activities + failed_activities + "
                "escalated_activities cannot exceed total_activities"
            )

        return self