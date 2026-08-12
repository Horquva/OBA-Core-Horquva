from datetime import datetime, timezone
from uuid import UUID

import pytest

from ecosystem.applications.arcturus.contracts.shared.base_models import (
    ArcturusValidationError,
    SimulationContext,
)
from ecosystem.applications.arcturus.contracts.synthetic_data.base_models import (
    SyntheticGenerationRequest,
)
from ecosystem.applications.arcturus.src.synthetic_data.generation_service import (
    SyntheticGenerationService,
)


FIXED_RUN_ID = UUID("00000000-0000-0000-0000-000000000001")
FIXED_TRACE_ID = UUID("00000000-0000-0000-0000-000000000002")
FIXED_CREATED_AT = datetime(
    2026,
    8,
    11,
    12,
    0,
    0,
    tzinfo=timezone.utc,
)


def build_context(
    global_seed: int = 42,
) -> SimulationContext:
    return SimulationContext(
        run_id=FIXED_RUN_ID,
        trace_id=FIXED_TRACE_ID,
        experiment_id="EXP-001",
        global_seed=global_seed,
        created_at=FIXED_CREATED_AT,
    )


def test_same_context_and_seed_produce_same_result() -> None:
    service = SyntheticGenerationService()

    request = SyntheticGenerationRequest(
        context=build_context(),
        requested_artifact_count=3,
        requested_artifact_types=[
            "document",
            "report",
            "ticket",
        ],
    )

    first = service.generate_snapshot(request)
    second = service.generate_snapshot(request)

    assert first.model_dump(mode="json") == second.model_dump(mode="json")
    assert (
        first.deterministic_fingerprint
        == second.deterministic_fingerprint
    )


def test_different_seed_changes_generated_output() -> None:
    service = SyntheticGenerationService()

    first_request = SyntheticGenerationRequest(
        context=build_context(global_seed=42),
        requested_artifact_count=2,
        requested_artifact_types=["document"],
    )

    second_request = SyntheticGenerationRequest(
        context=build_context(global_seed=43),
        requested_artifact_count=2,
        requested_artifact_types=["document"],
    )

    first = service.generate_snapshot(first_request)
    second = service.generate_snapshot(second_request)

    assert (
        first.deterministic_fingerprint
        != second.deterministic_fingerprint
    )


def test_result_preserves_simulation_context() -> None:
    service = SyntheticGenerationService()

    context = build_context()

    request = SyntheticGenerationRequest(
        context=context,
        requested_artifact_count=1,
        requested_artifact_types=["document"],
    )

    result = service.generate_snapshot(request)

    assert result.context.run_id == context.run_id
    assert result.context.trace_id == context.trace_id
    assert result.context.experiment_id == context.experiment_id
    assert result.context.global_seed == context.global_seed


def test_every_generated_artifact_is_linked_to_run() -> None:
    service = SyntheticGenerationService()

    context = build_context()

    request = SyntheticGenerationRequest(
        context=context,
        requested_artifact_count=3,
        requested_artifact_types=["document"],
    )

    result = service.generate_snapshot(request)

    assert len(result.relationships) == 3

    for relationship in result.relationships:
        assert relationship.target_id == str(context.run_id)
        assert relationship.target_type == "simulation_run"
        assert relationship.relationship_type == "generated_for_run"


def test_unsupported_artifact_type_fails_safely() -> None:
    service = SyntheticGenerationService()

    request = SyntheticGenerationRequest(
        context=build_context(),
        requested_artifact_count=1,
        requested_artifact_types=["unsupported_type"],
    )

    with pytest.raises(ArcturusValidationError) as error:
        service.generate_snapshot(request)

    assert error.value.platform_source == "synthetic_data"