"""
Day 4 tests — VALIDATED / REJECTED / INCONCLUSIVE classification logic.
"""
from __future__ import annotations

from datetime import datetime, timezone

from ecosystem.applications.arcturus.contracts.shared.base_models import SimulationContext
from ecosystem.applications.arcturus.contracts.synthetic_data.base_models import (
    SyntheticArtifactContract,
    SyntheticDataCorpus,
)
from ecosystem.applications.arcturus.src.evaluation_plane.validation_engine import (
    run_corpus_validation,
)


def _make_context() -> SimulationContext:
    return SimulationContext(experiment_id="exp-day4-tristate", global_seed=2)


def _make_artifact(artifact_id: str, lifecycle_state: str = "active") -> SyntheticArtifactContract:
    return SyntheticArtifactContract(
        artifact_id=artifact_id,
        artifact_type="employee_record",
        content={"field": "value"},
        lifecycle_state=lifecycle_state,
        version=1,
        created_at=datetime.now(timezone.utc),
        provenance={"source": "synthetic-gen-v1"},
    )


def _lineage_for(context: SimulationContext, artifact_id: str) -> dict:
    return {
        "experiment_id": context.experiment_id,
        "global_seed": context.global_seed,
        "config_fingerprint": "cfg-1",
        "tick": 0,
        "event_id": f"evt-{artifact_id}",
        "data_point_id": artifact_id,
    }


def test_empty_accepted_artifacts_is_inconclusive():
    context = _make_context()
    corpus = SyntheticDataCorpus(context=context, accepted_artifacts=[], lineage=[])

    result = run_corpus_validation(corpus)

    assert result.status == "INCONCLUSIVE"
    assert result.accepted_artifact_count == 0
    assert result.rejected_artifact_count == 0


def test_all_artifacts_passing_gates_is_validated():
    context = _make_context()
    artifacts = [_make_artifact("art-1"), _make_artifact("art-2")]
    corpus = SyntheticDataCorpus(
        context=context,
        accepted_artifacts=artifacts,
        lineage=[_lineage_for(context, "art-1"), _lineage_for(context, "art-2")],
    )

    result = run_corpus_validation(corpus)

    assert result.status == "VALIDATED"
    assert result.accepted_artifact_count == 2
    assert result.rejected_artifact_count == 0


def test_one_artifact_failing_gate_rejects_whole_corpus():
    """
    NOTE: SyntheticArtifactContract enforces min_length=1 on lifecycle_state
    at the contract level, so a "real" corpus with a bad artifact can't be
    constructed normally. We use model_construct() to bypass validation and
    confirm run_corpus_validation's gate-checking logic itself still works
    and rejects the whole corpus with no partial credit.
    """
    context = _make_context()
    good_artifact = _make_artifact("art-1")
    bad_artifact = SyntheticArtifactContract.model_construct(
        artifact_id="art-2",
        artifact_type="employee_record",
        content={"field": "value"},
        lifecycle_state="",
        version=1,
        created_at=datetime.now(timezone.utc),
        provenance={"source": "synthetic-gen-v1"},
    )
    corpus = SyntheticDataCorpus(
        context=context,
        accepted_artifacts=[good_artifact, bad_artifact],
        lineage=[_lineage_for(context, "art-1"), _lineage_for(context, "art-2")],
    )

    result = run_corpus_validation(corpus)

    assert result.status == "REJECTED"
    assert result.accepted_artifact_count == 1
    assert result.rejected_artifact_count == 1


def test_reason_is_never_empty():
    context = _make_context()
    corpus = SyntheticDataCorpus(context=context, accepted_artifacts=[], lineage=[])

    result = run_corpus_validation(corpus)

    assert result.reason.strip() != ""