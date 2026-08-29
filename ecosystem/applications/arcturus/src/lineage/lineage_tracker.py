"""
src/lineage/lineage_tracker.py

Shared lineage utility: experiment_id -> seed -> config -> tick -> event
-> data_point. Owned by Ahmed (Day 4), importable by any platform that
needs to attach a lineage chain to an artifact it produces.

Status: 🟢 IMPLEMENTED
"""

from __future__ import annotations

import hashlib
import json
from typing import Any

from ecosystem.applications.arcturus.contracts.shared.base_models import (
    SimulationContext,
)
from ecosystem.applications.arcturus.contracts.synthetic_data.base_models import (
    LineageRecord,
)


def build_config_fingerprint(config: dict[str, Any]) -> str:
    """Stable fingerprint of a run config, for the lineage chain's config link."""
    canonical_json = json.dumps(config, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()


def build_lineage_record(
    context: SimulationContext,
    tick: int,
    event_id: str,
    data_point_id: str,
) -> LineageRecord:
    """Build one lineage link. Every accepted data point must have exactly one."""
    return LineageRecord(
        experiment_id=context.experiment_id,
        global_seed=context.global_seed,
        config_fingerprint=build_config_fingerprint(context.config),
        tick=tick,
        event_id=event_id,
        data_point_id=data_point_id,
    )


__all__ = ["build_config_fingerprint", "build_lineage_record"]