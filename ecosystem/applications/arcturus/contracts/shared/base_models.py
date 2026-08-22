from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, List
from uuid import UUID, uuid4

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# 1. SHARED ERROR TAXONOMY
# ---------------------------------------------------------------------------

class ArcturusValidationError(Exception):
    """
    Base typed exception for all Arcturus platform services.
    Ensures safe failure handling across all boundaries.
    """
    def __init__(self, message: str, platform_source: str):
        self.message = message
        self.platform_source = platform_source
        super().__init__(f"[{platform_source}] {message}")


# ---------------------------------------------------------------------------
# 2. MASTER CONTEXT & ENVELOPES
# ---------------------------------------------------------------------------

class SimulationContext(BaseModel):
    """
    Master execution context inherited by every Arcturus contract.
    Merged to satisfy both Control Plane (Ontology) and Runtime Engine requirements.
    """
    # Standardized on UUID to satisfy Runtime strictness
    run_id: UUID = Field(
        default_factory=uuid4, 
        description="Unique identifier for the current simulation run"
    )
    trace_id: UUID = Field(
        default_factory=uuid4, 
        description="Traceability identifier for cross-platform logging and evaluation"
    )
    experiment_id: str = Field(
        ..., 
        min_length=3,
        description="Stable identifier for the overarching scenario experiment"
    )
    # Standardized name to avoid seed vs global_seed conflicts
    global_seed: int = Field(
        ..., 
        ge=0,
        description="Deterministic seed to ensure reproducible entity resolution and state transitions"
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp of context initialization"
    )
    config: dict[str, Any] = Field(
        default_factory=dict,
        description="Optional run-specific configurations"
    )

class ContractEnvelope(BaseModel):
    """
    Shared envelope for every platform-owned payload.
    Ensures the SimulationContext is always passed during handoffs.
    """
    context: SimulationContext

class DivisionContract(BaseModel):
    """Ontology division representing a functional branch of the Org."""
    div_id: float = Field(..., description="Unique structural division identifier")
    div_name: str = Field(..., description="E.g., 'Simulation Division'")
    org_id: float = Field(..., description="The parent organization ID this division belongs to")

class BusinessCapabilityContract(BaseModel):
    """Ontology capability modeling functional readiness states."""
    capability_id: float = Field(..., description="Unique capability identifier")
    capability_name: str = Field(..., description="E.g., 'Synthetic Payroll Execution'")
    status: str = Field(..., description="Current operational state: active, inactive, degrading")

class PolicyContract(BaseModel):
    """Ontology policy governing runtime decisions and process steps."""
    policy_id: float = Field(..., description="Unique rule/policy identifier")
    logic: str = Field(..., description="Executable boolean logic rule to be evaluated")
    severity_level: float = Field(..., description="Impact scale: 1.0 (Low), 2.0 (Medium), 3.0 (Critical)")

class ProcessContract(BaseModel):
    """Ontology process representing standard reusable operating models."""
    process_id: float = Field(..., description="Unique process template identifier")
    cap_id: float = Field(..., description="The underlying capability ID this process leverages")
    duration: float = Field(..., description="Minimum expected logical steps for process execution")

class GoalContract(BaseModel):
    """Ontology goal mapping targets for metric evaluations."""
    goal_id: float = Field(..., description="Unique objective identifier")
    target_metric: float = Field(..., description="Quantifiable target boundary of success")
    time_horizon: int = Field(..., description="Absolute logical clock timestamp target limit")

class DecisionContract(BaseModel):
    """Logs the explicit context and outcomes of AI Agent choices."""
    decision_id: float = Field(..., description="Unique decision instance identifier")
    emp_id: float = Field(..., description="ID of the synthetic worker agent making the decision")
    chosen_branch: str = Field(..., description="The chosen branch path taken by the decision model")
    rules_applied: List[float] = Field(default=[], description="List of policy IDs validated during choices")

class KnowledgeContract(BaseModel):
    """Ontology knowledge units that dictate agent intelligence accessibility."""
    knowledge_id: float = Field(..., description="Unique knowledge asset identifier")
    domain_tag: str = Field(..., description="E.g., 'Engineering Spec', 'Financial Policy'")
    access_level: str = Field(..., description="Authorization constraint: public, department, executive")

class TaskExecutionContract(BaseModel):
    """Structured data contract documenting a completed workflow task step."""
    task_id: float = Field(..., description="Unique task instance identifier")
    process_id: float = Field(..., description="The parent process configuration template ID")
    assignee_id: float = Field(..., description="Employee agent assigned to the task")
    sla_limit: int = Field(..., description="Max logical clock duration allowed for execution")
    elapsed_steps: int = Field(..., description="Actual clock steps elapsed during execution")
    outcome_status: str = Field(..., description="Result state: approved, rejected, escalated")

class SimulationEventPayload(BaseModel):
    """
    Standard data envelope emitted by Maaz's simulation runtime clock loop.
    Consumed by Amina's evaluation engine and Ahmed's data pipeline.
    """
    metadata: SimulationContext
    event_id: str = Field(..., description="Unique event identifier")
    event_type: str = Field(..., description="E.g., TASK_COMPLETED, POLICY_BREACH, AGENT_ESCALATION")
    affected_entities: List[float] = Field(default=[], description="List of structural IDs affected")
    observed_state_changes: str = Field(..., description="Serialized state transition log payload")


class APIErrorResponse(BaseModel):
    """
    Global standardized error response format across all Arcturus FastAPI endpoints.
    Maps to ArcturusValidationError and platform exceptions.
    """
    error_code: str = Field(..., description="Unique machine-readable error code")
    message: str = Field(..., description="Human-readable error explanation")
    platform_source: str = Field(..., description="Platform origin raising the error")
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp when the error occurred"
    )
    details: dict[str, Any] = Field(default_factory=dict, description="Additional context or validation metadata")

