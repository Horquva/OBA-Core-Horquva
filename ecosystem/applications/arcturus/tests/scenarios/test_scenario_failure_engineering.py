"""
Scenario Engineering Platform - Part 5 (Failure Engineering, Traceability
& AI Safety) gap closure.
Owner: Maryam Yaqoob

Systematically verifies that each of the 8 invalid conditions listed in
docs/week4/Maryam_Yaqoob.md Part 5 is safely rejected with traceable
evidence (ArcturusValidationError carrying the scenario_id and the
specific field/entity that failed), rather than being silently accepted
or failing with an unrelated/uninformative error.

This file does NOT duplicate the unit-level coverage already in
test_scenario_engine.py / test_scenario_lifecycle.py / test_scenario_variants.py
/ test_scenario_context_resolver.py -- it exists as the single place that
maps each of the 8 spec-required failure categories to its real,
confirmed rejection path, and additionally asserts on *traceability*
(does the raised error/state actually let you tell WHAT failed and WHY),
which is Part 5's specific concern beyond plain unit correctness.

Every scenario_id below uses the SCN-FE-1xx range and is unique across
the whole suite, since _REGISTRY/_LIFECYCLE in scenario_chain.py are
process-wide singletons shared by every test file that imports it.
Fixture builders are local to this file (not imported from
test_scenario_chain_enterprise_workflow.py), matching the project's
existing convention of local, non-shared fixtures per test module.

Uses fresh ScenarioLifecycleManager() instances (not the scenario_chain
singleton) for lifecycle tests, since ScenarioLifecycleManager instances
are confirmed independent of one another (see
test_scenario_lifecycle.py::TestInstanceIsolation) -- this avoids any
scenario_id collision risk with other test files entirely for that
category.
"""

from __future__ import annotations

import pytest

