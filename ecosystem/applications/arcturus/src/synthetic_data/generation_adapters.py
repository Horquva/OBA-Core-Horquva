"""
Day 3 — Adapters & Integration Wiring, Synthetic Data Platform.

Confirmed handoff shape (locked with Maaz, PR #55):
    SimulationContext --> [this module] --> SyntheticGenerationResult
                                             (context + artifacts +
                                              relationships +
                                              deterministic_fingerprint)

Maaz's RuntimeEngine.initialize_run() consumes SyntheticGenerationResult
directly as a shared Pydantic contract. This module exists so the handoff
has one explicit, testable seam instead of Maaz importing
SyntheticGenerationService internals directly (Architectural Law 2.1).
"""

from __future__ import annotations

from ecosystem.applications.arcturus.contracts.shared.base_models import (
    ArcturusValidationError,
    SimulationContext,
)
from ecosystem.applications.arcturus.contracts.synthetic_data.base_models import (
    SyntheticGenerationRequest,
    SyntheticGenerationResult,
)
from ecosystem.applications.arcturus.src.synthetic_data.generation_service import (
    SyntheticGenerationService,
)

PLATFORM_SOURCE = "synthetic_data"


def generate_for_runtime(
    context: SimulationContext,
    requested_artifact_count: int | None = None,
    requested_artifact_types: list[str] | None = None,
) -> SyntheticGenerationResult:
    """
    Runtime-facing adapter: build a SyntheticGenerationRequest from the
    SimulationContext Maaz's engine hands off, run generation, and return
    the SyntheticGenerationResult for RuntimeEngine.initialize_run().

    Failure behavior: this never returns a partial or empty result.
    SyntheticGenerationResult.artifacts has a contract-level min_length=1,
    so any generation failure raises ArcturusValidationError instead —
    there is no "empty result" case for the runtime to handle.
    """

    if not isinstance(context, SimulationContext):
        raise ArcturusValidationError(
            message="generate_for_runtime requires a SimulationContext",
            platform_source=PLATFORM_SOURCE,
        )

    request = SyntheticGenerationRequest(
        context=context,
        requested_artifact_count=requested_artifact_count,
        requested_artifact_types=requested_artifact_types or [],
    )

    return SyntheticGenerationService().generate_snapshot(request)


__all__ = ["generate_for_runtime"]