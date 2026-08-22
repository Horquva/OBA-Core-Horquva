"""
Tests for Experiment Contracts (Day 0 / Day 1 foundation).
"""
import pytest
from uuid import uuid4
from contracts.experiment.base_models import (
    ExecutionStatus,
    ExperimentConfig,
    ExperimentRecord,
    SimulationRunRecord,
)


def test_execution_status_enum():
    assert ExecutionStatus.CREATED.value == "CREATED"
    assert ExecutionStatus.INITIALIZING.value == "INITIALIZING"
    assert ExecutionStatus.RUNNING.value == "RUNNING"
    assert ExecutionStatus.PAUSED.value == "PAUSED"
    assert ExecutionStatus.COMPLETED.value == "COMPLETED"
    assert ExecutionStatus.FAILED.value == "FAILED"
    assert ExecutionStatus.BLOCKED.value == "BLOCKED"


def test_experiment_config_defaults():
    config = ExperimentConfig()
    assert config.scenario_id == "default_baseline"
    assert config.global_seed == 42
    assert config.duration_ticks == 100
    assert config.tick_delay_seconds == 0.5
    assert isinstance(config.parameters, dict)


def test_experiment_config_validation():
    with pytest.raises(Exception):
        ExperimentConfig(global_seed=-1)  # seed must be >= 0

    with pytest.raises(Exception):
        ExperimentConfig(duration_ticks=0)  # duration must be >= 1


def test_experiment_record_creation():
    config = ExperimentConfig(scenario_id="techcorp_attrition", global_seed=99, duration_ticks=50)
    record = ExperimentRecord(
        id="exp-001",
        name="Attrition 30% Stress Test",
        seed=99,
        config=config,
    )
    assert record.id == "exp-001"
    assert record.status == ExecutionStatus.CREATED
    assert record.started_at is None
    assert record.completed_at is None


def test_simulation_run_record():
    run_id = uuid4()
    trace_id = uuid4()
    run = SimulationRunRecord(
        run_id=run_id,
        experiment_id="exp-001",
        trace_id=trace_id,
        status=ExecutionStatus.RUNNING,
    )
    assert run.run_id == run_id
    assert run.experiment_id == "exp-001"
    assert run.status == ExecutionStatus.RUNNING
    assert run.ended_at is None
