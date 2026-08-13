"""
Day 4 — Failure Injection tests for the Validation & Evaluation Platform.

These tests intentionally feed the ValidationEngine and its contracts bad,
missing, or malformed data, and confirm the system fails safely — either by
raising a clear ValidationError (Pydantic) or by returning an explicit
rejection reason rather than crashing or silently accepting garbage.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from ecosystem.applications.arcturus.contracts.shared.base_models import SimulationContext
from ecosystem.applications.arcturus.contracts.evaluation.base_models import (
    EvidenceContract,
    ValidationRun,
)
from ecosystem.applications.arcturus.src.evaluation_plane.validation_engine import ValidationEngine


@pytest.fixture
def context() -> SimulationContext:
    return SimulationContext(experiment_id="exp-neg-001", global_seed=1)


@pytest.fixture
def engine() -> ValidationEngine:
    return ValidationEngine()


# ---------------------------------------------------------------------------
# 1. SCHEMA-LEVEL FAILURES — Pydantic should reject these before they ever
#    reach the ValidationEngine.
# ---------------------------------------------------------------------------

def test_evidence_contract_rejects_missing_observed_value(context):
    """observed_value is required — missing it must raise a ValidationError."""
    with pytest.raises(ValidationError):
        EvidenceContract(
            context=context,
            source_execution_id="exp-neg-001",
            # observed_value intentionally omitted
        )


def test_evidence_contract_rejects_missing_context():
    """context is required — missing it must raise a ValidationError."""
    with pytest.raises(ValidationError):
        EvidenceContract(
            source_execution_id="exp-neg-001",
            observed_value=10,
        )


def test_simulation_context_rejects_missing_experiment_id():
    """experiment_id is required on SimulationContext."""
    with pytest.raises(ValidationError):
        SimulationContext(global_seed=1)


# ---------------------------------------------------------------------------
# 2. ENGINE-LEVEL FAILURES — evidence that is technically valid (passes
#    Pydantic) but is missing, empty, or malformed in ways the engine
#    itself must handle gracefully.
# ---------------------------------------------------------------------------

def test_logic_rule_handles_non_numeric_observed_value(context, engine):
    """
    observed_value with no extractable number should not crash — it should
    pass by default, since there is nothing numeric to evaluate.
    """
    evidence = EvidenceContract(
        context=context,
        source_execution_id="exp-neg-001",
        observed_value={"final_status": "completed"},  # no numeric field
        expected_value=10,
    )
    passed, reason = engine.evaluate_logic_rule(evidence)
    assert passed is True
    assert "no numeric value" in reason.lower()


def test_logic_rule_handles_none_observed_value(context, engine):
    """observed_value=None must not crash the engine."""
    evidence = EvidenceContract(
        context=context,
        source_execution_id="exp-neg-001",
        observed_value=None,
        expected_value=10,
    )
    passed, reason = engine.evaluate_logic_rule(evidence)
    assert passed is True  # nothing to evaluate, fails safe rather than crashing


def test_logic_rule_handles_expected_value_of_zero(context, engine):
    """
    expected_value=0 would normally cause a divide-by-zero in a percentage
    calculation — engine must guard against this explicitly.
    """
    evidence = EvidenceContract(
        context=context,
        source_execution_id="exp-neg-001",
        observed_value=50,
        expected_value=0,
    )
    passed, reason = engine.evaluate_logic_rule(evidence)
    assert passed is True
    assert "zero" in reason.lower()


def test_logic_rule_flags_extreme_value_with_no_expectation(context, engine):
    """
    No expected_value at all, but an absurdly large observed value —
    engine should still catch this via the absolute-scale fallback check.
    """
    evidence = EvidenceContract(
        context=context,
        source_execution_id="exp-neg-001",
        observed_value=50000,
        expected_value=None,
    )
    passed, reason = engine.evaluate_logic_rule(evidence)
    assert passed is False
    assert "far beyond" in reason.lower()


def test_consistency_rule_handles_related_values_not_a_dict(context, engine):
    """
    related_values should be a dict of {label: number}. If it's malformed
    (e.g. a list instead), the engine must not crash.
    """
    evidence = EvidenceContract(
        context=context,
        source_execution_id="exp-neg-001",
        observed_value={"related_values": ["not", "a", "dict"]},
    )
    passed, reason = engine.evaluate_consistency_rule(evidence)
    assert passed is True  # malformed related_values -> check skipped safely
    assert "skipped" in reason.lower()


def test_consistency_rule_handles_single_related_value(context, engine):
    """A single related value has nothing to compare against — must pass safely."""
    evidence = EvidenceContract(
        context=context,
        source_execution_id="exp-neg-001",
        observed_value={"related_values": {"department_a": 5.0}},
    )
    passed, reason = engine.evaluate_consistency_rule(evidence)
    assert passed is True
    assert "skipped" in reason.lower()


def test_consistency_rule_catches_contradictory_directions(context, engine):
    """Sanity check: this is the known-bad case that MUST fail."""
    evidence = EvidenceContract(
        context=context,
        source_execution_id="exp-neg-001",
        observed_value={
            "related_values": {"department_a": 5.0, "department_b": -3.0}
        },
    )
    passed, reason = engine.evaluate_consistency_rule(evidence)
    assert passed is False
    assert "contradictory" in reason.lower()


# ---------------------------------------------------------------------------
# 3. FULL PIPELINE FAILURE — run_validation() must produce a structured
#    'rejected' result, never an unhandled exception, when evidence fails.
# ---------------------------------------------------------------------------

def test_run_validation_rejects_cleanly_on_bad_evidence(context, engine):
    evidence = EvidenceContract(
        context=context,
        source_execution_id="exp-neg-001",
        observed_value={
            "productivity_change": 500,
            "related_values": {"department_a": 5.0, "department_b": -3.0},
        },
        expected_value=10,
    )
    run = ValidationRun(context=context, evidence=evidence)

    result = engine.run_validation(run)

    assert result.final_status == "rejected"
    assert "logic_check" in result.failed_rules
    assert "internal_consistency_check" in result.failed_rules
    assert result.reason  # must always explain why, never blank