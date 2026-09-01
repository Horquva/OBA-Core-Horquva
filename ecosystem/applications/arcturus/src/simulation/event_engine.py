import random
import uuid
from typing import List, Dict, Any

from ecosystem.applications.arcturus.src.simulation.world_state import WorldState, SimulationEvent

class EventEngine:
    """Manages scheduled events, probabilistic events, and cascade effects."""

    def __init__(self, global_seed: int, scheduled_events: List[Dict[str, Any]] = None):
        self.rng = random.Random(global_seed + 100) # Offset seed
        self.scheduled_events = list(scheduled_events or [])
        self._processed_events = set()

    def schedule_event(
        self,
        tick: int,
        event_type: str,
        target: str = None,
        severity: str = "warning",
        details: Dict[str, Any] = None,
    ) -> None:
        """Schedule a future shock or intervention event at a specific tick."""
        self.scheduled_events.append({
            "tick": tick,
            "type": event_type,
            "target": target,
            "severity": severity,
            "details": details or {},
        })


    def process_tick(self, world_state: WorldState) -> None:
        """Inject events for the current tick."""
        
        # 1. Scheduled Events
        for evt in self.scheduled_events:
            if evt.get("tick") == world_state.tick:
                event_id = evt.get("event_id", str(uuid.uuid4()))
                if event_id not in self._processed_events:
                    world_state.events_log.append(
                        SimulationEvent(
                            event_id=event_id,
                            tick=world_state.tick,
                            type=evt.get("type", "UNKNOWN"),
                            target=evt.get("target"),
                            severity=evt.get("severity", "warning"),
                            details=evt.get("details", {})
                        )
                    )
                    self._processed_events.add(event_id)

        # 2. Probabilistic Events (e.g. random system outage)
        if self.rng.random() < 0.05: # 5% chance per tick of a generic issue
            world_state.events_log.append(
                SimulationEvent(
                    event_id=str(uuid.uuid4()),
                    tick=world_state.tick,
                    type="SYSTEM_GLITCH",
                    severity="info",
                    details={"impact": "minor"}
                )
            )

    def propagate_cascades(self, world_state: WorldState) -> None:
        """Apply cascade logic based on events fired this tick."""
        
        # Get events that fired exactly on this tick
        recent_events = [e for e in world_state.events_log if e.tick == world_state.tick]
        
        for event in recent_events:
            if event.type == "SUPPLIER_FAILURE":
                # Cascade: Supplier failure -> delays active tasks and logs cascade event
                for task in world_state.task_queue.values():
                    if task.status == "in_progress":
                        # Simulate delay by undoing some progress or blocking
                        task.progress = max(0.0, task.progress - 0.2)

                world_state.events_log.append(
                    SimulationEvent(
                        event_id=str(uuid.uuid4()),
                        tick=world_state.tick,
                        type="DELIVERY_DELAY",
                        severity="warning",
                        details={"cause": "SUPPLIER_FAILURE", "affected_orders": len(world_state.task_queue)}
                    )
                )
                        
            elif event.type == "DEMAND_SPIKE":
                # Cascade: Demand spike -> queue more tasks
                for i in range(5):
                    new_task_id = f"TASK_SPIKE_{world_state.tick}_{i}"
                    from ecosystem.applications.arcturus.src.simulation.world_state import TaskState
                    world_state.task_queue[new_task_id] = TaskState(
                        task_id=new_task_id,
                        name=f"Urgent Task {i}",
                        complexity=1.5,
                        resource_cost=200.0
                    )
