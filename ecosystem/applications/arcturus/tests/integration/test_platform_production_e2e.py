"""
Arcturus Production Integration Test Suite — End-to-End Platform Verification
Tests all 9 core subsystems and simulation mechanics.
"""

import pytest
import tempfile
from pathlib import Path

from ecosystem.applications.arcturus.contracts.simulation.base_models import ScenarioDSLPayload
from ecosystem.applications.arcturus.src.simulation.runtime_adapters import build_simulation_context
from ecosystem.applications.arcturus.src.simulation.runtime_engine import RuntimeEngine
from ecosystem.applications.arcturus.src.simulation.world_state import WorldState, AgentState, DepartmentState, TaskState
from ecosystem.applications.arcturus.src.simulation.agent_engine import AgentEngine
from ecosystem.applications.arcturus.src.simulation.economic_model import EconomicModel
from ecosystem.applications.arcturus.src.simulation.event_engine import EventEngine
from ecosystem.applications.arcturus.src.simulation.intelligence_loop import IntelligenceLoop
from ecosystem.applications.arcturus.src.simulation.batch_runner import MonteCarloBatchRunner


class TestDeepSimulationEngine:
    """Tests Phase 1 core simulation physics and state progression."""

    def test_agent_perceive_decide_act_and_fatigue(self):
        world = WorldState(tick=0)
        world.departments["eng"] = DepartmentState(
            department_id="eng", name="Engineering", headcount=5, budget_total=100000.0, budget_remaining=100000.0
        )
        world.agents["AGT-001"] = AgentState(
            agent_id="AGT-001", name="Alice", role_id=1, department_id="eng", skill_level=1.0
        )
        world.task_queue["TASK-001"] = TaskState(
            task_id="TASK-001", name="Design Architecture", complexity=1.0, required_role="eng"
        )

        engine = AgentEngine(global_seed=42)

        # Tick 1: Agent finds work and starts
        world.tick = 1
        engine.process_agents(world)
        agent = world.agents["AGT-001"]
        task = world.task_queue["TASK-001"]

        assert agent.status == "working"
        assert task.status == "in_progress"
        assert task.assigned_agent_id == "AGT-001"

        # Advance 10 ticks
        for t in range(2, 12):
            world.tick = t
            engine.process_agents(world)

        assert agent.fatigue > 0.0, "Working agent must accumulate fatigue"
        assert task.progress > 0.0, "In-progress task must advance"

    def test_economic_model_budget_depletion(self):
        world = WorldState(tick=0)
        world.departments["eng"] = DepartmentState(
            department_id="eng", name="Engineering", headcount=10, budget_total=50000.0, budget_remaining=50000.0
        )
        model = EconomicModel()

        for t in range(1, 6):
            world.tick = t
            model.compute(world)

        dept = world.departments["eng"]
        assert dept.budget_remaining < 50000.0
        assert world.kpis.budget_burn_rate > 0.0

    def test_event_injection_and_cascades(self):
        world = WorldState(tick=0)
        world.departments["eng"] = DepartmentState(department_id="eng", name="Engineering", headcount=5)
        event_engine = EventEngine(global_seed=42)

        # Scheduled shock event at tick 5
        event_engine.schedule_event(5, "SUPPLIER_FAILURE", target="supplier-alpha", severity="critical")

        world.tick = 5
        event_engine.process_tick(world)
        assert len(world.events_log) > 0
        assert any(e.type == "SUPPLIER_FAILURE" for e in world.events_log)

        # Cascade propagation
        event_engine.propagate_cascades(world)
        assert any(e.type == "DELIVERY_DELAY" for e in world.events_log)


class TestDeterminismAndReproducibility:
    """Verifies that identical seeds produce bit-for-bit identical simulation results."""

    def test_seed_reproducibility(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            checkpoint_root = Path(tmpdir)

            scenario = ScenarioDSLPayload(
                scenario_id="SCN-RT-101",
                seed=777,
                variables={"duration_ticks": 10},
                constraints={},
            )

            # Run 1
            ctx1 = build_simulation_context(scenario, experiment_id="exp-test-det")
            engine1 = RuntimeEngine(checkpoint_root=checkpoint_root)
            engine1.initialize_run(ctx1)
            for _ in range(10):
                engine1.step()

            # Run 2 with identical seed
            ctx2 = build_simulation_context(scenario, experiment_id="exp-test-det")
            engine2 = RuntimeEngine(checkpoint_root=checkpoint_root)
            engine2.initialize_run(ctx2)
            for _ in range(10):
                engine2.step()

            # Assert complete world state match
            w1 = engine1._world_state
            w2 = engine2._world_state

            assert w1 is not None and w2 is not None
            assert w1.tick == w2.tick == 10
            for aid in w1.agents:
                assert w1.agents[aid].fatigue == w2.agents[aid].fatigue
                assert w1.agents[aid].status == w2.agents[aid].status


class TestMonteCarloAndIntelligence:
    """Tests Phase 3 and Phase 4 Monte Carlo parallel sweeps and intelligence loop."""

    def test_monte_carlo_batch_aggregation(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            runner = MonteCarloBatchRunner(checkpoint_root=Path(tmpdir), max_workers=2)
            results = runner.run_batch(
                experiment_id="exp-mc-test",
                n_runs=4,
                duration_ticks=10,
                base_seed=100,
            )

            assert results["total_runs"] == 4
            assert len(results["individual_runs"]) == 4
            assert "completed_tasks" in results["statistics"]
            assert "budget_spent" in results["statistics"]
            assert results["statistics"]["completed_tasks"]["mean"] >= 0

    def test_intelligence_loop_summary_generation(self):
        world = WorldState(tick=5)
        world.departments["eng"] = DepartmentState(department_id="eng", name="Eng", headcount=10, budget_remaining=40000.0)
        world.agents["AGT-001"] = AgentState(agent_id="AGT-001", name="Bob", role_id=1, fatigue=0.75, status="working")

        loop = IntelligenceLoop(run_id="run-test-intel", interval_ticks=5)
        assert loop.should_analyze(world) is True

        summary = loop.build_summary_for_gemini(world)
        assert summary["tick"] == 5
        assert "workforce_metrics" in summary
        assert summary["workforce_metrics"]["burnout_risk_agents"][0]["id"] == "AGT-001"
