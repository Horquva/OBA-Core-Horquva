import asyncio
from ecosystem.applications.arcturus.contracts.shared.base_models import SimulationContext
from ecosystem.applications.arcturus.contracts.simulation.base_models import ExecutionStatus
from ecosystem.applications.arcturus.src.simulation.runtime_engine import RuntimeEngine


async def run_simulation_async(context: SimulationContext, engine: RuntimeEngine, bus) -> None:
    """
    Advances the simulation clock asynchronously so it doesn't block the
    FastAPI event loop. Each tick's sync engine.step() runs in a thread pool;
    resulting state is published to the event bus for WebSocket streaming.
    """
    while engine.status == ExecutionStatus.RUNNING:
        state = await asyncio.to_thread(engine.step)
        await bus.publish(context.experiment_id, "TICK", state)
        await asyncio.sleep(0.5)
