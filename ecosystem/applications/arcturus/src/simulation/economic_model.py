from ecosystem.applications.arcturus.src.simulation.world_state import WorldState, SimulationEvent

class EconomicModel:
    """Computes resource flows, budget burn, and economic alerts per tick."""

    def __init__(self, cost_per_head_per_tick: float = 100.0):
        self.cost_per_head_per_tick = cost_per_head_per_tick

    def compute(self, world_state: WorldState) -> None:
        """Process economic consumption for the current tick."""
        total_burn = 0.0

        for dept_id, dept in world_state.departments.items():
            # Burn budget based on headcount
            headcount_cost = dept.headcount * self.cost_per_head_per_tick
            
            # Burn budget based on active tasks
            task_cost = 0.0
            for task in world_state.task_queue.values():
                if task.status == "in_progress" and task.assigned_agent_id:
                    # Check if agent belongs to this department
                    agent = world_state.agents.get(task.assigned_agent_id)
                    if agent and agent.department_id == dept_id:
                        task_cost += task.resource_cost

            dept_burn = headcount_cost + task_cost
            dept.budget_remaining -= dept_burn
            total_burn += dept_burn

            # Generate alerts if budget is critically low
            if dept.budget_total > 0 and dept.budget_remaining < dept.budget_total * 0.1:
                # Avoid spamming events every tick by checking a threshold 
                # (For simplicity here, we might spam it, but in reality we'd throttle it)
                world_state.events_log.append(
                    SimulationEvent(
                        event_id=f"evt_budget_{dept_id}_{world_state.tick}",
                        tick=world_state.tick,
                        type="BUDGET_CRITICAL",
                        target=dept_id,
                        severity="warning",
                        details={"budget_remaining": dept.budget_remaining}
                    )
                )

        world_state.resources.global_budget_remaining -= total_burn
        world_state.kpis.budget_burn_rate = total_burn
