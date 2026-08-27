from pydantic import ValidationError
import pytest

from ecosystem.applications.arcturus.contracts.shared.base_models import SimulationContext
from ecosystem.applications.arcturus.contracts.synthetic_data.base_models import (
    LineageRecord,
    RejectedArtifactRecord,
    SyntheticArtifactContract,
    SyntheticDataCorpus,
)


def build_context() -> SimulationContext:
    return SimulationContext(experiment_id="EXP-DAY4", global_seed=7)


def build_lineage_record(data_point_id: str = "ART-001") -> LineageRecord:
    return LineageRecord(
        experiment_id="EXP-DAY4", global_seed=7, config_fingerprint="fp-abc",
        tick=3, event_id="EVT-001", data_point_id=data_point_id,
    )


def build_artifact(artifact_id: str = "ART-001") -> SyntheticArtifactContract:
    context = build_context()
    return SyntheticArtifactContract(
        artifact_id=artifact_id, artifact_type="document", lifecycle_state="generated",
        created_at=context.created_at, provenance={"global_seed": context.global_seed},
    )


def test_empty_corpus_is_valid() -> None:
    corpus = SyntheticDataCorpus(context=build_context())
    assert corpus.accepted_artifacts == []
    assert corpus.lineage == []


def test_accepted_artifact_with_matching_lineage_is_valid() -> None:
    corpus = SyntheticDataCorpus(
        context=build_context(), accepted_artifacts=[build_artifact()], lineage=[build_lineage_record()],
    )
    assert len(corpus.accepted_artifacts) == 1


def test_accepted_artifact_missing_lineage_is_rejected() -> None:
    with pytest.raises(ValidationError):
        SyntheticDataCorpus(context=build_context(), accepted_artifacts=[build_artifact()], lineage=[])


def test_rejected_artifact_requires_a_reason() -> None:
    with pytest.raises(ValidationError):
        RejectedArtifactRecord(candidate_artifact_id="ART-BAD", rejection_reason="", event_id="EVT-001")


def test_corpus_tracks_rejected_artifacts_without_requiring_lineage() -> None:
    corpus = SyntheticDataCorpus(
        context=build_context(),
        rejected_artifacts=[RejectedArtifactRecord(
            candidate_artifact_id="ART-BAD", rejection_reason="schema violation", event_id="EVT-002",
        )],
    )
    assert len(corpus.rejected_artifacts) == 1