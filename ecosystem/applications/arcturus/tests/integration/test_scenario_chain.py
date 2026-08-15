"""
Day 5 integration tests — scenario_chain.run_scenario_chain()
Owner: Maryam Yaqoob (Scenario Engineering Platform)

Verifies the Day 5 chain wrapper correctly reuses ScenarioAdapter/
ScenarioEngine (Days 1-4) and produces the outbound payload shapes
consumed downstream: "runtime_dispatch" (Maaz) and "validation_handoff"
(Amina, only when `expectations` is supplied).
"""

import pytest

from ecosystem.applications.arcturus.contracts.control.scenarios.base_models import (
    ScenarioConstraintContract,
    ScenarioDSLPayload,
    ScenarioExpectationContract,
)
from ecosystem.applications.arcturus.contracts.shared.base_models import (
    ArcturusValidationError,
    SimulationContext,
)
from ecosystem.applications.arcturus.src.integration.scenario_chain import (
    run_scenario_chain,
)


# ---------------------------------------------------------------------------
# Fixtures / helpers
# ---------------------------------------------------------------------------

def create_context(**overrides):
    base = dict(experiment_id="EXP-SCN-CHAIN-001", global_seed=42)
    base.update(overrides)
    return SimulationContext(**base)


def create_payload(context, **overrides):
    base = dict(
        context=context,
        scenario_id="SCN-WF-004",
        description="A department-wide restructuring event",
        trigger_event="org_restructure",
        participants=["Executive", "HR Lead"],
        organizational_scope=["Leadership", "Governance"],
        preconditions=["min_agents >= 3"],
        variables={"headcount": 25, "budget_usd": 500000},
    )
    base.update(overrides)
    return ScenarioDSLPayload(**base)


def create_constraints(context, **overrides):
    base = dict(
        context=context,
        scenario_id="SCN-WF-004",
        constraints=["Notice period fixed at 30 days"],
        hard_limits={"budget_cap": 600000},
    )
    base.update(overrides)
    return ScenarioConstraintContract(**base)


def create_expectations(context, **overrides):
    base = dict(
        context=context,
        scenario_id="SCN-WF-004",
        success_criteria=["Transition completed on time"],
        failure_conditions=["Missed deadline"],
        expected_outcomes=["Stable org chart"],
        metrics=["recovery time"],
        termination_conditions=["All roles reassigned"],
    )
    base.update(overrides)
    return ScenarioExpectationContract(**base)


# ---------------------------------------------------------------------------
# run_scenario_chain — happy paths
# ---------------------------------------------------------------------------

def test_returns_scenario_id_and_fingerprint():
    context = create_context()
    payload = create_payload(context)

    result = run_scenario_chain(payload)

    assert result["scenario_id"] == "SCN-WF-004"
    assert isinstance(result["fingerprint"], str)
    assert len(result["fingerprint"]) == 64  # sha256 hex digest


def test_payload_only_produces_runtime_dispatch_without_validation_handoff():
    context = create_context()
    payload = create_payload(context)

    result = run_scenario_chain(payload)

    assert "runtime_dispatch" in result
    assert "validation_handoff" not in result


def test_runtime_dispatch_contains_expected_fields():
    context = create_context()
    payload = create_payload(context)
    constraints = create_constraints(context)

    result = run_scenario_chain(payload, constraints=constraints)

    dispatch = result["runtime_dispatch"]
    assert dispatch["scenario_id"] == "SCN-WF-004"
    assert dispatch["trigger_event"] == "org_restructure"
    assert dispatch["participants"] == ["Executive", "HR Lead"]
    assert dispatch["organizational_scope"] == ["Leadership", "Governance"]
    assert dispatch["preconditions"] == ["min_agents >= 3"]
    assert dispatch["variables"] == {"headcount": 25, "budget_usd": 500000}
    assert dispatch["constraints"] == ["Notice period fixed at 30 days"]
    assert dispatch["hard_limits"] == {"budget_cap": 600000}


