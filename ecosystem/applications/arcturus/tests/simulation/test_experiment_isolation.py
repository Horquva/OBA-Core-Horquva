"""
Tests verifying isolation between concurrent/independent simulation runs.
"""

from __future__ import annotations

import shutil
from pathlib import Path

import pytest

from ecosystem.applications.arcturus.contracts.shared.base_models import SimulationContext
from ecosystem.applications.arcturus.src.simulation.checkpoint_store import CheckpointStore
from ecosystem.applications.arcturus.src.simulation.runtime_engine import RuntimeEngine

CHECKPOINT_DIR = Path("./_test_checkpoints_isolation")


@pytest.fixture(autouse=True)
def clean_checkpoints():
    yield
    shutil.rmtree(CHECKPOINT_DIR, ignore_errors=True)


def make_engine() -> RuntimeEngine:
    return RuntimeEngine(checkpoint_root=CHECKPOINT_DIR)


def test_two_experiments_do_not_share_engine_state():
    ctx_a = SimulationContext(experiment_id="EXP-ISO-A", global_seed=1, config={"label": "A"})
    ctx_b = SimulationContext(experiment_id="EXP-ISO-B", global_seed=2, config={"label": "B"})

    engine_a = make_engine()
    engine_b = make_engine()
    engine_a.initialize_run(ctx_a)
    engine_b.initialize_run(ctx_b)

    engine_a.step()
    engine_a.step()
    state_b = engine_b.step()

    assert state_b["clock_step"] == 1
    assert engine_a._clock_step == 2
    assert engine_a._context.run_id != engine_b._context.run_id


def test_checkpoints_for_different_runs_do_not_collide():
    ctx_a = SimulationContext(experiment_id="EXP-ISO-C", global_seed=1)
    ctx_b = SimulationContext(experiment_id="EXP-ISO-D", global_seed=2)

    engine_a = make_engine()
    engine_b = make_engine()
    engine_a.initialize_run(ctx_a)
    engine_b.initialize_run(ctx_b)

    engine_a.step()
    engine_b.step()
    engine_b.step()

    store = CheckpointStore(root=CHECKPOINT_DIR)
    latest_a = store.load_latest(ctx_a.run_id)
    latest_b = store.load_latest(ctx_b.run_id)

    assert latest_a["clock_step"] == 1
    assert latest_b["clock_step"] == 2
