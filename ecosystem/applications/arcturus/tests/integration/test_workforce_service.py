from ecosystem.applications.arcturus.src.execution_plane.workforce.workforce_service import (
    WorkforceService,
)
from ecosystem.applications.arcturus.contracts.shared.base_models import (
    SimulationContext,
)
from ecosystem.applications.arcturus.contracts.execution.workforce.base_models import (
    WorkforceRoleContract,
)
from ecosystem.applications.arcturus.contracts.ontology.ontology_snapshot_contract import (
    RoleState,
)


def create_context():
    return SimulationContext(
        experiment_id="EXP-001",
        global_seed=42,
    )


def create_roles():
    return [
        WorkforceRoleContract(
            role=RoleState(
                role_id=101,
                role_title="Engineer",
                access_level=1,
            ),
            assigned_agent_ids=[],
        ),
        WorkforceRoleContract(
            role=RoleState(
                role_id=102,
                role_title="Manager",
                access_level=2,
            ),
            assigned_agent_ids=[],
        ),
    ]


def test_materialize_agents_creates_requested_number():
    service = WorkforceService()

    agents = service.materialize_agents(
        create_context(),
        "ENT-001",
        3,
    )

    assert len(agents) == 3
    assert agents[0].agent_id == 1
    assert agents[0].status == "active"


def test_materialize_agents_rejects_negative_count():
    service = WorkforceService()

    try:
        service.materialize_agents(
            create_context(),
            "ENT-001",
            -1,
        )
        assert False
    except ValueError:
        assert True


def test_assign_roles_assigns_agents_to_roles():
    service = WorkforceService()

    agents = service.materialize_agents(
        create_context(),
        "ENT-001",
        3,
    )

    roles = create_roles()

    assignments = service.assign_roles(
        agents,
        roles,
    )

    assert len(assignments) == 3
    assert assignments[0].agent_id == 1
    assert assignments[0].role_id == 101
    assert assignments[1].agent_id == 2
    assert assignments[1].role_id == 102


def test_build_roster_creates_valid_roster():
    service = WorkforceService()
    context = create_context()

    agents = service.materialize_agents(
        context,
        "ENT-001",
        3,
    )

    roles = create_roles()

    service.assign_roles(
        agents,
        roles,
    )

    roster = service.build_roster(
        context,
        "ENT-001",
        agents,
        roles,
    )

    assert roster.enterprise_instance_id == "ENT-001"
    assert len(roster.agents) == 3
    assert len(roster.roles) == 2


def test_assign_roles_with_no_roles_returns_empty():
    service = WorkforceService()

    agents = service.materialize_agents(
        create_context(),
        "ENT-001",
        2,
    )

    assignments = service.assign_roles(
        agents,
        [],
    )

    assert assignments == []