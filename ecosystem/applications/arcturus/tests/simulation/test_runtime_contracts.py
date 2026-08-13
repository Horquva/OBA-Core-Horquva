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
    ScenarioDSLPayload,
)
from ecosystem.applications.arcturus.contracts.synthetic_data.base_models import (
    SyntheticArtifactContract,
    SyntheticGenerationResult,
)
from ecosystem.applications.arcturus.src.simulation.runtime_adapters import (
    build_experiment_result_package,
    build_simulation_context,
)
from ecosystem.applications.arcturus.src.simulation.runtime_engine import RuntimeEngine

CHECKPOINT_DIR = Path("./_test_checkpoints")


@pytest.fixture(autouse=True)
def clean_checkpoints():
    yield
    shutil.rmtree(CHECKPOINT_DIR, ignore_errors=True)


def make_engine() -> RuntimeEngine:
    return RuntimeEngine(checkpoint_root=CHECKPOINT_DIR)


def _make_synthetic_result(context: SimulationContext) -> SyntheticGenerationResult:
    return SyntheticGenerationResult(
        context=context,
        artifacts=[
            SyntheticArtifactContract(
                artifact_id="ART-1",
                artifact_type="employee",
                lifecycle_state="active",
                created_at=context.created_at,
                provenance={"source": "test"},
            )
        ],
        deterministic_fingerprint="fp-test-001",
    )


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


def test_initialize_run_rejects_mismatched_synthetic_context():
    engine = make_engine()
    ctx = SimulationContext(experiment_id="EXP-TEST-005", global_seed=1)
    other_ctx = SimulationContext(experiment_id="EXP-TEST-006", global_seed=2)
    mismatched_result = _make_synthetic_result(other_ctx)

    with pytest.raises(BusinessRuleViolation):
        engine.initialize_run(ctx, synthetic_result=mismatched_result)


def test_build_simulation_context_from_scenario():
    scenario = ScenarioDSLPayload(scenario_id="SCN-AB-001", seed=42)
    ctx = build_simulation_context(scenario)
    assert ctx.experiment_id == "SCN-AB-001"
    assert ctx.global_seed == 42


def test_build_experiment_result_package_from_run():
    engine = make_engine()
    ctx = SimulationContext(experiment_id="EXP-TEST-007", global_seed=3)
    engine.initialize_run(ctx)
    engine.step()
    record = engine.finalize_run()

    package = build_experiment_result_package(
        context=ctx,
        run_history=record,
        state_snapshot={"last_step_at": "irrelevant"},
        checkpoint_refs=["chk-1"],
    )
    assert package.context.run_id == ctx.run_id
    assert package.final_status == ExecutionStatus.COMPLETED