def test_runtime_dispatch_without_constraints_has_empty_constraint_fields():
    context = create_context()
    payload = create_payload(context)

    result = run_scenario_chain(payload)

    dispatch = result["runtime_dispatch"]
    assert dispatch["constraints"] == []
    assert dispatch["hard_limits"] == {}


def test_expectations_supplied_adds_validation_handoff():
    context = create_context()
    payload = create_payload(context)
    expectations = create_expectations(context)

    result = run_scenario_chain(payload, expectations=expectations)

    assert "validation_handoff" in result
    handoff = result["validation_handoff"]
    assert handoff["scenario_id"] == "SCN-WF-004"
    assert handoff["success_criteria"] == ["Transition completed on time"]
    assert handoff["failure_conditions"] == ["Missed deadline"]
    assert handoff["expected_outcomes"] == ["Stable org chart"]
    assert handoff["metrics"] == ["recovery time"]
    assert handoff["termination_conditions"] == ["All roles reassigned"]
    assert handoff["fingerprint"] == result["fingerprint"]


def test_full_contract_set_produces_both_outbound_payloads():
    context = create_context()
    payload = create_payload(context)
    constraints = create_constraints(context)
    expectations = create_expectations(context)

    result = run_scenario_chain(
        payload, constraints=constraints, expectations=expectations
    )

    assert "runtime_dispatch" in result
    assert "validation_handoff" in result
    assert (
        result["runtime_dispatch"]["fingerprint"]
        == result["validation_handoff"]["fingerprint"]
        == result["fingerprint"]
    )


def test_fingerprint_is_deterministic_for_identical_inputs():
    context = create_context()

    result_a = run_scenario_chain(create_payload(context))
    result_b = run_scenario_chain(create_payload(context))

    assert result_a["fingerprint"] == result_b["fingerprint"]


def test_fingerprint_changes_when_variables_change():
    context = create_context()

    result_a = run_scenario_chain(create_payload(context))
    result_b = run_scenario_chain(
        create_payload(context, variables={"headcount": 99, "budget_usd": 500000})
    )

    assert result_a["fingerprint"] != result_b["fingerprint"]


# ---------------------------------------------------------------------------
# run_scenario_chain — error propagation from ScenarioEngine
# ---------------------------------------------------------------------------

def test_raises_on_empty_participants():
    context = create_context()
    payload = create_payload(context, participants=[])

    with pytest.raises(ArcturusValidationError):
        run_scenario_chain(payload)


def test_raises_on_empty_organizational_scope():
    context = create_context()
    payload = create_payload(context, organizational_scope=[])

    with pytest.raises(ArcturusValidationError):
        run_scenario_chain(payload)


def test_raises_on_scenario_id_mismatch_with_constraints():
    context = create_context()
    payload = create_payload(context)
    constraints = create_constraints(context, scenario_id="SCN-WF-999")

    with pytest.raises(ArcturusValidationError):
        run_scenario_chain(payload, constraints=constraints)


def test_raises_on_scenario_id_mismatch_with_expectations():
    context = create_context()
    payload = create_payload(context)
    expectations = create_expectations(context, scenario_id="SCN-WF-999")

    with pytest.raises(ArcturusValidationError):
        run_scenario_chain(payload, expectations=expectations)


def test_raises_on_contradictory_success_and_failure_criteria():
    context = create_context()
    payload = create_payload(context)
    expectations = create_expectations(
        context,
        success_criteria=["Deadline met"],
        failure_conditions=["Deadline met"],
    )

    with pytest.raises(ArcturusValidationError):
        run_scenario_chain(payload, expectations=expectations)


def test_raises_on_variable_exceeding_hard_limit():
    context = create_context()
    payload = create_payload(context, variables={"budget_usd": 700000})
    constraints = create_constraints(
        context, hard_limits={"budget_usd": 600000}
    )

    with pytest.raises(ArcturusValidationError):
        run_scenario_chain(payload, constraints=constraints)
