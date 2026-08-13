"""
Tests for the Scenario Engineering Platform.
Owner: Maryam Yaqoob

Covers:
  - Canonical contract validation (ScenarioDSLPayload,
    ScenarioConstraintContract, ScenarioExpectationContract)
  - ScenarioAdapter outbound payload construction for the Simulation
    Runtime (Muhammad Maaz Khan) and Validation & Evaluation Platform
    (Amina Khan)
  - Negative / failure-injection cases: malformed contracts, missing
    expectations, cross-reference mismatches, duplicate preconditions
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from ecosystem.applications.arcturus.contracts.control.scenarios.base_models import (
    ScenarioConstraintContract,
    ScenarioDSLPayload,
    ScenarioExpectationContract,
)
from ecosystem.applications.arcturus.contracts.shared.base_models import (
    ArcturusValidationError,
    SimulationContext,
)
from ecosystem.applications.arcturus.src.scenario_engineering.scenario_adapters import (
    ScenarioAdapter,
)
from ecosystem.applications.arcturus.src.scenario_engineering.scenario_engine import (
    ScenarioEngine,
)

SCENARIO_ID = "SCN-WF-004"


def make_context() -> SimulationContext:
    return SimulationContext(experiment_id="EXP-SCN-001", global_seed=42)


def make_payload(scenario_id: str = SCENARIO_ID, **overrides: object) -> ScenarioDSLPayload:
    defaults: dict[str, object] = dict(
        context=make_context(),
        scenario_id=scenario_id,
        description="Executive departure triggers succession review",
        trigger_event="Executive resignation announced",
        participants=["Executive", "HR Lead"],
        organizational_scope=["Leadership", "Governance"],
        preconditions=["Succession plan exists", "HR notified within 24h"],
        variables={"severity": "high", "duration_days": 14},
    )
    defaults.update(overrides)
    return ScenarioDSLPayload(**defaults)


def make_constraints(
    scenario_id: str = SCENARIO_ID, **overrides: object
) -> ScenarioConstraintContract:
    defaults: dict[str, object] = dict(
        context=make_context(),
        scenario_id=scenario_id,
        constraints=["Notice period fixed at 30 days"],
        hard_limits={"budget_cap": 120000, "max_duration_days": 30},
    )
    defaults.update(overrides)
    return ScenarioConstraintContract(**defaults)


def make_expectations(
    scenario_id: str = SCENARIO_ID, **overrides: object
) -> ScenarioExpectationContract:
    defaults: dict[str, object] = dict(
        context=make_context(),
        scenario_id=scenario_id,
        success_criteria=["Successor named within 14 days"],
        failure_conditions=["No successor named within 30 days"],
        expected_outcomes=["Smooth leadership transition"],
        metrics=["recovery time", "morale score"],
        termination_conditions=["Successor confirmed", "Role backfilled externally"],
    )
    defaults.update(overrides)
    return ScenarioExpectationContract(**defaults)


def make_adapter() -> ScenarioAdapter:
    return ScenarioAdapter(ScenarioEngine())


# ---------------------------------------------------------------------------
# Contract validation
# ---------------------------------------------------------------------------


def test_valid_scenario_dsl_payload():
    payload = make_payload()
    assert payload.scenario_id == SCENARIO_ID
    assert payload.participants == ["Executive", "HR Lead"]


@pytest.mark.parametrize(
    "bad_id",
    ["SCN-wf-004", "SCN-W-004", "SCN-WF-04", "WF-SCN-004", "SCN-WF-0004", ""],
)
def test_invalid_scenario_id_pattern_is_rejected(bad_id):
    with pytest.raises(ValidationError):
        make_payload(scenario_id=bad_id)


def test_missing_description_is_rejected():
    with pytest.raises(ValidationError):
        ScenarioDSLPayload(
            context=make_context(),
            scenario_id=SCENARIO_ID,
            description="",
            trigger_event="Executive resignation announced",
        )


def test_scenario_dsl_payload_defaults_are_empty_collections():
    payload = ScenarioDSLPayload(
        context=make_context(),
        scenario_id=SCENARIO_ID,
        description="Minimal scenario",
        trigger_event="Trigger",
    )
    assert payload.participants == []
    assert payload.organizational_scope == []
    assert payload.preconditions == []
    assert payload.variables == {}


def test_valid_constraint_contract():
    constraints = make_constraints()
    assert constraints.hard_limits["budget_cap"] == 120000


def test_valid_expectation_contract():
    expectations = make_expectations()
    assert "Successor named within 14 days" in expectations.success_criteria


# ---------------------------------------------------------------------------
# ScenarioAdapter -- compilation + outbound payloads
# ---------------------------------------------------------------------------


def test_to_runtime_dispatch_builds_expected_shape():
    adapter = make_adapter()
    compiled = adapter.compile(make_payload(), make_constraints())

    dispatch = adapter.to_runtime_dispatch(compiled)

    assert dispatch["scenario_id"] == SCENARIO_ID
    assert dispatch["fingerprint"] == compiled.fingerprint
    assert dispatch["constraints"] == ["Notice period fixed at 30 days"]
    assert dispatch["hard_limits"]["budget_cap"] == 120000
    assert dispatch["preconditions"] == [
        "Succession plan exists",
        "HR notified within 24h",
    ]


def test_to_runtime_dispatch_without_constraints_defaults_empty():
    adapter = make_adapter()
    compiled = adapter.compile(make_payload())

    dispatch = adapter.to_runtime_dispatch(compiled)

    assert dispatch["constraints"] == []
    assert dispatch["hard_limits"] == {}


def test_to_validation_handoff_builds_expected_shape():
    adapter = make_adapter()
    compiled = adapter.compile(make_payload(), expectations=make_expectations())

    handoff = adapter.to_validation_handoff(compiled)

    assert handoff["scenario_id"] == SCENARIO_ID
    assert handoff["fingerprint"] == compiled.fingerprint
    assert handoff["success_criteria"] == ["Successor named within 14 days"]
    assert handoff["termination_conditions"] == [
        "Successor confirmed",
        "Role backfilled externally",
    ]


def test_to_validation_handoff_without_expectations_raises():
    adapter = make_adapter()
    compiled = adapter.compile(make_payload())

    with pytest.raises(ArcturusValidationError):
        adapter.to_validation_handoff(compiled)


def test_serialize_round_trips_core_fields():
    adapter = make_adapter()
    compiled = adapter.compile(make_payload(), make_constraints(), make_expectations())

    serialized = ScenarioAdapter.serialize(compiled)

    assert serialized["scenario_id"] == SCENARIO_ID
    assert serialized["payload"]["scenario_id"] == SCENARIO_ID
    assert serialized["constraints"]["hard_limits"]["budget_cap"] == 120000
    assert serialized["expectations"]["success_criteria"] == [
        "Successor named within 14 days"
    ]


def test_serialize_handles_missing_constraints_and_expectations():
    adapter = make_adapter()
    compiled = adapter.compile(make_payload())

    serialized = ScenarioAdapter.serialize(compiled)

    assert serialized["constraints"] is None
    assert serialized["expectations"] is None


# ---------------------------------------------------------------------------
# Negative / failure-injection cases
# ---------------------------------------------------------------------------


def test_compile_rejects_mismatched_constraint_scenario_id():
    adapter = make_adapter()
    with pytest.raises(ArcturusValidationError):
        adapter.compile(make_payload(), make_constraints(scenario_id="SCN-XX-999"))


def test_compile_rejects_mismatched_expectation_scenario_id():
    adapter = make_adapter()
    with pytest.raises(ArcturusValidationError):
        adapter.compile(
            make_payload(), expectations=make_expectations(scenario_id="SCN-XX-999")
        )


def test_compile_rejects_payload_with_no_participants():
    adapter = make_adapter()
    with pytest.raises(ArcturusValidationError):
        adapter.compile(make_payload(participants=[]))


def test_compile_rejects_payload_with_no_organizational_scope():
    adapter = make_adapter()
    with pytest.raises(ArcturusValidationError):
        adapter.compile(make_payload(organizational_scope=[]))


def test_compile_rejects_duplicate_preconditions():
    adapter = make_adapter()
    with pytest.raises(ArcturusValidationError):
        adapter.compile(
            make_payload(preconditions=["Same condition", "same condition "])
        )


def test_compile_rejects_hard_limits_with_non_numeric_value():
    adapter = make_adapter()
    with pytest.raises(ArcturusValidationError):
        adapter.compile(
            make_payload(),
            make_constraints(hard_limits={"budget_cap": "not-a-number"}),
        )


def test_compile_rejects_expectations_with_no_success_criteria():
    adapter = make_adapter()
    with pytest.raises(ArcturusValidationError):
        adapter.compile(
            make_payload(),
            expectations=make_expectations(success_criteria=[]),
        )


def test_to_runtime_dispatch_rejects_undefined_preconditions():
    """Failure-injection: a payload built with an empty preconditions list
    cannot reach to_runtime_dispatch() because compile() already rejects it
    via evaluate_preconditions()."""
    adapter = make_adapter()
    with pytest.raises(ArcturusValidationError):
        adapter.compile(make_payload(preconditions=[]))
