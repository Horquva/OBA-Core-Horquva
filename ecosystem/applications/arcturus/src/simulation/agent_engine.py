import random
from typing import Dict, List, Optional, Any
from collections import defaultdict

from ecosystem.applications.arcturus.src.simulation.world_state import WorldState, AgentState, TaskState


class AgentEngine:
    """High-Performance Agent Execution Engine capable of processing 1,000+ agents per tick."""

    def __init__(
        self,
        global_seed: int,
        enable_llm_decisions: bool = False,
        intelligence_service: Optional[Any] = None,
    ):
        self.rng = random.Random(global_seed)
        self.enable_llm_decisions = enable_llm_decisions
        self.service = intelligence_service

    def process_agents(self, world_state: WorldState) -> None:
        """Executes the Perceive-Decide-Act loop for all active agents with O(1) task assignment."""
        # 1. Build indexed queued task pools once per tick for high-throughput scaling
        agent_task_pool = defaultdict(list)
        role_task_pool = defaultdict(list)
        general_task_pool = []

        for task in world_state.task_queue.values():
            if task.status == "queued":
                if task.assigned_agent_id:
                    agent_task_pool[task.assigned_agent_id].append(task)
                elif task.required_role:
                    role_task_pool[str(task.required_role).lower()].append(task)
                else:
                    general_task_pool.append(task)

        task_pools = {
            "by_agent": agent_task_pool,
            "by_role": role_task_pool,
            "general": general_task_pool,
        }

        # 2. Process all agents efficiently
        for agent in world_state.agents.values():
            self._process_single_agent(agent, world_state, task_pools)

    def _process_single_agent(
        self,
        agent: AgentState,
        world_state: WorldState,
        task_pools: dict[str, Any],
    ) -> None:
        if agent.status in ("resigned", "degraded_offline"):
            return

        # 1. PERCEIVE
        current_task = None
        if agent.current_task_id and agent.current_task_id in world_state.task_queue:
            current_task = world_state.task_queue[agent.current_task_id]

        # 2. STRATEGIC DECISION CHECK (if extreme fatigue or task blocked)
        if current_task and agent.fatigue > 0.85:
            self._handle_burnout_decision(agent, current_task, world_state)
            if agent.status != "working":
                self._apply_fatigue(agent)
                return

        # 3. DECIDE & ACT
        if current_task and current_task.status == "in_progress":
            self._act_on_task(agent, current_task, world_state)
        elif not current_task:
            self._find_work_indexed(agent, world_state, task_pools)
        else:
            agent.status = "idle"

        # 4. FATIGUE
        self._apply_fatigue(agent)

    def _handle_burnout_decision(self, agent: AgentState, task: TaskState, world_state: WorldState) -> None:
        """Evaluates whether fatigued agent should escalate, take break, or push through."""
        if self.enable_llm_decisions and self.service:
            try:
                decision = self.service.agent_decide_llm(
                    agent_info={"id": agent.agent_id, "role": agent.role_id, "fatigue": agent.fatigue},
                    context_info={"task_id": task.task_id, "task_complexity": task.complexity},
                )
                action = decision.get("action", "take_break")
                if action == "take_break":
                    task.status = "queued"
                    task.assigned_agent_id = None
                    agent.current_task_id = None
                    agent.status = "idle"
                    return
                elif action == "escalate":
                    task.complexity *= 0.9  # Manager helps resolve
                    return
            except Exception as exc:
                print(f"[FALLBACK TRIGGERED] Agent Decision Engine: LLM decision failed for agent {agent.agent_id} ({exc}). Diverting to rule-based fallback.", flush=True)

        # Rule-based fallback: if severely burned out, yield task to rest
        if agent.fatigue > 0.90:
            task.status = "queued"
            task.assigned_agent_id = None
            agent.current_task_id = None
            agent.status = "idle"

    def _act_on_task(self, agent: AgentState, task: TaskState, world_state: WorldState) -> None:
        agent.status = "working"
        agent.blocked_ticks = 0

        # Calculate progress amount based on skill and fatigue
        progress_increment = (0.15 / max(0.5, task.complexity)) * agent.skill_level * (1.0 - (agent.fatigue * 0.7))
        progress_increment *= agent.output_quality

        task.progress += progress_increment

        if task.progress >= 1.0:
            task.progress = 1.0
            task.status = "completed"
            agent.current_task_id = None
            agent.status = "idle"
            
            # Update department metrics
            if agent.department_id and agent.department_id in world_state.departments:
                dept = world_state.departments[agent.department_id]
                dept.completed_tasks += 1
                dept.active_tasks = max(0, dept.active_tasks - 1)

    def _find_work_indexed(
        self,
        agent: AgentState,
        world_state: WorldState,
        task_pools: dict[str, Any],
    ) -> None:
        """O(1) Task matching from indexed task pools."""
        task_to_take = None

        # 1. Check for tasks assigned specifically to this agent
        agent_queue = task_pools["by_agent"].get(agent.agent_id)
        if agent_queue:
            task_to_take = agent_queue.pop(0)
        else:
            # 2. Check for tasks matching agent's department or role
            dept_key = str(agent.department_id or "").lower()
            role_queue = task_pools["by_role"].get(dept_key)
            if role_queue:
                task_to_take = role_queue.pop(0)
            elif task_pools["general"]:
                # 3. Check general unassigned pool
                task_to_take = task_pools["general"].pop(0)

        if task_to_take:
            task_to_take.status = "in_progress"
            task_to_take.assigned_agent_id = agent.agent_id
            agent.current_task_id = task_to_take.task_id
            agent.status = "working"
            
            if agent.department_id and agent.department_id in world_state.departments:
                world_state.departments[agent.department_id].active_tasks += 1
        else:
            agent.status = "idle"

    def _apply_fatigue(self, agent: AgentState) -> None:
        if agent.status == "working":
            agent.fatigue = min(1.0, agent.fatigue + 0.04)
        else:
            agent.fatigue = max(0.0, agent.fatigue - 0.08)

        if agent.fatigue > 0.8:
            agent.output_quality = 0.5
        else:
            agent.output_quality = 1.0

        if agent.fatigue > 0.95:
            if self.rng.random() < 0.08:
                agent.status = "resigned"
                if agent.current_task_id:
                    agent.current_task_id = None

