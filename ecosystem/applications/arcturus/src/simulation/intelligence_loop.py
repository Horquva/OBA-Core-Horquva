"""
Arcturus Digital Twin Platform — Mid-Simulation Intelligence Loop
Coordinates real-time Gemini reasoning during simulation execution.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from ecosystem.applications.arcturus.api.services.intelligence_service import IntelligenceService
from ecosystem.applications.arcturus.src.simulation.world_state import WorldState

logger = logging.getLogger(__name__)


class IntelligenceLoop:
    """
    Coordinates mid-simulation AI reasoning.
    Inspects WorldState every N ticks or upon critical events and generates
    grounded narrative insights and tactical recommendations via Gemini.
    """

    def __init__(
        self,
        run_id: str,
        interval_ticks: int = 5,
        intelligence_service: Optional[IntelligenceService] = None,
    ) -> None:
        self.run_id = run_id
        self.interval_ticks = interval_ticks
        self.service = intelligence_service or IntelligenceService()
        self._last_analysis_tick = -1

    def should_analyze(self, world_state: WorldState) -> bool:
        """Determines if the intelligence engine should run on this tick."""
        if world_state.tick <= 0:
            return False

        # Regular periodic cadence
        if world_state.tick % self.interval_ticks == 0 and world_state.tick != self._last_analysis_tick:
            return True

        # Strategic triggers: check if critical events occurred this tick
        if world_state.events_log:
            recent_events = [e for e in world_state.events_log if getattr(e, "tick", 0) == world_state.tick]
            critical_types = {"SUPPLIER_FAILURE", "KEY_RESIGNATION", "BUDGET_CRITICAL", "BOTTLENECK"}
            if any(getattr(e, "event_type", "") in critical_types for e in recent_events):
                if world_state.tick != self._last_analysis_tick:
                    return True

        return False

    def build_summary_for_gemini(self, world_state: WorldState) -> dict[str, Any]:
        """Summarizes high-dimensional WorldState into a focused context dictionary for Gemini."""
        # Summarize departments
        departments_summary = {}
        for dept_id, dept in world_state.departments.items():
            departments_summary[dept_id] = {
                "name": dept.name,
                "headcount": dept.headcount,
                "budget_remaining": dept.budget_remaining,
                "active_tasks": dept.active_tasks,
                "completed_tasks": dept.completed_tasks,
            }

        # Summarize agent workforce health
        total_agents = len(world_state.agents)
        avg_fatigue = 0.0
        high_fatigue_agents = []
        working_count = 0

        if total_agents > 0:
            avg_fatigue = sum(a.fatigue for a in world_state.agents.values()) / total_agents
            for a in world_state.agents.values():
                if a.status == "working":
                    working_count += 1
                if a.fatigue > 0.7:
                    high_fatigue_agents.append({
                        "id": a.agent_id,
                        "name": a.name,
                        "fatigue": round(a.fatigue, 2),
                        "output_quality": round(a.output_quality, 2),
                        "status": a.status,
                    })

        # Summarize task queue
        queued_count = sum(1 for t in world_state.task_queue.values() if t.status == "queued")
        in_progress_count = sum(1 for t in world_state.task_queue.values() if t.status == "in_progress")
        completed_count = sum(1 for t in world_state.task_queue.values() if t.status == "completed")

        # Summarize recent events
        recent_events = []
        for e in world_state.events_log[-5:]:
            recent_events.append({
                "tick": getattr(e, "tick", 0),
                "type": getattr(e, "event_type", "UNKNOWN"),
                "description": getattr(e, "description", ""),
            })

        return {
            "tick": world_state.tick,
            "kpis": world_state.kpis.model_dump() if world_state.kpis else {},
            "departments": departments_summary,
            "workforce_metrics": {
                "total_agents": total_agents,
                "active_working_agents": working_count,
                "average_fatigue": round(avg_fatigue, 2),
                "burnout_risk_agents": high_fatigue_agents[:5],
            },
            "task_queue": {
                "queued": queued_count,
                "in_progress": in_progress_count,
                "completed": completed_count,
            },
            "recent_events": recent_events,
        }

    def process_tick(self, world_state: WorldState) -> Optional[dict[str, Any]]:
        """
        Runs mid-simulation intelligence if trigger conditions are met.
        Returns generated insight dict if executed, else None.
        """
        if not self.should_analyze(world_state):
            return None

        self._last_analysis_tick = world_state.tick
        summary = self.build_summary_for_gemini(world_state)

        try:
            insight = self.service.analyze_mid_simulation(
                run_id=self.run_id,
                tick=world_state.tick,
                world_state_summary=summary,
            )
            return insight
        except Exception as exc:
            logger.warning("Mid-simulation intelligence analysis failed: %s", exc)
            return None
