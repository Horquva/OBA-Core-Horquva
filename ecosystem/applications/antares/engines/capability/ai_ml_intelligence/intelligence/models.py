"""
Antares AI/ML Intelligence Layer — Domain Models
Owner: Muhammad Hasnain Ajmal
Part-2: AI/ML Intelligence Foundation

These are the core data structures used across the experiment engine,
reasoning engine, and capability registry. Every object is versioned,
timestamped, and traceable — no silent/unstructured outputs allowed.
"""

from __future__ import annotations
import uuid
import time
import json
from dataclasses import dataclass, field, asdict
from typing import Any, Optional


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def now_ts() -> float:
    return time.time()


@dataclass
class ExperimentConfig:
    """Configuration for a single reproducible experiment."""
    model: str
    task_type: str                      # e.g. "planning", "reasoning", "classification"
    prompt_template: str
    parameters: dict = field(default_factory=dict)  # temperature, max_tokens, etc.
    dataset_ref: Optional[str] = None


@dataclass
class ExperimentResult:
    """Structured, evaluable result of running one experiment case."""
    experiment_id: str
    case_id: str
    input: Any
    output: Any
    expected: Any
    score: Optional[float]
    passed: Optional[bool]
    latency_ms: float
    error: Optional[str] = None
    metadata: dict = field(default_factory=dict)
    created_at: float = field(default_factory=now_ts)


@dataclass
class ExperimentRecord:
    """Full record of an experiment run — reproducibility metadata included."""
    id: str
    name: str
    config: ExperimentConfig
    results: list = field(default_factory=list)   # list[ExperimentResult]
    summary: dict = field(default_factory=dict)    # aggregate metrics
    status: str = "created"                          # created|running|completed|failed
    created_at: float = field(default_factory=now_ts)
    completed_at: Optional[float] = None

    def to_json(self) -> str:
        d = asdict(self)
        return json.dumps(d, indent=2, default=str)


@dataclass
class PlanStep:
    step_id: str
    description: str
    action: str
    status: str = "pending"       # pending|done|failed|skipped
    result: Any = None


@dataclass
class Plan:
    """Structured plan produced by the reasoning engine (Part-4)."""
    id: str
    goal: str
    steps: list                      # list[PlanStep]
    confidence: float
    reasoning_trace: list = field(default_factory=list)  # list[str]
    created_at: float = field(default_factory=now_ts)

    def to_json(self) -> str:
        d = asdict(self)
        return json.dumps(d, indent=2, default=str)


@dataclass
class IntelligenceCapability:
    """
    Registry entry for a validated AI/ML capability that can be exposed
    to the Agent layer (Part-6 integration boundary).
    """
    id: str
    name: str
    task_types: list
    model_ref: str
    evaluation_status: str          # "unevaluated"|"passing"|"failing"
    performance: dict = field(default_factory=dict)  # latency, score, cost
    version: str = "0.1.0"
    limitations: list = field(default_factory=list)
    promoted: bool = False
