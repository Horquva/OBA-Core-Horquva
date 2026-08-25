from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from ecosystem.applications.arcturus.api.config import Settings
from ecosystem.applications.arcturus.api.database import get_db_connection
from ecosystem.applications.arcturus.api.services.event_bus import EventBus
from ecosystem.applications.arcturus.src.integration.experiment_orchestrator import ExperimentOrchestrator
from ecosystem.applications.arcturus.contracts.experiment.base_models import (
    ExperimentConfig,
    ExperimentStatus,
)
from ecosystem.applications.arcturus.contracts.shared.base_models import (
    ArcturusValidationError,
    SimulationContext,
)
from ecosystem.applications.arcturus.contracts.simulation.base_models import ExecutionStatus, ScenarioDSLPayload
from ecosystem.applications.arcturus.src.simulation.runtime_engine import RuntimeEngine
from ecosystem.applications.arcturus.src.simulation.runtime_adapters import build_simulation_context

router = APIRouter(prefix="/api/v1/runtime", tags=["Runtime"])
settings = Settings()

# In-memory registry: experiment_id -> RuntimeEngine instance
_active_engines: dict[str, RuntimeEngine] = {}

class StartRunRequest(BaseModel):
    global_seed: int = 42
    duration_ticks: int = 100
    tick_delay_seconds: float = 0.5


