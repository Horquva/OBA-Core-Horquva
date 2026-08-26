"""
Simulation Runtime & Experiment Platform â€” Contracts
Owner: Muhammad Maaz Khan

SimulationContext + ContractEnvelope now live in
contracts/shared/base_models.py (locked by Hashim) and are imported here,
not redefined, per the architecture directive.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

from ecosystem.applications.arcturus.contracts.shared.base_models import (
    ContractEnvelope,
    SimulationContext,
)


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
# INBOUND â€” what the Runtime consumes from other platforms
# ---------------------------------------------------------------------------

class EnterpriseStateContract(BaseModel):
    """From Ajwa's Synthetic Enterprise Platform."""
    enterprise_id: str
    business_functions: list[str] = Field(default_factory=list)
    hierarchy: dict[str, Any] = Field(default_factory=dict)


class CapabilityDependencyGraph(BaseModel):
    """From Hamza's Enterprise Ontology Platform. Must be acyclic.
    NOTE: this is Maaz's placeholder shape - not yet confirmed against
    Hamza's real OntologySnapshotContract."""

    nodes: list[str] = Field(default_factory=list)
    edges: list[tuple[str, str]] = Field(default_factory=list)

    @field_validator("edges")
    @classmethod
    def no_self_loops(cls, edges: list[tuple[str, str]]) -> list[tuple[str, str]]:
        for a, b in edges:
            if a == b:
                raise ValueError(f"Self-referential dependency not allowed: {a} -> {b}")
        return edges

    @model_validator(mode="after")
    def no_cycles(self) -> "CapabilityDependencyGraph":
        adjacency = {node: [] for node in self.nodes}
        for src, dst in self.edges:
            if src not in adjacency:
                adjacency[src] = []
            if dst not in adjacency:
                adjacency[dst] = []
            adjacency[src].append(dst)

        visited: set[str] = set()
        stack: set[str] = set()

        def visit(node: str) -> None:
            if node in stack:
                raise ValueError("Dependency graph contains a cycle")
            if node in visited:
                return
            stack.add(node)
            for child in adjacency.get(node, []):
                visit(child)
            stack.remove(node)
            visited.add(node)

        for node in adjacency:
            visit(node)
        return self


class WorkflowDefinitionContract(BaseModel):
    """From Javeria's Behavior & Workflow Platform."""

    workflow_id: str = Field(..., min_length=3)
    activities: list[dict[str, Any]] = Field(default_factory=list)
    sla_seconds: int | None = Field(default=None, ge=0)


class ScenarioDSLPayload(BaseModel):
    """From Maryam's Scenario Engineering Platform (13-field DSL)."""

    scenario_id: str = Field(..., pattern=r"^SCN-[A-Z]{2}-\d{3}$")
    seed: int = Field(..., ge=0)
    variables: dict[str, Any] = Field(default_factory=dict)
    constraints: dict[str, Any] = Field(default_factory=dict)
    extra_fields: dict[str, Any] = Field(default_factory=dict)


class WorkforceAgentRoster(BaseModel):
    """From Syeda's Synthetic Workforce & Agent Platform."""

    agents: list[dict[str, Any]] = Field(default_factory=list)

    @field_validator("agents")
    @classmethod
    def agents_must_have_roles(cls, value: list[dict[str, Any]]) -> list[dict[str, Any]]:
        for agent in value:
            if not agent.get("role"):
                raise ValueError("Each agent must expose a non-empty role")
        return value


# ---------------------------------------------------------------------------
# OUTBOUND â€” what the Runtime produces for other platforms
# ---------------------------------------------------------------------------

class ExperimentResultPackage(ContractEnvelope):
    """For Amina's Validation & Evaluation Platform.
    Inherits run_id/trace_id/experiment_id/global_seed via .context (ContractEnvelope)."""

    scenario_id: str = Field(..., min_length=3)
    final_status: ExecutionStatus
    state_snapshot: dict[str, Any] = Field(default_factory=dict)
    event_count: int = Field(default=0, ge=0)
    checkpoint_refs: list[str] = Field(default_factory=list)


class WorkflowExecutionMetrics(BaseModel):
    """For Javeria's Behavior & Workflow Platform."""

    run_id: UUID
    workflow_id: str = Field(..., min_length=3)
    sla_breaches: int = Field(default=0, ge=0)
    queue_wait_seconds_avg: float = Field(default=0.0, ge=0.0)
    completions: int = Field(default=0, ge=0)
    escalations: int = Field(default=0, ge=0)


class RunHistoryRecord(BaseModel):
    """Internal â€” written to Maaz's own run registry."""

    run_id: UUID
    seed: int = Field(..., ge=0)
    config: dict[str, Any] = Field(default_factory=dict)
    status: ExecutionStatus
    started_at: datetime
    ended_at: datetime | None = None

    @model_validator(mode="after")
    def ended_after_started(self) -> "RunHistoryRecord":
        if self.ended_at is not None and self.ended_at < self.started_at:
            raise ValueError("ended_at must be on or after started_at")
        return self


class SimulationEventStream(BaseModel):
    """
    Canonical shape for events published to the WebSocket/SSE stream during
    a simulation run. One instance per tick/status/stage/error event.
    Consumed by Ahmed's Synthetic Data platform and the frontend.
    """

    event_type: Literal["TICK", "STAGE_CHANGE", "STATUS_UPDATE", "ERROR"]
    experiment_id: str
    run_id: UUID
    tick: int | None = None
    payload: dict[str, Any] = Field(default_factory=dict)
    emitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
