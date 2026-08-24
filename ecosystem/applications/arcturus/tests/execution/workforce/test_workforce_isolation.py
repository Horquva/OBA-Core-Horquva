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


def create_context(experiment_id: str) -> SimulationContext:
    return SimulationContext(
        experiment_id=experiment_id,
        global_seed=42,
    )


def create_enterprise(experiment_id: str) -> EnterpriseInstancePayload:
    return EnterpriseInstancePayload(
        context=create_context(experiment_id),
        instance_id=f"ENT-{experiment_id}",
        config_id=f"CONFIG-{experiment_id}",
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


def test_workforce_isolated_between_experiments():
    service = WorkforceService()

    context_a = create_context("EXP-A")
    context_b = create_context("EXP-B")

    enterprise_a = create_enterprise("EXP-A")
    enterprise_b = create_enterprise("EXP-B")

    workers_a = service.materialize_from_enterprise(
        context=context_a,
        enterprise=enterprise_a,
    )

    workers_b = service.materialize_from_enterprise(
        context=context_b,
        enterprise=enterprise_b,
    )

    assert len(workers_a) == 1
    assert len(workers_b) == 1

    assert workers_a[0].experiment_id == "EXP-A"
    assert workers_b[0].experiment_id == "EXP-B"

    assert workers_a[0].experiment_id != workers_b[0].experiment_id