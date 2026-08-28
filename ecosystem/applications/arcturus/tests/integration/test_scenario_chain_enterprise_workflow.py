"""
Week 4 integration tests -- run_scenario_chain() enterprise/workflow wiring
Owner: Maryam Yaqoob (Scenario Engineering Platform)

Covers open item #3 (scenario_chain.py wiring not yet regression-tested
with the new optional enterprise/workflow params). Exercises the real
resolve_scenario_context() / verify_workflow_compatibility() path added
in this session's scenario_chain.py, plus the module-level _REGISTRY /
_LIFECYCLE singleton persistence across calls.

Kept in its own file (not appended to test_scenario_chain.py) with its
own local fixtures, consistent with the convention already used in
test_scenario_context_resolver.py, rather than importing fixtures
across test modules.

Every scenario_id below is unique across the WHOLE test suite (not just
this file) -- _REGISTRY/_LIFECYCLE are process-wide singletons shared
by every test file that imports scenario_chain, so reusing an id from
test_scenario_chain.py (e.g. "SCN-WF-004") would leak state across
files. Do not reuse SCN-CH-1xx ids across tests either.
"""

import pytest

from ecosystem.applications.arcturus.contracts.control.scenarios.base_models import (
    ScenarioDSLPayload,
)
from ecosystem.applications.arcturus.contracts.enterprise.base_models import (
    EnterpriseInstancePayload,
)
from ecosystem.applications.arcturus.contracts.execution.workflows.base_models import (
    ActivityStateContract,
    WorkflowDefinitionContract,
)
from ecosystem.applications.arcturus.contracts.ontology.ontology_snapshot_contract import (
    DivisionState,
    OrganizationState,
    RoleState,
)
from ecosystem.applications.arcturus.contracts.shared.base_models import (
    ArcturusValidationError,
    SimulationContext,
)
from ecosystem.applications.arcturus.schemas.execution.workflows.base_schemas import (
    ActivityStatus,
)
from ecosystem.applications.arcturus.src.control_plane.scenarios.scenario_lifecycle import (
    ScenarioLifecycleState,
)
from ecosystem.applications.arcturus.src.integration.scenario_chain import (
    _LIFECYCLE,
    _REGISTRY,
    run_scenario_chain,
)


# ---------------------------------------------------------------------------
# Fixtures / builders
# ---------------------------------------------------------------------------

def create_context(**overrides):
    base = dict(experiment_id="EXP-SCN-CHW-001", global_seed=7)
    base.update(overrides)
    return SimulationContext(**base)


def create_payload(context, scenario_id, **overrides):
    base = dict(
        context=context,
        scenario_id=scenario_id,
        description="Enterprise/workflow wiring test scenario",
        trigger_event="reorg_announced",
        participants=["Executive", "HR Lead"],
        organizational_scope=["Leadership", "Governance"],
        preconditions=["min_agents >= 1"],
        variables={},
    )
    base.update(overrides)
    return ScenarioDSLPayload(**base)


def create_enterprise(context, instance_id="ENT-CH-001", **overrides):
    base = dict(
        context=context,
        instance_id=instance_id,
        config_id="CFG-CH-001",
        organization=OrganizationState(org_id=1, org_name="Horquva", leader="CEO"),
        divisions=[
            DivisionState(div_id=1, div_name="Leadership", org_id=1),
            DivisionState(div_id=2, div_name="Governance", org_id=1),
        ],
        departments=[],
        teams=[],
        roles=[
            RoleState(role_id=1, role_title="Executive", access_level=5.0),
            RoleState(role_id=2, role_title="HR Lead", access_level=3.0),
        ],
        is_structurally_valid=True,
        validation_errors=[],
    )
    base.update(overrides)
    return EnterpriseInstancePayload(**base)


def create_activity(context, activity_id="ACT-0001"):
    return ActivityStateContract(
        context=context,
        activity_id=activity_id,
        name="Notify stakeholders",
        status=ActivityStatus.PENDING,
    )


def create_workflow(context, organizational_context_ref, workflow_id="WF-CHX-001", **overrides):
    base = dict(
        context=context,
        workflow_id=workflow_id,
        name="CH Workflow",
        description="",
        activities=[create_activity(context)],
        organizational_context_ref=organizational_context_ref,
        agent_assignment_ref="AGT-CH-001",
    )
    base.update(overrides)
    return WorkflowDefinitionContract(**base)


# ---------------------------------------------------------------------------
# enterprise supplied, resolution succeeds -> READY
# ---------------------------------------------------------------------------

class TestEnterpriseSuppliedAdvancesToReady:

    def test_successful_resolution_advances_lifecycle_to_ready(self):
        context = create_context()
        payload = create_payload(context, "SCN-CH-101")
        enterprise = create_enterprise(context)

        run_scenario_chain(payload, enterprise=enterprise)

        assert _LIFECYCLE.current_state("SCN-CH-101") == ScenarioLifecycleState.READY

    def test_successful_resolution_registers_scenario(self):
        context = create_context()
        payload = create_payload(context, "SCN-CH-102")
        enterprise = create_enterprise(context)

        run_scenario_chain(payload, enterprise=enterprise)

        assert _REGISTRY.exists("SCN-CH-102") is True


