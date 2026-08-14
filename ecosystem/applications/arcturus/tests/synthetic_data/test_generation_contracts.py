from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from ecosystem.applications.arcturus.contracts.shared.base_models import (
    SimulationContext,
)
from ecosystem.applications.arcturus.contracts.synthetic_data.base_models import (
    SyntheticArtifactContract,
    SyntheticGenerationRequest,
    SyntheticGenerationResult,
    SyntheticRelationshipContract,
)


def build_context() -> SimulationContext:
    return SimulationContext(
        experiment_id="EXP-001",
        global_seed=42,
    )


def build_artifact(artifact_id: str = "ART-001") -> SyntheticArtifactContract:
    context = build_context()

    return SyntheticArtifactContract(
        artifact_id=artifact_id,
        artifact_type="document",
        content={"title": "Synthetic enterprise document"},
        metadata={"source": "synthetic_data"},
        lifecycle_state="generated",
        version=1,
        owner_entity_id="ENT-001",
        created_at=context.created_at,
        provenance={
            "run_id": str(context.run_id),
            "global_seed": context.global_seed,
        },
    )


def test_generation_request_uses_shared_simulation_context() -> None:
    context = build_context()

    request = SyntheticGenerationRequest(context=context)

    assert request.context.run_id == context.run_id
    assert request.context.trace_id == context.trace_id
    assert request.context.experiment_id == "EXP-001"
    assert request.context.global_seed == 42


def test_generation_result_exposes_runtime_tracking_through_context() -> None:
    context = build_context()

    artifact = SyntheticArtifactContract(
        artifact_id="ART-001",
        artifact_type="document",
        content={"title": "Synthetic enterprise document"},
        lifecycle_state="generated",
        created_at=context.created_at,
        provenance={
            "run_id": str(context.run_id),
            "global_seed": context.global_seed,
        },
    )

    result = SyntheticGenerationResult(
        context=context,
        artifacts=[artifact],
        deterministic_fingerprint="fingerprint-001",
    )

    assert result.context.run_id == context.run_id
    assert result.context.trace_id == context.trace_id
    assert result.context.experiment_id == context.experiment_id
    assert result.context.global_seed == context.global_seed


def test_empty_success_result_is_rejected() -> None:
    context = build_context()

    with pytest.raises(ValidationError):
        SyntheticGenerationResult(
            context=context,
            artifacts=[],
            deterministic_fingerprint="fingerprint-001",
        )


def test_duplicate_artifact_ids_are_rejected() -> None:
    context = build_context()

    first = SyntheticArtifactContract(
        artifact_id="ART-001",
        artifact_type="document",
        lifecycle_state="generated",
        created_at=context.created_at,
        provenance={"global_seed": context.global_seed},
    )

    second = SyntheticArtifactContract(
        artifact_id="ART-001",
        artifact_type="report",
        lifecycle_state="generated",
        created_at=context.created_at,
        provenance={"global_seed": context.global_seed},
    )

    with pytest.raises(ValidationError):
        SyntheticGenerationResult(
            context=context,
            artifacts=[first, second],
            deterministic_fingerprint="fingerprint-001",
        )


def test_relationship_source_must_reference_generated_artifact() -> None:
    context = build_context()

    artifact = SyntheticArtifactContract(
        artifact_id="ART-001",
        artifact_type="document",
        lifecycle_state="generated",
        created_at=context.created_at,
        provenance={"global_seed": context.global_seed},
    )

    invalid_relationship = SyntheticRelationshipContract(
        source_artifact_id="ART-UNKNOWN",
        target_id="ENT-001",
        target_type="enterprise_entity",
        relationship_type="owned_by",
    )

    with pytest.raises(ValidationError):
        SyntheticGenerationResult(
            context=context,
            artifacts=[artifact],
            relationships=[invalid_relationship],
            deterministic_fingerprint="fingerprint-001",
        )


# ---------------------------------------------------------------------------
# Day 4 — Failure Injection & Coverage Gate
# ---------------------------------------------------------------------------


def test_missing_required_context_field_is_rejected() -> None:
    with pytest.raises(ValidationError):
        SimulationContext(global_seed=42)  # missing experiment_id


def test_negative_global_seed_is_rejected() -> None:
    with pytest.raises(ValidationError):
        SimulationContext(experiment_id="EXP-001", global_seed=-1)


def test_zero_artifact_count_is_rejected() -> None:
    context = build_context()

    with pytest.raises(ValidationError):
        SyntheticGenerationRequest(context=context, requested_artifact_count=0)


def test_unknown_field_on_request_is_rejected() -> None:
    context = build_context()

    with pytest.raises(ValidationError):
        SyntheticGenerationRequest(context=context, unexpected_field="not-allowed")


def test_artifact_missing_required_field_is_rejected() -> None:
    context = build_context()

    with pytest.raises(ValidationError):
        SyntheticArtifactContract(
            artifact_type="document",
            lifecycle_state="generated",
            created_at=context.created_at,
            provenance={"global_seed": context.global_seed},
            # artifact_id intentionally omitted
        )


def test_artifact_empty_provenance_is_rejected() -> None:
    context = build_context()

    with pytest.raises(ValidationError):
        SyntheticArtifactContract(
            artifact_id="ART-001",
            artifact_type="document",
            lifecycle_state="generated",
            created_at=context.created_at,
            provenance={},
        )


def test_unknown_field_on_artifact_is_rejected() -> None:
    context = build_context()

    with pytest.raises(ValidationError):
        SyntheticArtifactContract(
            artifact_id="ART-001",
            artifact_type="document",
            lifecycle_state="generated",
            created_at=context.created_at,
            provenance={"global_seed": context.global_seed},
            unexpected_field="not-allowed",
        )