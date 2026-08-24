from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field

from ecosystem.applications.arcturus.contracts.shared.base_models import (
    ContractEnvelope,
)

from ecosystem.applications.arcturus.contracts.ontology.ontology_snapshot_contract import (
    RoleState,
)


class WorkerCapability(BaseModel):
    """Workforce-owned capability assigned to a synthetic worker."""

    capability_id: int = Field(
        ...,
        description="Unique identifier for the worker capability",
    )

    name: str = Field(
        ...,
        description="Capability name",
    )

    readiness_score: float = Field(
        default=1.0,
        ge=0.0,
        description="Worker readiness for this capability",
    )


class AvailabilityWindow(BaseModel):
    """Availability window for a synthetic worker."""

    start_hour: int = Field(
        default=9,
        ge=0,
        le=23,
    )

    end_hour: int = Field(
        default=17,
        ge=0,
        le=23,
    )


class AgentProfileContract(BaseModel):
    """Represents a synthetic workforce agent profile."""

    agent_id: int = Field(
        ...,
        description="Unique identifier for the synthetic agent",
    )

    name: str = Field(
        ...,
        description="Display name of the synthetic agent",
    )

    role_id: int = Field(
        default=0,
        description="Role assigned to the agent",
    )

    status: str = Field(
        default="active",
        description="Current agent status",
    )

    capabilities: List[WorkerCapability] = Field(
        default_factory=list,
        description="Capabilities available to the worker",
    )

    availability: AvailabilityWindow = Field(
        default_factory=AvailabilityWindow,
        description="Worker availability window",
    )

    manager_id: Optional[int] = Field(
        default=None,
        description="Agent ID of the worker's manager",
    )

    workload_capacity: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="Normalized workload capacity",
    )

    experiment_id: str = Field(
        ...,
        min_length=3,
        description="Experiment that owns this worker",
    )


class WorkforceRoleContract(BaseModel):
    """
    Represents a role available for workforce assignment.

    Uses the canonical ontology RoleState rather than redefining
    the ontology role structure.
    """

    role: RoleState

    assigned_agent_ids: List[int] = Field(
        default_factory=list,
        description="Agents currently assigned to this role",
    )

    required_capability_ids: List[int] = Field(
        default_factory=list,
        description="Workforce-side capability requirements for this role",
    )


class AgentAssignment(BaseModel):
    """Represents one synthetic agent assigned to a role."""

    agent_id: int = Field(
        ...,
        description="Unique identifier of the assigned agent",
    )

    role_id: int = Field(
        ...,
        description="Role assigned to the agent",
    )

    status: str = Field(
        default="ASSIGNED",
        description="ASSIGNED or BLOCKED",
    )

    reason: Optional[str] = Field(
        default=None,
        description="Reason when an assignment is blocked",
    )


class AgentAssignmentPayload(ContractEnvelope):
    """
    Represents workforce agent-to-role assignments
    passed from Workforce to Workflow.
    """

    assignment_id: str = Field(
        ...,
        description="Unique identifier for this assignment payload",
    )

    enterprise_instance_id: str = Field(
        ...,
        description="References EnterpriseInstancePayload.instance_id",
    )

    assignments: List[AgentAssignment] = Field(
        default_factory=list,
        description="Agent-to-role assignments for the enterprise",
    )


class WorkforceAgentRoster(ContractEnvelope):
    """Workforce roster generated from an EnterpriseInstancePayload."""

    enterprise_instance_id: str = Field(
        ...,
        description="References the source EnterpriseInstancePayload.instance_id",
    )

    agents: List[AgentProfileContract] = Field(
        default_factory=list,
        description="Synthetic agents materialized for the enterprise",
    )

    roles: List[WorkforceRoleContract] = Field(
        default_factory=list,
        description="Roles with their workforce assignments",
    )