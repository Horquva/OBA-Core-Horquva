from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field

from contracts.shared.base_models import SimulationContext


class ExecutionStatus(str, Enum):
    """Execution lifecycle status across the Arcturus platform."""
    CREATED = "CREATED"
    INITIALIZING = "INITIALIZING"
    RUNNING = "RUNNING"
    PAUSED = "PAUSED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    BLOCKED = "BLOCKED"


class ExperimentConfig(BaseModel):
    """
    Configuration parameters defining an overarching simulation experiment.
    """
    scenario_id: str = Field(default="default_baseline", description="Identifier of the scenario template to execute")
    global_seed: int = Field(default=42, ge=0, description="Deterministic seed for reproducibility")
    duration_ticks: int = Field(default=100, ge=1, le=10000, description="Total simulation ticks to run")
    tick_delay_seconds: float = Field(default=0.5, ge=0.0, le=5.0, description="Wall-clock delay between ticks")
    parameters: dict[str, Any] = Field(default_factory=dict, description="Arbitrary scenario and workforce overrides")


class ExperimentRecord(BaseModel):
    """
    Persistent record representing an experiment in SQLite and REST responses.
    """
    id: str = Field(..., min_length=3, description="Unique experiment identifier")
    name: str = Field(..., min_length=1, description="Human-readable experiment name")
    seed: int = Field(..., ge=0, description="Global deterministic seed")
    config: ExperimentConfig = Field(..., description="Experiment configuration payload")
    status: ExecutionStatus = Field(default=ExecutionStatus.CREATED, description="Current experiment status")
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Experiment creation timestamp"
    )
    started_at: datetime | None = Field(default=None, description="Timestamp when execution began")
    completed_at: datetime | None = Field(default=None, description="Timestamp when execution ended")


class SimulationRunRecord(BaseModel):
    """
    Persistent record representing a specific execution run of an experiment.
    """
    run_id: UUID = Field(default_factory=uuid4, description="Unique run identifier")
    experiment_id: str = Field(..., description="Parent experiment identifier")
    trace_id: UUID = Field(default_factory=uuid4, description="Traceability UUID for logs and telemetry")
    status: ExecutionStatus = Field(default=ExecutionStatus.CREATED, description="Current run execution status")
    started_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Run start timestamp"
    )
    ended_at: datetime | None = Field(default=None, description="Run completion timestamp")
