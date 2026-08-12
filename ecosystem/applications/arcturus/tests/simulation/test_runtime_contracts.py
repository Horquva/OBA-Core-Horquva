"""
Tests for the Simulation Runtime & Experiment Platform.
"""

from __future__ import annotations

import shutil
from pathlib import Path

import pytest
from pydantic import ValidationError

from ecosystem.applications.arcturus.contracts.shared.base_models import SimulationContext
from ecosystem.applications.arcturus.contracts.shared.errors import BusinessRuleViolation
from ecosystem.applications.arcturus.contracts.simulation.base_models import (
    CapabilityDependencyGraph,
    ExecutionStatus,
)
from ecosystem.applications.arcturus.src.simulation.runtime_engine import RuntimeEngine

CHECKPOINT_DIR = Path("./_test_checkpoints")


@pytest.fixture(autouse=True)
def clean_checkpoints():
    yield
    shutil.rmtree(CHECKPOINT_DIR, ignore_errors=True)


def make_engine() -> RuntimeEngine:
    return RuntimeEngine(checkpoint_root=CHECKPOINT_DIR)


def test_full_lifecycle_produces_completed_record():
    engine = make_engine()
    ctx = SimulationContext(experiment_id="EXP-TEST-001", global_seed=7)

    engine.initialize_run(ctx)
    assert engine.status == ExecutionStatus.INITIALIZED

    engine.step()
    engine.step()
    assert engine.status == ExecutionStatus.RUNNING

    record = engine.finalize_run()
    assert record.status == ExecutionStatus.COMPLETED
    assert record.run_id == ctx.run_id
    assert record.seed == 7
    assert record.ended_at >= record.started_at


def test_same_seed_produces_same_config_snapshot():
    ctx_a = SimulationContext(experiment_id="EXP-TEST-002", global_seed=99, config={"x": 1})
    ctx_b = SimulationContext(experiment_id="EXP-TEST-002", global_seed=99, config={"x": 1})

    engine_a, engine_b = make_engine(), make_engine()
    engine_a.initialize_run(ctx_a)
    engine_b.initialize_run(ctx_b)
    engine_a.step()
    engine_b.step()

    record_a = engine_a.finalize_run()
    record_b = engine_b.finalize_run()
    assert record_a.seed == record_b.seed == 99
    assert record_a.config == record_b.config == {"x": 1}


def test_step_before_initialize_raises_business_rule_violation():
    engine = make_engine()
    with pytest.raises(BusinessRuleViolation):
        engine.step()


def test_finalize_before_initialize_raises_business_rule_violation():
    engine = make_engine()
    with pytest.raises(BusinessRuleViolation):
        engine.finalize_run()


def test_double_initialize_raises_business_rule_violation():
    engine = make_engine()
    ctx = SimulationContext(experiment_id="EXP-TEST-003", global_seed=1)
    engine.initialize_run(ctx)
    with pytest.raises(BusinessRuleViolation):
        engine.initialize_run(ctx)


def test_invalid_seed_rejected_by_schema():
    with pytest.raises(ValidationError):
        SimulationContext(experiment_id="EXP-TEST-004", global_seed=-5)


def test_cyclic_dependency_graph_rejected():
    with pytest.raises(ValidationError):
        CapabilityDependencyGraph(
            nodes=["A", "B", "C"],
            edges=[("A", "B"), ("B", "C"), ("C", "A")],
        )