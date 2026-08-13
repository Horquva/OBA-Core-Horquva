from __future__ import annotations

from typing import List

from pydantic import BaseModel, Field

from ecosystem.applications.arcturus.contracts.shared.base_models import (
    ContractEnvelope,
)

from ecosystem.applications.arcturus.contracts.ontology.ontology_snapshot_contract import (
    RoleState,
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
        ...,
        description="Role assigned to the agent",
    )

    status: str = Field(
        default="active",
        description="Current agent status",
    )


class WorkforceRoleContract(BaseModel):
    """
    Represents a role available for workforce assignment.
    Uses the canonical ontology RoleState rather than redefining role structure.
    """

    role: RoleState

    assigned_agent_ids: List[int] = Field(
        default_factory=list,
        description="Agents currently assigned to this role",
    )
class AgentAssignment(BaseModel):
    """
    Represents one synthetic agent assigned to a role.
    """

    agent_id: int = Field(
        ...,
        description="Unique identifier of the assigned agent",
    )

    role_id: int = Field(
        ...,
        description="Role assigned to the agent",
    )


class AgentAssignmentPayload(ContractEnvelope):
    """
    Represents the workforce agent-to-role assignments
    passed from the Workforce platform to the Workflow platform.
    """

    assignment_id: str = Field(
        ...,
        description="Unique identifier for this assignment payload",
    )

    enterprise_instance_id: str = Field(
        ...,
        description="References the EnterpriseInstancePayload.instance_id",
    )

    assignments: List[AgentAssignment] = Field(
        default_factory=list,
        description="Agent-to-role assignments for the enterprise",
    )

class WorkforceAgentRoster(ContractEnvelope):
    """
    Workforce roster generated from an EnterpriseInstancePayload.
    """

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