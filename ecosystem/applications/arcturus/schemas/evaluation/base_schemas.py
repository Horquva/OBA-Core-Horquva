from __future__ import annotations

from typing import Any

from pydantic import Field

from ecosystem.applications.arcturus.contracts.shared.base_models import ContractEnvelope


class ExperimentResultPackage(ContractEnvelope):
    """
    CONFIRMED shape (per Maaz, 12/08) — inherits run_id / trace_id /
    experiment_id / global_seed via .context (ContractEnvelope).
    Access as result.context.run_id, etc.

    NOTE: Maaz's actual contracts/simulation/base_models.py with the real
    ExecutionStatus enum is on his feature/simulation-runtime branch, not
    yet merged into initiative/arcturus. final_status is typed as a plain
    str for now — update to his ExecutionStatus enum once his branch merges.
    """
    scenario_id: str = Field(..., min_length=3)
    final_status: str
    state_snapshot: dict[str, Any] = Field(default_factory=dict)
    event_count: int = Field(default=0, ge=0)
    checkpoint_refs: list[str] = Field(default_factory=list)