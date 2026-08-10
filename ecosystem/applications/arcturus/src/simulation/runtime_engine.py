"""
Simulation Runtime & Experiment Platform — Runtime Engine
Owner: Muhammad Maaz Khan

The local, single-process execution kernel for one simulation run.
initialize_run()'s Ahmed-dependent input is a placeholder until
SyntheticGenerationResult's shape is confirmed with Ahmed (Synthetic Data
Platform). step() and finalize_run() do not depend on it and are safe to use
as-is.
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from ecosystem.applications.arcturus.contracts.shared.errors import BusinessRuleViolation
from ecosystem.applications.arcturus.contracts.simulation.base_models import (
    ExecutionStatus,
    RunHistoryRecord,
    SimulationContext,
)
from ecosystem.applications.arcturus.src.simulation.checkpoint_store import CheckpointStore


class RuntimeEngine:
    """Executes one SimulationContext through Created -> Completed."""

    def __init__(self, checkpoint_root: Path):
        self._checkpoints = CheckpointStore(checkpoint_root)
        self._context: SimulationContext | None = None
        self._status: ExecutionStatus = ExecutionStatus.CREATED
        self._clock_step: int = 0
        self._state: dict[str, Any] = {}
        self._started_at: datetime | None = None

    @property
    def status(self) -> ExecutionStatus:
        return self._status

    def initialize_run(
        self,
        context: SimulationContext,
        # TODO(Maaz <-> Ahmed): replace with the real SyntheticGenerationResult
        # once its shape is confirmed. Left optional so the engine is usable
        # stand-alone / against hand-built fixtures until then.
        synthetic_seed_data: dict[str, Any] | None = None,
    ) -> None:
        if self._status != ExecutionStatus.CREATED:
            raise BusinessRuleViolation(f"initialize_run() called from invalid state: {self._status}")
        self._context = context
        self._state = {"seed_data": synthetic_seed_data or {}}
        self._clock_step = 0
        self._started_at = datetime.now(timezone.utc)
        self._status = ExecutionStatus.INITIALIZED

    def step(self) -> dict[str, Any]:
        if self._context is None:
            raise BusinessRuleViolation("step() called before initialize_run()")
        if self._status not in (ExecutionStatus.INITIALIZED, ExecutionStatus.RUNNING):
            raise BusinessRuleViolation(f"step() called from invalid state: {self._status}")

        self._status = ExecutionStatus.RUNNING
        self._clock_step += 1
        self._state["last_step_at"] = datetime.now(timezone.utc).isoformat()

        self._status = ExecutionStatus.CHECKPOINTING
        self._checkpoints.save(self._context.run_id, self._clock_step, self._state)
        self._status = ExecutionStatus.RUNNING

        return dict(self._state)

    def finalize_run(self) -> RunHistoryRecord:
        if self._context is None:
            raise BusinessRuleViolation("finalize_run() called before initialize_run()")
        if self._status not in (ExecutionStatus.RUNNING, ExecutionStatus.INITIALIZED):
            raise BusinessRuleViolation(f"finalize_run() called from invalid state: {self._status}")

        self._status = ExecutionStatus.COMPLETED
        return RunHistoryRecord(
            run_id=self._context.run_id,
            seed=self._context.seed,
            config=self._context.config,
            status=self._status,
            started_at=self._started_at,
            ended_at=datetime.now(timezone.utc),
        )