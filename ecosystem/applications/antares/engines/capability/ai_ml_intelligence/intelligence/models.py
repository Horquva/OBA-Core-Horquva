from __future__ import annotations
import uuid
import time
from dataclasses import dataclass, field
from typing import Any, Optional


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def now_ts() -> float:
    return time.time()


@dataclass
class PlanStep:
    step_id: str
    description: str
    action: str
    status: str = "pending"
    result: Any = None


@dataclass
class Plan:
    id: str
    goal: str
    steps: list
    confidence: float
    reasoning_trace: list = field(default_factory=list)
    created_at: float = field(default_factory=now_ts)


@dataclass
class ExperimentConfig:
    model: str
    task_type: str
    prompt_template: str
    parameters: dict = field(default_factory=dict)
    dataset_ref: Optional[str] = None


@dataclass
class ExperimentResult:
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
    id: str
    name: str
    config: ExperimentConfig
    results: list = field(default_factory=list)
    summary: dict = field(default_factory=dict)
    status: str = "created"
    created_at: float = field(default_factory=now_ts)
    completed_at: Optional[float] = None

    def to_json(self) -> str:
        import json
        from dataclasses import asdict
        return json.dumps(asdict(self), indent=2, default=str)


@dataclass
class IntelligenceCapability:
    id: str
    name: str
    task_types: list
    model_ref: str
    evaluation_status: str
    performance: dict = field(default_factory=dict)
    version: str = "0.1.0"
    limitations: list = field(default_factory=list)
    promoted: bool = False
