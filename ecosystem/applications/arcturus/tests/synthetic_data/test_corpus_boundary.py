from uuid import UUID

from ecosystem.applications.arcturus.contracts.shared.base_models import SimulationContext
from ecosystem.applications.arcturus.contracts.simulation.base_models import (
    ExecutionStatus,
    ExperimentResultPackage,
)
from ecosystem.applications.arcturus.src.synthetic_data.generation_service import (
    SyntheticGenerationService,
)

FIXED_RUN_ID = UUID("00000000-0000-0000-0000-000000000001")


def build_context() -> SimulationContext:
    return SimulationContext(run_id=FIXED_RUN_ID, experiment_id="EXP-DAY4", global_seed=7)


def build_result(state_snapshot: dict) -> ExperimentResultPackage:
    return ExperimentResultPackage(
        context=build_context(),
        scenario_id="SCN-AB-001",
        final_status=ExecutionStatus.COMPLETED,
        state_snapshot=state_snapshot,
    )


def valid_artifact_dict(artifact_id: str = "ART-001") -> dict:
    return {
        "artifact_id": artifact_id,
        "artifact_type": "document",
        "lifecycle_state": "generated",
        "created_at": "2026-08-27T12:00:00Z",
        "provenance": {"global_seed": 7},
    }


def test_malformed_artifact_is_rejected_with_a_reason() -> None:
    result = build_result({
        "artifacts": [{"artifact_id": "ART-BAD"}],  # missing required fields
        "clock_step": 1,
    })

    corpus = SyntheticGenerationService().generate_corpus(result=result)

    assert corpus.accepted_artifacts == []
    assert len(corpus.rejected_artifacts) == 1
    assert corpus.rejected_artifacts[0].candidate_artifact_id == "ART-BAD"
    assert corpus.rejected_artifacts[0].rejection_reason  # non-empty, per RejectedArtifactRecord contract


def test_mixed_valid_and_malformed_splits_correctly() -> None:
    result = build_result({
        "artifacts": [valid_artifact_dict("ART-001"), {"artifact_id": "ART-BAD"}],
        "clock_step": 1,
    })

    corpus = SyntheticGenerationService().generate_corpus(result=result)

    assert len(corpus.accepted_artifacts) == 1
    assert corpus.accepted_artifacts[0].artifact_id == "ART-001"
    assert len(corpus.rejected_artifacts) == 1
    assert corpus.rejected_artifacts[0].candidate_artifact_id == "ART-BAD"


def test_rejected_artifacts_get_no_lineage_record() -> None:
    result = build_result({
        "artifacts": [{"artifact_id": "ART-BAD"}],
        "clock_step": 1,
    })

    corpus = SyntheticGenerationService().generate_corpus(result=result)

    assert corpus.lineage == []


def test_missing_artifacts_key_produces_empty_corpus_not_error() -> None:
    corpus = SyntheticGenerationService().generate_corpus(result=build_result({"clock_step": 0}))

    assert corpus.accepted_artifacts == []
    assert corpus.rejected_artifacts == []
    assert corpus.lineage == []


def test_completely_empty_state_snapshot_produces_empty_corpus_not_error() -> None:
    corpus = SyntheticGenerationService().generate_corpus(result=build_result({}))

    assert corpus.accepted_artifacts == []
    assert corpus.rejected_artifacts == []
    assert corpus.lineage == []


def test_artifact_missing_artifact_id_gets_unknown_placeholder() -> None:
    result = build_result({
        "artifacts": [{"artifact_type": "document"}],  # no artifact_id at all
        "clock_step": 1,
    })

    corpus = SyntheticGenerationService().generate_corpus(result=result)

    assert len(corpus.rejected_artifacts) == 1
    assert corpus.rejected_artifacts[0].candidate_artifact_id.startswith("UNKNOWN-")