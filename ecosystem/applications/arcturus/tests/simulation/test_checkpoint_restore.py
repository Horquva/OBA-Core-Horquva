"""
Tests for Simulation Runtime checkpoint save/restore.
"""

from __future__ import annotations

import shutil
from pathlib import Path

import pytest

from ecosystem.applications.arcturus.contracts.shared.base_models import SimulationContext
from ecosystem.applications.arcturus.contracts.shared.errors import BusinessRuleViolation
from ecosystem.applications.arcturus.src.simulation.checkpoint_store import CheckpointStore
from ecosystem.applications.arcturus.src.simulation.runtime_engine import RuntimeEngine

CHECKPOINT_DIR = Path("./_test_checkpoints_restore")


@pytest.fixture(autouse=True)
def clean_checkpoints():
    yield
    shutil.rmtree(CHECKPOINT_DIR, ignore_errors=True)


def make_engine() -> RuntimeEngine:
    return RuntimeEngine(checkpoint_root=CHECKPOINT_DIR)


def test_restore_from_latest_checkpoint_matches_original_state():
    ctx = SimulationContext(experiment_id="EXP-RESTORE-001", global_seed=7)

    original_engine = make_engine()
    original_engine.initialize_run(ctx)
    original_engine.step()
    original_engine.step()
    saved_state = original_engine.step()

    store = CheckpointStore(root=CHECKPOINT_DIR)
    latest = store.load_latest(ctx.run_id)
    assert latest == saved_state

    restored_engine = make_engine()
    restored_engine.restore_from_checkpoint(ctx, latest)

    assert restored_engine._clock_step == saved_state["clock_step"] == 3
    assert restored_engine.status.value == "initialized"

    next_state = restored_engine.step()
    assert next_state["clock_step"] == 4


def test_rollback_to_earlier_step_restores_older_state():
    ctx = SimulationContext(experiment_id="EXP-RESTORE-002", global_seed=3)

    engine = make_engine()
    engine.initialize_run(ctx)
    engine.step()
    step2_state = engine.step()
    engine.step()

    store = CheckpointStore(root=CHECKPOINT_DIR)
    rolled_back = store.rollback_to(ctx.run_id, step=2)
    assert rolled_back == step2_state
    assert rolled_back["clock_step"] == 2


def test_restore_from_checkpoint_rejects_non_created_engine():
    ctx = SimulationContext(experiment_id="EXP-RESTORE-003", global_seed=1)
    engine = make_engine()
    engine.initialize_run(ctx)

    with pytest.raises(BusinessRuleViolation):
        engine.restore_from_checkpoint(ctx, {"clock_step": 0})