@router.post("/experiments/{experiment_id}/start", status_code=202)
async def start_simulation(
    experiment_id: str,
    payload: StartRunRequest,
    request: Request,
):
    """
    Start a simulation run for an experiment.
    Returns 202 Accepted immediately; tick events arrive via WebSocket.
    """
    bus: EventBus = request.app.state.event_bus

    with get_db_connection(settings.db_path) as db:
        row = db.execute(
            "SELECT * FROM experiments WHERE id = ?", (experiment_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Experiment not found")

        if experiment_id in _active_engines:
            raise HTTPException(status_code=409, detail="Simulation already running for this experiment")

        # Get config from experiment
        config_dict = row["config"]
        import json
        if isinstance(config_dict, str):
            config_dict = json.loads(config_dict)
            
        raw_scenario_id = config_dict.get("scenario_id", "SCN-BL-001")
        if not raw_scenario_id.startswith("SCN-"):
            raw_scenario_id = "SCN-BL-001"

        config = ExperimentConfig(
            scenario_id=raw_scenario_id,
            global_seed=payload.global_seed,
            duration_ticks=payload.duration_ticks,
            tick_delay_seconds=payload.tick_delay_seconds,
            parameters=config_dict.get("parameters", {})
        )

        # Create a new SimulationContext and SimulationRunRecord
        scenario = ScenarioDSLPayload(
            scenario_id=config.scenario_id,
            seed=payload.global_seed,
            variables={"duration_ticks": payload.duration_ticks, "tick_delay_seconds": payload.tick_delay_seconds},
            constraints={},
        )
        context = build_simulation_context(scenario, experiment_id=experiment_id)
        run_id = str(context.run_id)

        # Persist the run record
        db.execute(
            "INSERT INTO simulation_runs (run_id, experiment_id, trace_id, status, started_at) VALUES (?, ?, ?, ?, ?)",
            (run_id, experiment_id, str(context.trace_id), "RUNNING", datetime.now(timezone.utc).isoformat()),
        )
        db.execute(
            "UPDATE experiments SET status = ?, started_at = ? WHERE id = ?",
            (ExperimentStatus.RUNNING.value, datetime.now(timezone.utc).isoformat(), experiment_id),
        )
        db.commit()

    # Initialize and register the engine
    engine = RuntimeEngine(checkpoint_root=settings.db_path.parent / "checkpoints")
    engine.initialize_run(context)
    _active_engines[experiment_id] = engine

    # Launch the async tick loop as a background task
    asyncio.create_task(
        _run_simulation_loop(experiment_id, run_id, engine, bus, payload, context, config)
    )

    return {"status": "ACCEPTED", "run_id": run_id, "experiment_id": experiment_id}


@router.post("/experiments/{experiment_id}/pause", status_code=200)
async def pause_simulation(experiment_id: str, request: Request):
    """Pause a running simulation by marking the engine as paused."""
    bus: EventBus = request.app.state.event_bus
    engine = _active_engines.get(experiment_id)
    if not engine:
        raise HTTPException(status_code=404, detail="No active simulation for this experiment")
    
    engine.pause()
    await bus.publish(experiment_id, "STATUS_UPDATE", {"status": "PAUSED"})
    return {"status": "PAUSED", "experiment_id": experiment_id}


@router.post("/experiments/{experiment_id}/resume", status_code=200)
async def resume_simulation(experiment_id: str, request: Request):
    """Resume a paused simulation."""
    bus: EventBus = request.app.state.event_bus
    engine = _active_engines.get(experiment_id)
    if not engine or engine.status != ExecutionStatus.PAUSED:
        raise HTTPException(status_code=409, detail="Simulation is not in PAUSED state")
    
    engine.resume()
    await bus.publish(experiment_id, "STATUS_UPDATE", {"status": "RUNNING"})
    return {"status": "RUNNING", "experiment_id": experiment_id}


@router.get("/experiments/{experiment_id}/status")
async def get_simulation_status(experiment_id: str):
    """Returns current engine status for an experiment."""
    engine = _active_engines.get(experiment_id)
    if not engine:
        return {"experiment_id": experiment_id, "status": "NOT_RUNNING"}
    return {"experiment_id": experiment_id, "status": engine.status.value}


async def _run_simulation_loop(
    experiment_id: str,
    run_id: str,
    engine: RuntimeEngine,
    bus: EventBus,
    payload: StartRunRequest,
    context: SimulationContext,
    config: ExperimentConfig,
) -> None:
    """
    Background coroutine that drives tick-level execution.
    Auto-chains the ExperimentOrchestrator pipeline before ticking.
    """
    final_status = ExperimentStatus.COMPLETED
    try:
        # Phase 1: Pipeline Orchestration
        orchestrator = ExperimentOrchestrator(experiment_id=experiment_id, config=config)
        
        await bus.publish(experiment_id, "STAGE_CHANGE", {"stage": "INIT_ONTOLOGY", "run_id": run_id})
        pipeline_results = await asyncio.to_thread(orchestrator.run_pipeline)
        
        if pipeline_results.get("status") == "FAILED":
            raise ArcturusValidationError(pipeline_results.get("error", "Pipeline initialization failed"), "Orchestrator")

        # Phase 2: Simulation Execution Loop
        await bus.publish(experiment_id, "STAGE_CHANGE", {"stage": "RUNNING", "run_id": run_id})
        
        tick = 0
        while tick < payload.duration_ticks:
            while engine.status == ExecutionStatus.PAUSED:
                await asyncio.sleep(0.1)

            if engine.status not in (ExecutionStatus.RUNNING, ExecutionStatus.INITIALIZED):
                break

            state = await asyncio.to_thread(engine.step)
            tick += 1

            await bus.publish(experiment_id, "TICK", {
                "tick": tick,
                "run_id": run_id,
                "state_summary": {k: v for k, v in state.items() if k != "artifacts"},
            })

            await asyncio.sleep(payload.tick_delay_seconds)

        engine.finalize_run()
        await bus.publish(experiment_id, "STATUS_UPDATE", {"status": "COMPLETED", "ticks": tick})

    except Exception as exc:
        final_status = ExperimentStatus.FAILED
        await bus.publish(experiment_id, "ERROR", {
            "error_code": "SIMULATION_RUNTIME_ERROR",
            "message": str(exc),
        })
    finally:
        with get_db_connection(settings.db_path) as db:
            db.execute(
                "UPDATE simulation_runs SET status = ?, ended_at = ? WHERE run_id = ?",
                (final_status.value, datetime.now(timezone.utc).isoformat(), run_id),
            )
            db.execute(
                "UPDATE experiments SET status = ?, completed_at = ? WHERE id = ?",
                (final_status.value, datetime.now(timezone.utc).isoformat(), experiment_id),
            )
            db.commit()

        _active_engines.pop(experiment_id, None)
