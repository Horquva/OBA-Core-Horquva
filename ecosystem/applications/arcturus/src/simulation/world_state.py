from __future__ import annotations

from typing import Dict, List, Any, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field

class AgentState(BaseModel):
    agent_id: str
    name: str
    role_id: int
    department_id: Optional[str] = None
    status: str = "idle"  # idle, working, blocked, degraded, resigned
    current_task_id: Optional[str] = None
    fatigue: float = 0.0  # 0.0 to 1.0
    output_quality: float = 1.0 # 0.0 to 1.0
    blocked_ticks: int = 0
    skill_level: float = 1.0

class DepartmentState(BaseModel):
    department_id: str
    name: str
    headcount: int = 0
    budget_total: float = 0.0
    budget_remaining: float = 0.0
    active_tasks: int = 0
    completed_tasks: int = 0

class ResourcePool(BaseModel):
    global_budget_remaining: float = 0.0
    compute_capacity: float = 100.0
    inventory_level: int = 0

class TaskState(BaseModel):
    task_id: str
    name: str
    status: str = "queued" # queued, in_progress, review, completed, failed
    assigned_agent_id: Optional[str] = None
    progress: float = 0.0 # 0.0 to 1.0
    complexity: float = 1.0
    required_role: Optional[str] = None
    requires_collab: bool = False
    resource_cost: float = 0.0

class SimulationEvent(BaseModel):
    event_id: str
    tick: int
    type: str
    target: Optional[str] = None
    severity: str = "info" # info, warning, critical
    details: Dict[str, Any] = Field(default_factory=dict)

class KPISnapshot(BaseModel):
    throughput: int = 0
    avg_latency_ms: float = 0.0
    error_rate: float = 0.0
    customer_satisfaction: float = 1.0
    budget_burn_rate: float = 0.0

class WorldState(BaseModel):
    """Complete simulation state at a given tick."""
    tick: int = 0
    last_step_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    departments: Dict[str, DepartmentState] = Field(default_factory=dict)
    agents: Dict[str, AgentState] = Field(default_factory=dict)
    resources: ResourcePool = Field(default_factory=ResourcePool)
    task_queue: Dict[str, TaskState] = Field(default_factory=dict)
    events_log: List[SimulationEvent] = Field(default_factory=list)
    kpis: KPISnapshot = Field(default_factory=KPISnapshot)
