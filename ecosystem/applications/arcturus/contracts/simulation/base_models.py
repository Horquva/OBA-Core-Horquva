"""
Simulation Runtime & Experiment Platform — Contracts
Owner: Muhammad Maaz Khan

Pydantic contracts that mediate every cross-platform handoff into and out of
the Simulation Runtime. Per the Arcturus workflow standard, no platform may
import another platform's internal code directly — all communication happens
through these validated payloads.

Status: DRAFT. Payloads marked "PROPOSED" need to be confirmed jointly with
Amina (Validation) and Javeria (Behavior & Workflow) before being locked.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Master context — every other Runtime contract inherits run identity from this
# ---------------------------------------------------------------------------

class SimulationContext(BaseModel):
    """The bounded 'world' of a single simulation run."""

    run_id: UUID = Field(default_factory=uuid4)
    seed: int = Field(
        ..., description="Deterministic seed propagated from Maryam's ScenarioDSLPayload.seed"
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    config: dict[str, Any] = Field(default_factory=dict)


class ExecutionStatus(str, Enum):
    CREATED = "created"
    INITIALIZED = "initialized"
    RUNNING = "running"
    PAUSED = "paused"
    CHECKPOINTING = "checkpointing"
    COMPLETED = "completed"
    ABORTED = "aborted"
    FAILED = "failed"


# ---------------------------------------------------------------------------
# INBOUND — what the Runtime consumes from other platforms
# ---------------------------------------------------------------------------

class EnterpriseStateContract(BaseModel):
    """From Ajwa's Synthetic Enterprise Platform."""
    enterprise_id: str
    business_functions: list[str] = Field(default_factory=list)
    hierarchy: dict[str, Any] = Field(default_factory=dict)


class CapabilityDependencyGraph(BaseModel):
    """From Hamza's Enterprise Ontology Platform. Must be acyclic — Hamza's
    spec warns a cycle here freezes the engine, so we validate on load."""
    nodes: list[str]
    edges: list[tuple[str, str]] = Field(default_factory=list)

    @field_validator("edges")
    @classmethod
    def no_self_loops(cls, edges: list[tuple[str, str]]) -> list[tuple[str, str]]:
        for a, b in edges:
            if a == b:
                raise ValueError(f"Self-referential dependency not allowed: {a} -> {b}")
        return edges


class WorkflowDefinitionContract(BaseModel):
    """From Javeria's Behavior & Workflow Platform."""
    workflow_id: str
    activities: list[dict[str, Any]] = Field(default_factory=list)
    sla_seconds: int | None = None


class ScenarioDSLPayload(BaseModel):
    """From Maryam's Scenario Engineering Platform (13-field DSL)."""
    scenario_id: str = Field(..., pattern=r"^SCN-[A-Z]{2}-\d{3}$")
    seed: int
    variables: dict[str, Any] = Field(default_factory=dict)
    constraints: dict[str, Any] = Field(default_factory=dict)
    extra_fields: dict[str, Any] = Field(default_factory=dict)


class WorkforceAgentRoster(BaseModel):
    """From Syeda's Synthetic Workforce & Agent Platform."""
    agents: list[dict[str, Any]] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# OUTBOUND — what the Runtime produces for other platforms
# ---------------------------------------------------------------------------

class ExperimentResultPackage(BaseModel):
    """PROPOSED — for Amina's Validation & Evaluation Platform.
    Not locked until confirmed with her (see Implementation Plan)."""
    run_id: UUID
    scenario_id: str
    final_status: ExecutionStatus
    state_snapshot: dict[str, Any] = Field(default_factory=dict)
    event_count: int = 0
    checkpoint_refs: list[str] = Field(default_factory=list)


class WorkflowExecutionMetrics(BaseModel):
    """For Javeria's Behavior & Workflow Platform."""
    run_id: UUID
    workflow_id: str
    sla_breaches: int = 0
    queue_wait_seconds_avg: float = 0.0
    completions: int = 0
    escalations: int = 0


class RunHistoryRecord(BaseModel):
    """Internal — written to the Experiment Registry."""
    run_id: UUID
    seed: int
    config: dict[str, Any]
    status: ExecutionStatus
    started_at: datetime
    ended_at: datetime | None = None