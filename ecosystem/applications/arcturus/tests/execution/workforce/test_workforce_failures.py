import pytest

from ecosystem.applications.arcturus.contracts.enterprise.base_models import (
    EnterpriseInstancePayload,
)
from ecosystem.applications.arcturus.contracts.execution.workforce.base_models import (
    AgentProfileContract,
    WorkforceRoleContract,
    WorkerCapability,
)
from ecosystem.applications.arcturus.contracts.ontology.ontology_snapshot_contract import (
    OrganizationState,
    RoleState,
)
from ecosystem.applications.arcturus.contracts.shared.base_models import (
    ArcturusValidationError,
    SimulationContext,
)
from ecosystem.applications.arcturus.src.execution_plane.workforce.workforce_service import (
    WorkforceService,
)


def create_context() -> SimulationContext:
    return SimulationContext(
        experiment_id="EXP-001",
        global_seed=42,
    )


def test_empty_enterprise_structure_fails_materialization():
    service = WorkforceService()

    enterprise = EnterpriseInstancePayload(
        context=create_context(),
        instance_id="ENT-EMPTY",
        config_id="CONFIG-001",
        organization=OrganizationState(
            org_id=1,
            org_name="Empty Enterprise",
        ),
        roles=[],
        departments=[],
        teams=[],
        is_structurally_valid=True,
    )

    with pytest.raises(
        ArcturusValidationError,
        match="Enterprise structure is empty",
    ):
        service.materialize_from_enterprise(
            context=create_context(),
            enterprise=enterprise,
        )


def test_agent_without_required_capability_is_blocked():
    service = WorkforceService()

    agent = AgentProfileContract(
        agent_id=1,
        name="Agent-001",
        role_id=0,
        status="active",
        capabilities=[
            WorkerCapability(
                capability_id=20,
                name="Java",
                readiness_score=1.0,
            )
        ],
        experiment_id="EXP-001",
    )

    role = WorkforceRoleContract(
        role=RoleState(
            role_id=101,
            role_title="Software Engineer",
            access_level=1.0,
        ),
        required_capability_ids=[10],
    )

    assignments = service.assign_roles(
        agents=[agent],
        roles=[role],
    )

    assert len(assignments) == 1
    assert assignments[0].status == "BLOCKED"
    assert assignments[0].agent_id == 1
    assert assignments[0].role_id == 0
    assert assignments[0].reason is not None

    # The agent must not be added to the incompatible role.
    assert agent.agent_id not in role.assigned_agent_ids
