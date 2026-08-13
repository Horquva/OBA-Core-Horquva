from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
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