"""
Arcturus Digital Twin Platform — Monte Carlo & Batch Simulation Engine
Enables parallel multi-seed scenario execution and statistical outcome aggregation.
"""

from __future__ import annotations

import concurrent.futures
import math
import statistics
import time
from typing import Any, Dict, List, Optional
from uuid import uuid4

from ecosystem.applications.arcturus.contracts.shared.base_models import SimulationContext
from ecosystem.applications.arcturus.contracts.simulation.base_models import ScenarioDSLPayload
from ecosystem.applications.arcturus.src.simulation.runtime_adapters import build_simulation_context
from ecosystem.applications.arcturus.src.simulation.runtime_engine import RuntimeEngine


def _run_single_sim(
    experiment_id: str,
    seed: int,
    duration_ticks: int,
    checkpoint_root: Any,
) -> Dict[str, Any]:
    """Worker task that executes one isolated simulation run with a given seed."""
    scenario = ScenarioDSLPayload(
        scenario_id=f"SCN-MC-{(abs(seed) % 900) + 100:03d}",
        seed=seed,
        variables={"duration_ticks": duration_ticks},
        constraints={},
    )
    context = build_simulation_context(scenario, experiment_id=experiment_id)
    engine = RuntimeEngine(checkpoint_root=checkpoint_root)
    engine.initialize_run(context)

    start_time = time.perf_counter()
    for _ in range(duration_ticks):
        engine.step()

    record = engine.finalize_run()
    elapsed = time.perf_counter() - start_time

    # Collect final world state KPIs
    world = engine._world_state
    completed_tasks = 0
    total_budget_spent = 0.0
    active_headcount = 0
    resigned_agents = 0

    if world:
        completed_tasks = sum(1 for t in world.task_queue.values() if t.status == "completed")
        total_budget_spent = sum(
            (dept.budget_total - dept.budget_remaining) for dept in world.departments.values()
        )
        active_headcount = sum(dept.headcount for dept in world.departments.values())
        resigned_agents = sum(1 for a in world.agents.values() if a.status == "resigned")

    return {
        "run_id": str(context.run_id),
        "seed": seed,
        "ticks": duration_ticks,
        "elapsed_seconds": round(elapsed, 4),
        "completed_tasks": completed_tasks,
        "total_budget_spent": round(total_budget_spent, 2),
        "resigned_agents": resigned_agents,
        "active_headcount": active_headcount,
    }


class MonteCarloBatchRunner:
    """Executes parallel batches of simulations to compute probabilistic scenario distributions."""

    def __init__(self, checkpoint_root: Any, max_workers: int = 4):
        self.checkpoint_root = checkpoint_root
        self.max_workers = max_workers

    def run_batch(
        self,
        experiment_id: str,
        n_runs: int = 5,
        duration_ticks: int = 30,
        base_seed: int = 42,
    ) -> Dict[str, Any]:
        batch_id = str(uuid4())
        seeds = [base_seed + i for i in range(n_runs)]
        run_results: List[Dict[str, Any]] = []

        start_all = time.perf_counter()
        with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            future_to_seed = {
                executor.submit(
                    _run_single_sim,
                    experiment_id,
                    seed,
                    duration_ticks,
                    self.checkpoint_root,
                ): seed
                for seed in seeds
            }
            for future in concurrent.futures.as_completed(future_to_seed):
                res = future.result()
                run_results.append(res)

        total_elapsed = time.perf_counter() - start_all

        # Statistical analysis across Monte Carlo runs
        tasks_list = [r["completed_tasks"] for r in run_results]
        budget_list = [r["total_budget_spent"] for r in run_results]
        resigned_list = [r["resigned_agents"] for r in run_results]

        def compute_stats(data: List[float]) -> Dict[str, float]:
            if not data:
                return {"mean": 0.0, "std_dev": 0.0, "p10": 0.0, "p50": 0.0, "p90": 0.0, "min": 0.0, "max": 0.0}
            sorted_d = sorted(data)
            n = len(sorted_d)
            mean_val = statistics.mean(sorted_d)
            std_val = statistics.stdev(sorted_d) if n > 1 else 0.0
            return {
                "mean": round(mean_val, 2),
                "std_dev": round(std_val, 2),
                "min": round(sorted_d[0], 2),
                "max": round(sorted_d[-1], 2),
                "p10": round(sorted_d[max(0, int(0.10 * n))], 2),
                "p50": round(sorted_d[max(0, int(0.50 * n))], 2),
                "p90": round(sorted_d[max(0, int(0.90 * n))], 2),
            }

        return {
            "batch_id": batch_id,
            "experiment_id": experiment_id,
            "total_runs": n_runs,
            "duration_ticks": duration_ticks,
            "total_duration_seconds": round(total_elapsed, 4),
            "statistics": {
                "completed_tasks": compute_stats(tasks_list),
                "budget_spent": compute_stats(budget_list),
                "agent_resignations": compute_stats(resigned_list),
            },
            "individual_runs": run_results,
        }
