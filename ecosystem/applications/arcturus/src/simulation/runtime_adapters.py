"""
Simulation Runtime & Experiment Platform â€” Adapters
Owner: Muhammad Maaz Khan

Translator layer: converts upstream/downstream shared contracts into the
shapes RuntimeEngine works with internally, and back out again. Keeps
RuntimeEngine itself free of platform-specific construction logic.
"""

from __future__ import annotations

from ecosystem.applications.arcturus.contracts.shared.base_models import SimulationContext
from ecosystem.applications.arcturus.contracts.simulation.base_models import (
    ExecutionStatus,
    ExperimentResultPackage,
    RunHistoryRecord,
    ScenarioDSLPayload,
)


def build_simulation_context(
    scenario: ScenarioDSLPayload,
    experiment_id: str | None = None,
) -> SimulationContext:
    """Binds Maryam's ScenarioDSLPayload into a runtime SimulationContext."""
    return SimulationContext(
        experiment_id=experiment_id or scenario.scenario_id,
        global_seed=scenario.seed,
        config={
            "variables": scenario.variables,
            "constraints": scenario.constraints,
        },
    )


def build_experiment_result_package(
    context: SimulationContext,
    run_history: RunHistoryRecord,
    state_snapshot: dict | StateSnapshot,
    checkpoint_refs: list[str],
) -> ExperimentResultPackage:
    """Builds the outbound handoff to Amina's Validation & Evaluation Platform."""
    return ExperimentResultPackage(
        context=context,
        scenario_id=context.experiment_id,
        final_status=run_history.status,
        state_snapshot=state_snapshot,
        event_count=len(state_snapshot if isinstance(state_snapshot, dict) else state_snapshot.model_dump()),
        checkpoint_refs=checkpoint_refs,
    )