from ecosystem.applications.arcturus.contracts.control.scenarios.base_models import (
    ScenarioConstraintContract,
    ScenarioDSLPayload,
    ScenarioExpectationContract,
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
from ecosystem.applications.arcturus.src.control_plane.scenarios.scenario_context_resolver import (
    resolve_scenario_context,
    verify_workflow_compatibility,
)
from ecosystem.applications.arcturus.src.control_plane.scenarios.scenario_engine import (
    ScenarioEngine,
)
from ecosystem.applications.arcturus.src.control_plane.scenarios.scenario_lifecycle import (
    ScenarioLifecycleManager,
    ScenarioLifecycleState,
)
from ecosystem.applications.arcturus.src.control_plane.scenarios.scenario_variants import (
    generate_variant,
)


# ---------------------------------------------------------------------------
# Fixtures / builders (local to this file, per project convention)
# ---------------------------------------------------------------------------

def create_context(**overrides):
    base = dict(experiment_id="EXP-SCN-FE-001", global_seed=11)
    base.update(overrides)
    return SimulationContext(**base)


def create_payload(context, scenario_id, **overrides):
    base = dict(
        context=context,
        scenario_id=scenario_id,
        description="Failure engineering test scenario",
        trigger_event="reorg_announced",
        participants=["Executive", "HR Lead"],
        organizational_scope=["Leadership", "Governance"],
        preconditions=["min_agents >= 1"],
        variables={},
    )
    base.update(overrides)
    return ScenarioDSLPayload(**base)


def create_enterprise(context, instance_id="ENT-FE-001", **overrides):
    base = dict(
        context=context,
        instance_id=instance_id,
        config_id="CFG-FE-001",
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


def create_activity(context, activity_id="ACT-9103"):
    return ActivityStateContract(
        context=context,
        activity_id=activity_id,
        name="Notify stakeholders",
        status=ActivityStatus.PENDING,
    )


def create_workflow(context, organizational_context_ref, workflow_id="WF-FEE-001", **overrides):
    base = dict(
        context=context,
        workflow_id=workflow_id,
        name="FE Workflow",
        description="",
        activities=[create_activity(context)],
        organizational_context_ref=organizational_context_ref,
        agent_assignment_ref="AGT-FE-001",
    )
    base.update(overrides)
    return WorkflowDefinitionContract(**base)


# ---------------------------------------------------------------------------
# 1. Missing required field
# ---------------------------------------------------------------------------

class TestMissingRequiredField:

    def test_missing_participants_rejected(self):
        engine = ScenarioEngine()
        context = create_context()
        payload = create_payload(context, "SCN-FE-101", participants=[])

        with pytest.raises(ArcturusValidationError) as exc_info:
            engine.compile_scenario(payload)

        assert "SCN-FE-101" in str(exc_info.value)
        assert "participants" in str(exc_info.value)

    def test_missing_organizational_scope_rejected(self):
        engine = ScenarioEngine()
        context = create_context()
        payload = create_payload(context, "SCN-FE-102", organizational_scope=[])

        with pytest.raises(ArcturusValidationError) as exc_info:
            engine.compile_scenario(payload)

        assert "SCN-FE-102" in str(exc_info.value)
        assert "organizational_scope" in str(exc_info.value)


# ---------------------------------------------------------------------------
# 2. Invalid enterprise reference
# ---------------------------------------------------------------------------

class TestInvalidEnterpriseReference:

    def test_workflow_targeting_wrong_enterprise_instance_rejected(self):
        context = create_context()
        payload = create_payload(context, "SCN-FE-103")
        enterprise = create_enterprise(context, instance_id="ENT-FE-103")
        workflow = create_workflow(context, organizational_context_ref="ENT-DOES-NOT-EXIST")

        with pytest.raises(ArcturusValidationError) as exc_info:
            verify_workflow_compatibility(payload, workflow, enterprise)

        message = str(exc_info.value)
        assert "ENT-DOES-NOT-EXIST" in message
        assert "ENT-FE-103" in message
        assert "WF-FEE-001" in message


# ---------------------------------------------------------------------------
# 3. Invalid participant
# ---------------------------------------------------------------------------

class TestInvalidParticipant:

    def test_unresolved_participant_rejected_strict(self):
        context = create_context()
        payload = create_payload(context, "SCN-FE-104", participants=["Nonexistent Role"])
        enterprise = create_enterprise(context, instance_id="ENT-FE-104")

        with pytest.raises(ArcturusValidationError) as exc_info:
            resolve_scenario_context(payload, enterprise, strict=True)

        message = str(exc_info.value)
        assert "SCN-FE-104" in message
        assert "Nonexistent Role" in message

    def test_diagnostic_path_still_surfaces_the_same_failure(self):
        """strict=False must not silently accept an unresolved participant
        -- it must still be visible in the returned resolution, per
        scenario_context_resolver.py's documented gap-reporting use case."""
        context = create_context()
        payload = create_payload(context, "SCN-FE-105", participants=["Nonexistent Role"])
        enterprise = create_enterprise(context, instance_id="ENT-FE-105")

        resolution = resolve_scenario_context(payload, enterprise, strict=False)

        assert resolution.all_resolved is False
        assert any(e.label == "Nonexistent Role" for e in resolution.unresolved)


# ---------------------------------------------------------------------------
# 4. Failed precondition
# ---------------------------------------------------------------------------

class TestFailedPrecondition:

    def test_empty_preconditions_rejected(self):
        engine = ScenarioEngine()
        context = create_context()
        payload = create_payload(context, "SCN-FE-106", preconditions=[])

        with pytest.raises(ArcturusValidationError) as exc_info:
            engine.evaluate_preconditions(payload)

        assert "SCN-FE-106" in str(exc_info.value)

    def test_duplicate_precondition_rejected_case_insensitively(self):
        engine = ScenarioEngine()
        context = create_context()
        payload = create_payload(
            context,
            "SCN-FE-107",
            preconditions=["min_agents >= 1", "Min_Agents >= 1"],
        )

        with pytest.raises(ArcturusValidationError) as exc_info:
            engine.evaluate_preconditions(payload)

        assert "SCN-FE-107" in str(exc_info.value)
        assert "duplicate" in str(exc_info.value).lower()


# ---------------------------------------------------------------------------
# 5. Conflicting constraint
# ---------------------------------------------------------------------------

class TestConflictingConstraint:

    def test_success_and_failure_criteria_overlap_rejected(self):
        engine = ScenarioEngine()
        context = create_context()
        payload = create_payload(context, "SCN-FE-108")
        expectations = ScenarioExpectationContract(
            context=context,
            scenario_id="SCN-FE-108",
            success_criteria=["all_agents_notified"],
            failure_conditions=["all_agents_notified"],
            expected_outcomes=[],
            metrics=[],
            termination_conditions=["timeout_exceeded"],
        )

        with pytest.raises(ArcturusValidationError) as exc_info:
            engine.build_expected_outcome(payload, expectations)

        message = str(exc_info.value)
        assert "SCN-FE-108" in message
        assert "all_agents_notified" in message


# ---------------------------------------------------------------------------
# 6. Malformed variable
# ---------------------------------------------------------------------------

class TestMalformedVariable:

    def test_non_numeric_variable_against_numeric_hard_limit_rejected(self):
        engine = ScenarioEngine()
        context = create_context()
        payload = create_payload(context, "SCN-FE-109", variables={"headcount": "many"})
        constraints = ScenarioConstraintContract(
            context=context,
            scenario_id="SCN-FE-109",
            constraints=["headcount_capped"],
            hard_limits={"headcount": 50},
        )

        with pytest.raises(ArcturusValidationError) as exc_info:
            engine.compile_scenario(payload, constraints=constraints)

        message = str(exc_info.value)
        assert "SCN-FE-109" in message
        assert "headcount" in message
        assert "numeric" in message.lower()


# ---------------------------------------------------------------------------
# 7. Invalid lifecycle transition
# ---------------------------------------------------------------------------

class TestInvalidLifecycleTransition:

    def test_cannot_skip_defined_to_active(self):
        manager = ScenarioLifecycleManager()
        manager.start("SCN-FE-110")

        with pytest.raises(ArcturusValidationError) as exc_info:
            manager.transition("SCN-FE-110", ScenarioLifecycleState.ACTIVE)

        assert "SCN-FE-110" in str(exc_info.value)
        # No partial/corrupted state: still cleanly at DEFINED after rejection.
        assert manager.current_state("SCN-FE-110") == ScenarioLifecycleState.DEFINED

    def test_cannot_transition_after_terminal_state(self):
        manager = ScenarioLifecycleManager()
        manager.start("SCN-FE-111")
        manager.transition("SCN-FE-111", ScenarioLifecycleState.FAILED)

        with pytest.raises(ArcturusValidationError) as exc_info:
            manager.transition("SCN-FE-111", ScenarioLifecycleState.TERMINATED)

        message = str(exc_info.value)
        assert "SCN-FE-111" in message
        assert "terminal" in message.lower()


# ---------------------------------------------------------------------------
# 8. Unsupported configuration
# ---------------------------------------------------------------------------

class TestUnsupportedConfiguration:

    def test_variant_override_key_not_in_base_variables_rejected(self):
        engine = ScenarioEngine()
        context = create_context()
        payload = create_payload(context, "SCN-FE-112", variables={"headcount": 10})
        compiled = engine.compile_scenario(payload)

        with pytest.raises(ArcturusValidationError) as exc_info:
            generate_variant(payload, compiled, "aggressive", {"unsupported_param": 99})

        message = str(exc_info.value)
        assert "SCN-FE-112" in message
        assert "unsupported_param" in message
