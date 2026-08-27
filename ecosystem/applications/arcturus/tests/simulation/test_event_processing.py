"""
Tests for Simulation Runtime tick-level event processing.
"""

from __future__ import annotations

import shutil
from datetime import datetime
from pathlib import Path

import pytest
from pydantic import ValidationError

from ecosystem.applications.arcturus.contracts.shared.base_models import SimulationContext
from ecosystem.applications.arcturus.contracts.simulation.base_models import SimulationEventStream
from ecosystem.applications.arcturus.src.simulation.runtime_engine import RuntimeEngine

CHECKPOINT_DIR = Path("./_test_checkpoints_events")


@pytest.fixture(autouse=True)
def clean_checkpoints():
    yield
    shutil.rmtree(CHECKPOINT_DIR, ignore_errors=True)


def make_engine() -> RuntimeEngine:
    return RuntimeEngine(checkpoint_root=CHECKPOINT_DIR)


def test_successive_ticks_are_processed_in_increasing_order():
    engine = make_engine()
    ctx = SimulationContext(experiment_id="EXP-EVENT-001", global_seed=5)
    engine.initialize_run(ctx)

    ticks = [engine.step()["clock_step"] for _ in range(5)]
    assert ticks == sorted(ticks)
    assert ticks == [1, 2, 3, 4, 5]


def test_last_step_at_timestamps_are_non_decreasing():
    engine = make_engine()
    ctx = SimulationContext(experiment_id="EXP-EVENT-002", global_seed=5)
    engine.initialize_run(ctx)

    timestamps = []
    for _ in range(3):
        state = engine.step()
        timestamps.append(datetime.fromisoformat(state["last_step_at"]))

    assert timestamps == sorted(timestamps)


def test_simulation_event_stream_rejects_unknown_event_type():
    ctx = SimulationContext(experiment_id="EXP-EVENT-003", global_seed=1)
    with pytest.raises(ValidationError):
        SimulationEventStream(
            event_type="UNKNOWN_TYPE",
            experiment_id=ctx.experiment_id,
            run_id=ctx.run_id,
        )


def test_simulation_event_stream_accepts_valid_tick_event():
    ctx = SimulationContext(experiment_id="EXP-EVENT-004", global_seed=1)
    event = SimulationEventStream(
        event_type="TICK",
        experiment_id=ctx.experiment_id,
        run_id=ctx.run_id,
        tick=1,
        payload={"clock_step": 1},
    )
    assert event.event_type == "TICK"
    assert event.tick == 1
