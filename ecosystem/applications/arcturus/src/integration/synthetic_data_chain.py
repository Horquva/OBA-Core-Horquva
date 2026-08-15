"""
Day 5 — End-to-End Slice, Synthetic Data Platform.

Ahmad's platform is not itself a named node in the Day 5 E2E chain
(Ontology -> Enterprise -> Workforce -> Behavior -> Scenario -> Runtime ->
Validation); it is the feeder Maaz's Runtime step consumes before that
chain begins (locked Day 3, PR #55). This module is the single testable
entry point that proves that hand-off end to end and produces run-level
evidence for the Day 5 review bundle.

NOTE (REPO-VERIFY): the exact shape governance_evidence.aggregate_evidence()
expects hasn't been confirmed with Hashim yet. build_chain_evidence() below
returns a plain, serializable dict deliberately, so it can be adapted to
whatever shape he confirms without reworking the chain logic itself.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from ecosystem.applications.arcturus.contracts.shared.base_models import (
    SimulationContext,
)
from ecosystem.applications.arcturus.contracts.synthetic_data.base_models import (
    SyntheticGenerationResult,
)
from ecosystem.applications.arcturus.src.synthetic_data.generation_adapters import (
    generate_for_runtime,
)

PLATFORM_SOURCE = "synthetic_data"


def run_synthetic_data_chain(
    context: SimulationContext,
    requested_artifact_count: int | None = None,
    requested_artifact_types: list[str] | None = None,
) -> tuple[SyntheticGenerationResult, dict[str, Any]]:
    """
    Execute one full Synthetic Data slice for the Day 5 E2E run.

    Returns:
        (result, evidence) — result is the SyntheticGenerationResult ready
        for RuntimeEngine.initialize_run(); evidence is a plain dict safe
        to serialize into the governance evidence package.
    """

    started_at = datetime.now(timezone.utc)

    result = generate_for_runtime(
        context=context,
        requested_artifact_count=requested_artifact_count,
        requested_artifact_types=requested_artifact_types,
    )

    evidence = build_chain_evidence(result=result, started_at=started_at)

    return result, evidence


def build_chain_evidence(
    result: SyntheticGenerationResult,
    started_at: datetime,
) -> dict[str, Any]:
    """Build a plain, serializable evidence record for this chain run."""

    return {
        "platform_source": PLATFORM_SOURCE,
        "run_id": str(result.context.run_id),
        "trace_id": str(result.context.trace_id),
        "experiment_id": result.context.experiment_id,
        "global_seed": result.context.global_seed,
        "artifact_count": len(result.artifacts),
        "relationship_count": len(result.relationships),
        "deterministic_fingerprint": result.deterministic_fingerprint,
        "started_at": started_at.isoformat(),
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "status": "pass",
    }


__all__ = ["run_synthetic_data_chain", "build_chain_evidence"]