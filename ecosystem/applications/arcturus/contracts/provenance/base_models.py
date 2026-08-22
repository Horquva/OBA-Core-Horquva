from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


def generate_lineage_hash(
    experiment_id: str,
    seed: int,
    tick: int,
    event_id: str,
    entity_id: str | float | None = None,
    parent_hashes: list[str] | None = None,
) -> str:
    """
    Generates a deterministic SHA-256 lineage hash capturing the exact causal provenance
    chain (experiment -> seed -> tick -> event -> entity -> parents).
    """
    payload = {
        "experiment_id": experiment_id,
        "seed": seed,
        "tick": tick,
        "event_id": str(event_id),
        "entity_id": str(entity_id) if entity_id is not None else "NONE",
        "parent_hashes": sorted(parent_hashes or []),
    }
    encoded = json.dumps(payload, sort_keys=True).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


class ProvenanceRecord(BaseModel):
    """
    Deterministic lineage record ensuring every generated artifact, metric,
    and event can be traced back to its root experiment configuration.
    """
    experiment_id: str = Field(..., description="Root experiment identifier")
    run_id: UUID = Field(..., description="Simulation run identifier")
    seed: int = Field(..., description="Deterministic seed used")
    tick: int = Field(..., ge=0, description="Simulation tick count when generated")
    event_id: str = Field(..., description="Specific simulation event ID that triggered creation")
    entity_id: str | None = Field(default=None, description="Optional entity ID primarily involved")
    parent_hashes: list[str] = Field(default_factory=list, description="Direct upstream ancestor lineage hashes")
    lineage_hash: str = Field(..., description="SHA-256 deterministic hash of this provenance record")
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp of provenance registration"
    )
    metadata: dict[str, Any] = Field(default_factory=dict, description="Supplementary lineage tags")

    @classmethod
    def create(
        cls,
        experiment_id: str,
        run_id: UUID,
        seed: int,
        tick: int,
        event_id: str,
        entity_id: str | float | None = None,
        parent_hashes: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> ProvenanceRecord:
        """Helper to create a ProvenanceRecord with auto-computed lineage_hash."""
        lineage_hash = generate_lineage_hash(
            experiment_id=experiment_id,
            seed=seed,
            tick=tick,
            event_id=event_id,
            entity_id=entity_id,
            parent_hashes=parent_hashes,
        )
        return cls(
            experiment_id=experiment_id,
            run_id=run_id,
            seed=seed,
            tick=tick,
            event_id=event_id,
            entity_id=str(entity_id) if entity_id is not None else None,
            parent_hashes=parent_hashes or [],
            lineage_hash=lineage_hash,
            metadata=metadata or {},
        )
