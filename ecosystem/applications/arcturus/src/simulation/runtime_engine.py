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

# New Phase 1 deep simulation imports
from ecosystem.applications.arcturus.src.simulation.world_state import WorldState, AgentState, DepartmentState, TaskState
from ecosystem.applications.arcturus.src.simulation.agent_engine import AgentEngine
from ecosystem.applications.arcturus.src.simulation.event_engine import EventEngine
from ecosystem.applications.arcturus.src.simulation.economic_model import EconomicModel


class RuntimeEngine:
    """Executes one SimulationContext through Created -> Completed."""

    def __init__(self, checkpoint_root: Path, max_ticks: int | None = None):
        self._checkpoints = CheckpointStore(checkpoint_root)
        self._context: SimulationContext | None = None
        self._status: ExecutionStatus = ExecutionStatus.CREATED
        self._clock_step: int = 0
        self._state: dict[str, Any] = {}
        self._started_at: datetime | None = None
        self._max_ticks = max_ticks
        
        # Deep Simulation Engines
        self._world_state: WorldState | None = None
        self._agent_engine: AgentEngine | None = None
        self._event_engine: EventEngine | None = None
        self._economic_model: EconomicModel | None = None

    @property
    def status(self) -> ExecutionStatus:
        return self._status

    def _build_initial_world_state(self) -> None:
        """Seed the WorldState from the context and synthetic artifacts if available."""
        self._world_state = WorldState(tick=0)
        
        # Hardcode some initial state for the simulation to start with
        # In a real setup, this would be hydrated from the Enterprise/Workforce payloads
        self._world_state.departments = {
            "engineering": DepartmentState(
                department_id="engineering",
                name="Engineering",
                headcount=24,
                budget_total=500000.0,
                budget_remaining=500000.0,
            ),
            "sales": DepartmentState(
                department_id="sales",
                name="Sales",
                headcount=12,
                budget_total=200000.0,
                budget_remaining=200000.0,
            )
        }
        
        # Create some demo agents
        for i in range(1, 11):
            self._world_state.agents[f"AGT-{i:03d}"] = AgentState(
                agent_id=f"AGT-{i:03d}",
                name=f"Agent {i}",
                role_id=1,
                department_id="engineering" if i <= 7 else "sales"
            )
            
        # Add some initial tasks to the queue
        for i in range(1, 6):
            self._world_state.task_queue[f"TASK-INIT-{i}"] = TaskState(
                task_id=f"TASK-INIT-{i}",
                name=f"Initial Setup Task {i}",
                resource_cost=150.0
            )

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
        
        self._build_initial_world_state()
        
        # Initialize engines
        self._agent_engine = AgentEngine(global_seed=context.global_seed)
        self._event_engine = EventEngine(global_seed=context.global_seed)
        self._economic_model = EconomicModel()
        
        self._clock_step = 0
        self._started_at = datetime.now(timezone.utc)
        self._status = ExecutionStatus.INITIALIZED

    def step(self) -> dict[str, Any]:
        if self._context is None or self._world_state is None:
            raise BusinessRuleViolation("step() called before initialize_run()")
        if self._status not in (ExecutionStatus.INITIALIZED, ExecutionStatus.RUNNING):
            raise BusinessRuleViolation(f"step() called from invalid state: {self._status}")
        if self._max_ticks is not None and self._clock_step >= self._max_ticks:
            raise BusinessRuleViolation(
                f"clock overflow: max_ticks={self._max_ticks} reached, refusing to advance further"
            )

        self._status = ExecutionStatus.RUNNING
        self._clock_step += 1
        
        # Deep Simulation Tick Logic
        self._world_state.tick = self._clock_step
        self._world_state.last_step_at = datetime.now(timezone.utc).isoformat()
        
        # 1. Inject scheduled and probabilistic events
        self._event_engine.process_tick(self._world_state)
        
        # 2. Process economic model consumption
        self._economic_model.compute(self._world_state)
        
        # 3. Process agent decisions and actions
        self._agent_engine.process_agents(self._world_state)
        
        # 4. Propagate event cascades
        self._event_engine.propagate_cascades(self._world_state)
        
        # Update raw state for backwards compatibility in API responses
        self._state["clock_step"] = self._clock_step
        self._state["last_step_at"] = self._world_state.last_step_at
        
        # Also store the rich world state dump in the state dict
        world_state_dump = self._world_state.model_dump()
        self._state["world_state"] = world_state_dump

        self._status = ExecutionStatus.CHECKPOINTING
        self._checkpoints.save(self._context.run_id, self._clock_step, self._state)
        if self._status != ExecutionStatus.PAUSED:
            self._status = ExecutionStatus.RUNNING

        return dict(self._state)

    def pause(self) -> None:
        if self._status not in (ExecutionStatus.RUNNING, ExecutionStatus.INITIALIZED, ExecutionStatus.CHECKPOINTING):
            raise BusinessRuleViolation(f"pause() called from invalid state: {self._status}")
        self._status = ExecutionStatus.PAUSED

    def resume(self) -> None:
        if self._status != ExecutionStatus.PAUSED:
            raise BusinessRuleViolation(f"resume() called from invalid state: {self._status}")
        self._status = ExecutionStatus.RUNNING

    def restore_from_checkpoint(self, context: SimulationContext, checkpoint_state: dict) -> None:
        if self._status != ExecutionStatus.CREATED:
            raise BusinessRuleViolation(
                f"restore_from_checkpoint() called from invalid state: {self._status}"
            )
        self._context = context
        self._state = dict(checkpoint_state)
        self._clock_step = int(checkpoint_state.get("clock_step", 0))
        
        # Also restore the world state
        world_state_data = checkpoint_state.get("world_state", {})
        self._world_state = WorldState(**world_state_data) if world_state_data else WorldState(tick=self._clock_step)
        
        self._agent_engine = AgentEngine(global_seed=context.global_seed)
        self._event_engine = EventEngine(global_seed=context.global_seed)
        self._economic_model = EconomicModel()
        
        self._started_at = datetime.now(timezone.utc)
        self._status = ExecutionStatus.INITIALIZED

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
