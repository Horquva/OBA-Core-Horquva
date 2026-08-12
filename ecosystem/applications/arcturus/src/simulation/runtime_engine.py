"""
Simulation Runtime & Experiment Platform — Runtime Engine
Owner: Muhammad Maaz Khan
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from ecosystem.applications.arcturus.contracts.shared.base_models import SimulationContext
from ecosystem.applications.arcturus.contracts.shared.errors import BusinessRuleViolation
from ecosystem.applications.arcturus.contracts.simulation.base_models import (
    ExecutionStatus,
    RunHistoryRecord,
)
from ecosystem.applications.arcturus.contracts.synthetic_data.base_models import SyntheticGenerationResult
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
        synthetic_result: SyntheticGenerationResult | None = None,
    ) -> None:
        if self._status != ExecutionStatus.CREATED:
            raise BusinessRuleViolation(f"initialize_run() called from invalid state: {self._status}")
        if synthetic_result is not None and synthetic_result.context.run_id != context.run_id:
            raise BusinessRuleViolation(
                "synthetic_result.context does not match this run's SimulationContext"
            )
        self._context = context
        self._state = {
            "artifacts": [a.model_dump() for a in synthetic_result.artifacts] if synthetic_result else [],
            "relationships": [r.model_dump() for r in synthetic_result.relationships] if synthetic_result else [],
            "deterministic_fingerprint": synthetic_result.deterministic_fingerprint if synthetic_result else None,
        }
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
            seed=self._context.global_seed,
            config=self._context.config,
            status=self._status,
            started_at=self._started_at,
            ended_at=datetime.now(timezone.utc),
        )