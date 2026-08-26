"""
Tests for Simulation Runtime clock advancement.
"""

from __future__ import annotations

import shutil
from pathlib import Path

import pytest

from ecosystem.applications.arcturus.contracts.shared.base_models import SimulationContext
from ecosystem.applications.arcturus.src.simulation.runtime_engine import RuntimeEngine

CHECKPOINT_DIR = Path("./_test_checkpoints_clock")


@pytest.fixture(autouse=True)
def clean_checkpoints():
    yield
    shutil.rmtree(CHECKPOINT_DIR, ignore_errors=True)


def make_engine() -> RuntimeEngine:
    return RuntimeEngine(checkpoint_root=CHECKPOINT_DIR)


def test_clock_increments_by_one_per_step():
    engine = make_engine()
    ctx = SimulationContext(experiment_id="EXP-CLOCK-001", global_seed=1)
    engine.initialize_run(ctx)

    state1 = engine.step()
    assert state1["clock_step"] == 1

    state2 = engine.step()
    assert state2["clock_step"] == 2

    state3 = engine.step()
    assert state3["clock_step"] == 3


def test_clock_starts_at_zero_before_any_step():
    engine = make_engine()
    ctx = SimulationContext(experiment_id="EXP-CLOCK-002", global_seed=1)
    engine.initialize_run(ctx)
    assert engine._clock_step == 0
