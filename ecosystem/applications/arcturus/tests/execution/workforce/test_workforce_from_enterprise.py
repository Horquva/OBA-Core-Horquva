from ecosystem.applications.arcturus.contracts.enterprise.base_models import (
    EnterpriseInstancePayload,
)
from ecosystem.applications.arcturus.contracts.ontology.ontology_snapshot_contract import (
    OrganizationState,
    RoleState,
)
from ecosystem.applications.arcturus.contracts.shared.base_models import (
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


def create_enterprise() -> EnterpriseInstancePayload:
    return EnterpriseInstancePayload(
        context=create_context(),
        instance_id="ENT-001",
        config_id="CONFIG-001",
        organization=OrganizationState(
            org_id=1,
            org_name="Test Enterprise",
        ),
        roles=[
            RoleState(
                role_id=101,
                role_title="Software Engineer",
                access_level=1.0,
            )
        ],
        is_structurally_valid=True,
    )


def test_materialize_workers_from_enterprise():
    service = WorkforceService()
    enterprise = create_enterprise()
    context = create_context()

    workers = service.materialize_from_enterprise(
        context=context,
        enterprise=enterprise,
    )

    assert len(workers) == 1

    worker = workers[0]

    assert worker.agent_id == 1
    assert worker.name == "Agent-001"
    assert worker.role_id == 101
    assert worker.status == "active"
    assert worker.experiment_id == "EXP-001"
    assert worker.capabilities == []
    assert worker.availability.start_hour == 9
    assert worker.availability.end_hour == 17
    assert worker.manager_id is None
    assert worker.workload_capacity == 1.0