from ecosystem.applications.arcturus.contracts.execution.workforce.base_models import (
    AgentProfileContract,
    WorkforceRoleContract,
    WorkerCapability,
)
from ecosystem.applications.arcturus.contracts.ontology.ontology_snapshot_contract import (
    RoleState,
)
from ecosystem.applications.arcturus.src.execution_plane.workforce.workforce_service import (
    WorkforceService,
)


def create_role(required_capability_ids: list[int]) -> WorkforceRoleContract:
    return WorkforceRoleContract(
        role=RoleState(
            role_id=101,
            role_title="Software Engineer",
            access_level=1.0,
        ),
        required_capability_ids=required_capability_ids,
    )


def test_agent_with_required_capability_is_assigned():
    service = WorkforceService()

    agent = AgentProfileContract(
        agent_id=1,
        name="Agent-001",
        role_id=0,
        status="active",
        capabilities=[
            WorkerCapability(
                capability_id=10,
                name="Python",
                readiness_score=1.0,
            )
        ],
        experiment_id="EXP-001",
    )

    role = create_role([10])

    assignments = service.assign_roles(
        agents=[agent],
        roles=[role],
    )

    assert len(assignments) == 1
    assert assignments[0].status == "ASSIGNED"
    assert assignments[0].agent_id == 1
    assert assignments[0].role_id == 101


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

    role = create_role([10])

    assignments = service.assign_roles(
        agents=[agent],
        roles=[role],
    )

    assert len(assignments) == 1
    assert assignments[0].status == "BLOCKED"
    assert assignments[0].agent_id == 1
    assert assignments[0].role_id == 0
    assert assignments[0].reason is not None