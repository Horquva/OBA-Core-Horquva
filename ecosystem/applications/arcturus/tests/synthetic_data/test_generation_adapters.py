from datetime import datetime, timezone
from uuid import UUID

import pytest

from ecosystem.applications.arcturus.contracts.shared.base_models import (
    ArcturusValidationError,
    SimulationContext,
)
from ecosystem.applications.arcturus.contracts.synthetic_data.base_models import (
    SyntheticGenerationResult,
)
from ecosystem.applications.arcturus.src.synthetic_data.generation_adapters import (
    generate_for_runtime,
)


FIXED_RUN_ID = UUID("00000000-0000-0000-0000-000000000001")
FIXED_TRACE_ID = UUID("00000000-0000-0000-0000-000000000002")
FIXED_CREATED_AT = datetime(2026, 8, 13, 12, 0, 0, tzinfo=timezone.utc)


def build_context(global_seed: int = 42) -> SimulationContext:
    return SimulationContext(
        run_id=FIXED_RUN_ID,
        trace_id=FIXED_TRACE_ID,
        experiment_id="EXP-001",
        global_seed=global_seed,
        created_at=FIXED_CREATED_AT,
    )


def test_result_matches_shape_maaz_confirmed() -> None:
    context = build_context()

    result = generate_for_runtime(
        context=context,
        requested_artifact_count=2,
        requested_artifact_types=["document"],
    )

    assert isinstance(result, SyntheticGenerationResult)
    assert result.context.run_id == context.run_id
    assert result.context.trace_id == context.trace_id
    assert result.context.experiment_id == context.experiment_id
    assert result.context.global_seed == context.global_seed
    assert len(result.artifacts) == 2
    assert result.deterministic_fingerprint


def test_same_context_is_deterministic_through_the_adapter() -> None:
    context = build_context()

    first = generate_for_runtime(context=context, requested_artifact_count=3)
    second = generate_for_runtime(context=context, requested_artifact_count=3)

    assert first.deterministic_fingerprint == second.deterministic_fingerprint


def test_rejects_non_context_input() -> None:
    with pytest.raises(ArcturusValidationError):
        generate_for_runtime(context="not-a-context")  # type: ignore[arg-type]


def test_never_returns_empty_result_on_failure() -> None:
    context = build_context()

    with pytest.raises(ArcturusValidationError):
        generate_for_runtime(
            context=context,
            requested_artifact_count=1,
            requested_artifact_types=["not_a_real_type"],
        )


def test_blank_artifact_type_string_fails_safely() -> None:
    context = build_context()

    with pytest.raises(ArcturusValidationError):
        generate_for_runtime(
            context=context,
            requested_artifact_count=1,
            requested_artifact_types=["   "],
        )