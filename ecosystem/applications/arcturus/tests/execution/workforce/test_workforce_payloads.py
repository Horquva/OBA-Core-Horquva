from __future__ import annotations

import pytest
from pydantic import ValidationError

from ecosystem.applications.arcturus.contracts.execution.workforce.base_models import (
    AgentAssignment,
    AgentAssignmentPayload,
    AgentProfileContract,
    WorkforceAgentRoster,
    WorkforceRoleContract,
)
from ecosystem.applications.arcturus.contracts.ontology.ontology_snapshot_contract import (
    RoleState,
)
from ecosystem.applications.arcturus.contracts.shared.base_models import (
    SimulationContext,
)


def create_context() -> SimulationContext:
    return SimulationContext(
        experiment_id="EXP-001",
        global_seed=42,
    )


def create_role() -> WorkforceRoleContract:
    return WorkforceRoleContract(
        role=RoleState(
            role_id=101,
            role_title="Engineer",
            access_level=1,
        ),
        assigned_agent_ids=[1],
    )


def test_valid_agent_assignment_payload():
    payload = AgentAssignmentPayload(
        context=create_context(),
        assignment_id="ASSIGN-001",
        enterprise_instance_id="ENT-001",
        assignments=[
            AgentAssignment(
                agent_id=1,
                role_id=101,
            )
        ],
    )

    assert payload.assignment_id == "ASSIGN-001"
    assert payload.enterprise_instance_id == "ENT-001"
    assert len(payload.assignments) == 1


def test_missing_assignment_id_is_rejected():
    with pytest.raises(ValidationError):
        AgentAssignmentPayload(
            context=create_context(),
            enterprise_instance_id="ENT-001",
            assignments=[],
        )


def test_missing_enterprise_instance_id_is_rejected():
    with pytest.raises(ValidationError):
        AgentAssignmentPayload(
            context=create_context(),
            assignment_id="ASSIGN-001",
            assignments=[],
        )


def test_invalid_assignment_data_is_rejected():
    with pytest.raises(ValidationError):
        AgentAssignment(
            agent_id="invalid-agent-id",
            role_id="invalid-role-id",
        )


def test_valid_workforce_agent_roster():
    roster = WorkforceAgentRoster(
        context=create_context(),
        enterprise_instance_id="ENT-001",
       agents=[
    AgentProfileContract(
        agent_id=1,
        name="Agent-001",
        role_id=101,
        status="active",
        experiment_id="EXP-001",
    )
],
        roles=[create_role()],
    )

    assert roster.enterprise_instance_id == "ENT-001"
    assert len(roster.agents) == 1
    assert len(roster.roles) == 1


def test_missing_roster_enterprise_id_is_rejected():
    with pytest.raises(ValidationError):
        WorkforceAgentRoster(
            context=create_context(),
            agents=[],
            roles=[],
        )


def test_invalid_agent_profile_is_rejected():
    with pytest.raises(ValidationError):
        AgentProfileContract(
            agent_id="not-an-integer",
            name="Agent-001",
            role_id=101,
            status="active",
        )


def test_invalid_workforce_role_is_rejected():
    with pytest.raises(ValidationError):
        WorkforceRoleContract(
            role={
                "role_id": "invalid-role-id",
                "role_title": "Engineer",
                "access_level": 1,
            },
            assigned_agent_ids=[],
        )


def test_empty_assignment_payload_is_valid():
    payload = AgentAssignmentPayload(
        context=create_context(),
        assignment_id="ASSIGN-EMPTY",
        enterprise_instance_id="ENT-001",
        assignments=[],
    )

    assert payload.assignments == []


def test_empty_workforce_roster_is_valid():
    roster = WorkforceAgentRoster(
        context=create_context(),
        enterprise_instance_id="ENT-001",
        agents=[],
        roles=[],
    )

    assert roster.agents == []
    assert roster.roles == []