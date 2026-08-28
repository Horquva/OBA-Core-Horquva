"""
Day 6 failure-engineering tests for the Simulation Runtime.
Covers mid-simulation crash recovery and clock-overflow protection.
"""

from __future__ import annotations

import shutil
from pathlib import Path

import pytest

from ecosystem.applications.arcturus.contracts.shared.base_models import SimulationContext
from ecosystem.applications.arcturus.contracts.shared.errors import BusinessRuleViolation, IntegrationFailure
from ecosystem.applications.arcturus.src.simulation.checkpoint_store import CheckpointStore
from ecosystem.applications.arcturus.src.simulation.runtime_engine import RuntimeEngine

CHECKPOINT_DIR = Path("./_test_checkpoints_failures")


@pytest.fixture(autouse=True)
def clean_checkpoints():
    yield
    shutil.rmtree(CHECKPOINT_DIR, ignore_errors=True)


def make_engine(max_ticks: int | None = None) -> RuntimeEngine:
    return RuntimeEngine(checkpoint_root=CHECKPOINT_DIR, max_ticks=max_ticks)


def test_mid_simulation_crash_can_be_recovered_via_checkpoint():
    ctx = SimulationContext(experiment_id="EXP-FAIL-001", global_seed=11)

    live_engine = make_engine()
    live_engine.initialize_run(ctx)
    live_engine.step()
    live_engine.step()
    live_engine.step()

    del live_engine  # simulate crash: process dies, only checkpoint survives

    store = CheckpointStore(root=CHECKPOINT_DIR)
    last_good_state = store.load_latest(ctx.run_id)
    assert last_good_state["clock_step"] == 3

    recovered_engine = make_engine()
    recovered_engine.restore_from_checkpoint(ctx, last_good_state)
    assert recovered_engine.status.value == "initialized"

    next_state = recovered_engine.step()
    assert next_state["clock_step"] == 4

    record = recovered_engine.finalize_run()
    assert record.status.value == "completed"


def test_restore_fails_honestly_when_no_checkpoint_exists():
    ctx = SimulationContext(experiment_id="EXP-FAIL-002", global_seed=5)
    store = CheckpointStore(root=CHECKPOINT_DIR)

    with pytest.raises(IntegrationFailure):
        store.load_latest(ctx.run_id)


def test_clock_overflow_is_rejected_not_silently_ignored():
    engine = make_engine(max_ticks=3)
    ctx = SimulationContext(experiment_id="EXP-FAIL-003", global_seed=1)
    engine.initialize_run(ctx)

    engine.step()
    engine.step()
    engine.step()

    with pytest.raises(BusinessRuleViolation):
        engine.step()


def test_engine_without_max_ticks_is_unbounded_by_default():
    engine = make_engine()
    ctx = SimulationContext(experiment_id="EXP-FAIL-004", global_seed=1)
    engine.initialize_run(ctx)

    for _ in range(50):
        engine.step()

    assert engine._clock_step == 50
