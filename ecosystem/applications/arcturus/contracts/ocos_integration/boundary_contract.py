"""
OBA/OCOS Integration Boundary Contracts.
Status: 🔵 FOUNDATION (Forward-compatible interfaces for OBA core & OCOS host ecosystem integration).
"""
from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field

from ecosystem.applications.arcturus.contracts.shared.base_models import SimulationContext


class HostSystemType(str, Enum):
    """Supported host integration layers in the Horquva ecosystem."""
    OBA_CORE = "OBA_CORE"
    OCOS_RUNTIME = "OCOS_RUNTIME"
    STANDALONE_ARCTURUS = "STANDALONE_ARCTURUS"


class BoundaryCapabilityStatus(str, Enum):
    """Capability maturity flag."""
    FOUNDATION = "FOUNDATION"
    PROVISIONAL = "PROVISIONAL"
    VALIDATED = "VALIDATED"


class EcosystemBoundaryEnvelope(BaseModel):
    """
    Standard message envelope passed across OBA/OCOS ecosystem boundaries.
    """
    boundary_id: UUID = Field(default_factory=uuid4, description="Unique boundary exchange identifier")
    source_system: HostSystemType = Field(default=HostSystemType.STANDALONE_ARCTURUS)
    target_system: HostSystemType = Field(default=HostSystemType.OBA_CORE)
    capability_status: BoundaryCapabilityStatus = Field(default=BoundaryCapabilityStatus.FOUNDATION)
    context: SimulationContext
    payload_type: str = Field(..., description="E.g. SIMULATION_CHECKPOINT, EVIDENCE_EXPORT, METRIC_TELEMETRY")
    payload: dict[str, Any] = Field(default_factory=dict, description="Generic serializable boundary payload")
    emitted_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp of boundary message creation"
    )

class SimulationCheckpointExport(BaseModel):
    """Payload type: SIMULATION_CHECKPOINT — exports a run checkpoint to OCOS."""
    run_id: str
    experiment_id: str
    tick: int
    checkpoint_data: dict[str, Any]
    status: BoundaryCapabilityStatus = BoundaryCapabilityStatus.FOUNDATION

class EvidenceExportPayload(BaseModel):
    """Payload type: EVIDENCE_EXPORT — sends validated evidence corpus to OBA Core."""
    run_id: str
    artifact_count: int
    validation_status: str  # VALIDATED | REJECTED | INCONCLUSIVE
    evidence_summary: dict[str, Any]
    status: BoundaryCapabilityStatus = BoundaryCapabilityStatus.FOUNDATION

class MetricTelemetryPayload(BaseModel):
    """Payload type: METRIC_TELEMETRY — forwards simulation metrics to OCOS telemetry layer."""
    run_id: str
    tick: int
    metrics: dict[str, float]
    status: BoundaryCapabilityStatus = BoundaryCapabilityStatus.FOUNDATION