# ---------------------------------------------------------------------------
# enterprise supplied, resolution fails -> stays at VALIDATED, not READY
# ---------------------------------------------------------------------------

class TestEnterpriseResolutionFailure:

    def test_unresolved_participant_raises(self):
        context = create_context()
        payload = create_payload(context, "SCN-CH-103", participants=["Ghost Role"])
        enterprise = create_enterprise(context)

        with pytest.raises(ArcturusValidationError):
            run_scenario_chain(payload, enterprise=enterprise)

    def test_failed_resolution_does_not_advance_to_ready(self):
        """resolve_scenario_context() runs BEFORE the READY transition in
        run_scenario_chain(), so a failed resolution leaves the scenario
        at VALIDATED, not READY. This is the real current behavior."""
        context = create_context()
        payload = create_payload(context, "SCN-CH-104", participants=["Ghost Role"])
        enterprise = create_enterprise(context)

        with pytest.raises(ArcturusValidationError):
            run_scenario_chain(payload, enterprise=enterprise)

        assert _LIFECYCLE.current_state("SCN-CH-104") == ScenarioLifecycleState.VALIDATED


# ---------------------------------------------------------------------------
# workflow compatibility check
# ---------------------------------------------------------------------------

class TestWorkflowCompatibilityCheck:

    def test_matching_context_ref_does_not_raise(self):
        context = create_context()
        payload = create_payload(context, "SCN-CH-105")
        enterprise = create_enterprise(context, instance_id="ENT-CH-105")
        workflow = create_workflow(context, organizational_context_ref="ENT-CH-105")

        result = run_scenario_chain(payload, enterprise=enterprise, workflow=workflow)

        assert result["scenario_id"] == "SCN-CH-105"

    def test_mismatched_context_ref_raises(self):
        context = create_context()
        payload = create_payload(context, "SCN-CH-106")
        enterprise = create_enterprise(context, instance_id="ENT-CH-106")
        workflow = create_workflow(context, organizational_context_ref="ENT-WRONG")

        with pytest.raises(ArcturusValidationError):
            run_scenario_chain(payload, enterprise=enterprise, workflow=workflow)

    def test_mismatched_workflow_still_leaves_lifecycle_at_ready(self):
        """FLAGGED: verify_workflow_compatibility() runs AFTER the
        VALIDATED->READY transition in run_scenario_chain(). A workflow
        mismatch raises, but the scenario has already been promoted to
        READY by that point. This test documents that real ordering --
        it is not asserting this should be "fixed"."""
        context = create_context()
        payload = create_payload(context, "SCN-CH-107")
        enterprise = create_enterprise(context, instance_id="ENT-CH-107")
        workflow = create_workflow(context, organizational_context_ref="ENT-WRONG")

        with pytest.raises(ArcturusValidationError):
            run_scenario_chain(payload, enterprise=enterprise, workflow=workflow)

        assert _LIFECYCLE.current_state("SCN-CH-107") == ScenarioLifecycleState.READY


# ---------------------------------------------------------------------------
# module-level singleton persistence across calls
# ---------------------------------------------------------------------------

class TestSingletonStatePersistsAcrossCalls:

    def test_second_call_same_scenario_id_does_not_error(self):
        """_REGISTRY/_LIFECYCLE persist across calls within one process.
        A second call for the same scenario_id must not raise an
        invalid-transition error even though the scenario is already
        READY -- the VALIDATED->READY guard just no-ops."""
        context = create_context()
        enterprise = create_enterprise(context)

        run_scenario_chain(create_payload(context, "SCN-CH-108"), enterprise=enterprise)
        assert _LIFECYCLE.current_state("SCN-CH-108") == ScenarioLifecycleState.READY

        result = run_scenario_chain(
            create_payload(context, "SCN-CH-108", variables={"headcount": 5}),
            enterprise=enterprise,
        )

        assert result["scenario_id"] == "SCN-CH-108"
        assert _LIFECYCLE.current_state("SCN-CH-108") == ScenarioLifecycleState.READY

    def test_second_call_with_different_variables_registers_new_version(self):
        context = create_context()
        enterprise = create_enterprise(context)

        run_scenario_chain(create_payload(context, "SCN-CH-109"), enterprise=enterprise)
        result_v2 = run_scenario_chain(
            create_payload(context, "SCN-CH-109", variables={"headcount": 5}),
            enterprise=enterprise,
        )

        versions = _REGISTRY.list_versions("SCN-CH-109")
        assert result_v2["fingerprint"] in versions
        assert len(versions) == 2


# ---------------------------------------------------------------------------
# old calling convention (enterprise omitted) is unaffected
# ---------------------------------------------------------------------------

class TestOldCallingConventionUnaffectedByNewParams:

    def test_omitting_enterprise_stops_at_validated_not_ready(self):
        context = create_context()
        payload = create_payload(context, "SCN-CH-110")

        run_scenario_chain(payload)

        assert _LIFECYCLE.current_state("SCN-CH-110") == ScenarioLifecycleState.VALIDATED
