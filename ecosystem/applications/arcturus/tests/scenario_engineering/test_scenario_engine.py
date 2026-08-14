"""
Day 2 tests — ScenarioEngine (compile_scenario, evaluate_preconditions, build_expected_outcome)

Reconciled against the real, merged contract split (contracts/control/scenarios/base_models.py):
the 13-field DSL is split across three separate contracts, not one flat payload:
  - ScenarioDSLPayload:          identity, trigger, participants, scope, preconditions, variables
  - ScenarioConstraintContract:  constraints, hard_limits
  - ScenarioExpectationContract: success_criteria, failure_conditions, expected_outcomes,
                                  metrics, termination_conditions

compile_scenario(payload, constraints=None, expectations=None) and
build_expected_outcome(payload, expectations) both take the split contracts directly, matching
scenario_adapters.py's real usage.
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
from ecosystem.applications.arcturus.src.scenario_engineering.scenario_engine import (
    ScenarioEngine,
)


# ---------------------------------------------------------------------------
# Fixtures / helpers
# ---------------------------------------------------------------------------

def make_context(**overrides):
    base = dict(experiment_id="EXP-SCN-DEPT-001", global_seed=42)
    base.update(overrides)
    return SimulationContext(**base)


def make_payload(**overrides):
    base = dict(
        context=make_context(),
        scenario_id="SCN-DE-001",
        description="Engineering department expands hiring capacity",
        trigger_event="department_expansion_triggered",
        participants=["engineering_department"],
        organizational_scope=["engineering_department"],
        preconditions=["department_exists", "budget_available"],
        variables={"hiring_rate": 0.15, "budget_increase_pct": 0.10},
    )
    base.update(overrides)
    return ScenarioDSLPayload(**base)


def make_constraints(**overrides):
    base = dict(
        context=make_context(),
        scenario_id="SCN-DE-001",
        constraints=["hiring_capacity_limit"],
        hard_limits={"hiring_rate": 1.0},
    )
    base.update(overrides)
    return ScenarioConstraintContract(**base)


def make_expectations(**overrides):
    base = dict(
        context=make_context(),
        scenario_id="SCN-DE-001",
        success_criteria=["headcount_target_met"],
        failure_conditions=["budget_exceeded"],
        expected_outcomes=["increased_team_capacity"],
        metrics=["headcount", "budget_utilization"],
        termination_conditions=["target_headcount_reached", "budget_exhausted"],
    )
    base.update(overrides)
    return ScenarioExpectationContract(**base)


@pytest.fixture
def valid_payload():
    return make_payload()


@pytest.fixture
def valid_constraints():
    return make_constraints()


@pytest.fixture
def valid_expectations():
    return make_expectations()


# ---------------------------------------------------------------------------
# compile_scenario()
# ---------------------------------------------------------------------------

class TestCompileScenario:
    def test_compiles_valid_payload_successfully(self, valid_payload, valid_constraints, valid_expectations):
        engine = ScenarioEngine()
        result = engine.compile_scenario(valid_payload, valid_constraints, valid_expectations)
        assert result is not None

    def test_fingerprint_is_deterministic_for_identical_payload(self):
        engine = ScenarioEngine()
        result_a = engine.compile_scenario(make_payload())
        result_b = engine.compile_scenario(make_payload())
        assert result_a.fingerprint == result_b.fingerprint

    def test_fingerprint_changes_when_variables_change(self, valid_payload):
        engine = ScenarioEngine()
        result_a = engine.compile_scenario(valid_payload)
        changed_payload = make_payload(variables={"hiring_rate": 0.30, "budget_increase_pct": 0.10})
        result_b = engine.compile_scenario(changed_payload)
        assert result_a.fingerprint != result_b.fingerprint

    def test_fingerprint_is_sha256_hex_format(self, valid_payload):
        engine = ScenarioEngine()
        result = engine.compile_scenario(valid_payload)
        assert isinstance(result.fingerprint, str)
        assert len(result.fingerprint) == 64
        int(result.fingerprint, 16)  # raises ValueError if not valid hex

    def test_rejects_missing_required_field(self):
        with pytest.raises((ArcturusValidationError, TypeError, ValueError)):
            payload = make_payload(description=None)
            ScenarioEngine().compile_scenario(payload)

    def test_rejects_malformed_scenario_id(self):
        """
        scenario_id pattern (^SCN-[A-Z]{2}-\\d{3}$) is enforced at the
        pydantic schema layer itself, before the engine ever sees the
        payload — so this raises at construction, not inside compile_scenario().
        """
        with pytest.raises(Exception):  # pydantic ValidationError
            make_payload(scenario_id="SCN-DEPT-EXPANSION-001")

    def test_cross_validates_constraint_and_expectation_contracts(self, valid_payload):
        # A scenario whose failure_conditions directly contradict success_criteria
        # should fail cross-validation, not silently compile. This is purely an
        # expectations-internal check (constraints aren't involved).
        with pytest.raises(ArcturusValidationError):
            expectations = make_expectations(
                success_criteria=["headcount_target_met"],
                failure_conditions=["headcount_target_met"],
            )
            ScenarioEngine().compile_scenario(valid_payload, expectations=expectations)


# ---------------------------------------------------------------------------
# evaluate_preconditions() — structural validation only, no ontology check
# ---------------------------------------------------------------------------

class TestEvaluatePreconditions:
    def test_valid_preconditions_pass(self, valid_payload):
        engine = ScenarioEngine()
        result = engine.evaluate_preconditions(valid_payload)
        assert result is not None

    def test_empty_preconditions_rejected(self):
        with pytest.raises(ArcturusValidationError):
            payload = make_payload(preconditions=[])
            ScenarioEngine().evaluate_preconditions(payload)

    def test_duplicate_preconditions_rejected(self):
        with pytest.raises(ArcturusValidationError):
            payload = make_payload(
                preconditions=["department_exists", "department_exists"]
            )
            ScenarioEngine().evaluate_preconditions(payload)

    def test_does_not_perform_ontology_entity_existence_check(self, monkeypatch):
        """
        Per Day 2 scope note: entity-existence resolution against the real
        Ontology/Enterprise contracts is deferred to Day 6-7 adapter integration.
        A precondition referencing a nonexistent department should still pass
        *structural* validation at this stage.
        """
        payload = make_payload(preconditions=["department_exists_but_totally_fake_dept"])
        engine = ScenarioEngine()
        result = engine.evaluate_preconditions(payload)
        assert result is not None


# ---------------------------------------------------------------------------
# build_expected_outcome() — assembly only, no scoring (Amina's boundary)
# ---------------------------------------------------------------------------

class TestBuildExpectedOutcome:
    def test_assembles_expectation_view(self, valid_payload, valid_expectations):
        engine = ScenarioEngine()
        outcome_view = engine.build_expected_outcome(valid_payload, valid_expectations)
        assert outcome_view is not None

    def test_does_not_assign_a_quality_or_success_score(self, valid_payload, valid_expectations):
        """
        Scenario Quality Scoring belongs to a later part / Validation platform
        (Amina's boundary) — build_expected_outcome must not attach a numeric
        score or verdict.
        """
        engine = ScenarioEngine()
        outcome_view = engine.build_expected_outcome(valid_payload, valid_expectations)
        forbidden_keys = {"score", "quality_score", "validation_score", "verdict"}
        if isinstance(outcome_view, dict):
            assert forbidden_keys.isdisjoint(outcome_view.keys())
        else:
            for key in forbidden_keys:
                assert not hasattr(outcome_view, key)

    def test_includes_expected_outcomes_and_metrics_from_payload(self, valid_payload, valid_expectations):
        engine = ScenarioEngine()
        outcome_view = engine.build_expected_outcome(valid_payload, valid_expectations)
        rendered = str(outcome_view)
        assert "increased_team_capacity" in rendered or "headcount" in rendered


# ---------------------------------------------------------------------------
# Invalid scenario handling (Part-7 style: reject safely, not silently pass)
# ---------------------------------------------------------------------------

class TestInvalidScenarioRejection:
    def test_conflicting_constraints_rejected(self, valid_payload):
        # hard_limits caps hiring_rate at 1.0; a variable value of 999.0
        # blows straight through that cap and must be rejected.
        with pytest.raises(ArcturusValidationError):
            payload = make_payload(variables={"hiring_rate": 999.0, "budget_increase_pct": 0.10})
            constraints = make_constraints(hard_limits={"hiring_rate": 1.0})
            ScenarioEngine().compile_scenario(payload, constraints=constraints)

    def test_missing_termination_conditions_rejected(self, valid_payload):
        with pytest.raises(ArcturusValidationError):
            expectations = make_expectations(termination_conditions=[])
            ScenarioEngine().compile_scenario(valid_payload, expectations=expectations)
