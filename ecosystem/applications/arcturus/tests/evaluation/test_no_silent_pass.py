"""
Day 4 tests — 'never a fake pass' guarantee across the tri-state classification.
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
    return SimulationContext(experiment_id="exp-day4-no-silent-pass", global_seed=4)


def _make_artifact(
    artifact_id: str,
    lifecycle_state: str = "active",
    project_id: str | None = None,
) -> SyntheticArtifactContract:
    return SyntheticArtifactContract(
        artifact_id=artifact_id,
        artifact_type="employee_record",
        content={"field": "value"},
        lifecycle_state=lifecycle_state,
        version=1,
        project_id=project_id,
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


def test_empty_corpus_is_never_validated():
    """An empty corpus must be INCONCLUSIVE, never VALIDATED — no evidence, no pass."""
    corpus = SyntheticDataCorpus(context=_make_context(), accepted_artifacts=[], lineage=[])

    result = run_corpus_validation(corpus)

    assert result.status != "VALIDATED"
    assert result.status == "INCONCLUSIVE"


def test_gate_failure_is_never_validated():
    """A structural gate failure must never be silently converted to VALIDATED."""
    context = _make_context()
    bad_artifact = SyntheticArtifactContract.model_construct(
        artifact_id="art-1",
        artifact_type="employee_record",
        content={"field": "value"},
        lifecycle_state="",
        version=1,
        created_at=datetime.now(timezone.utc),
        provenance={"source": "synthetic-gen-v1"},
    )
    corpus = SyntheticDataCorpus(
        context=context,
        accepted_artifacts=[bad_artifact],
        lineage=[_lineage_for(context, "art-1")],
    )

    result = run_corpus_validation(corpus)

    assert result.status != "VALIDATED"
    assert result.status == "REJECTED"


def test_every_result_has_a_non_empty_reason():
    """Every status, in every path, must explain itself — never a bare stamp with no reasoning."""
    context = _make_context()

    empty_corpus = SyntheticDataCorpus(context=context, accepted_artifacts=[], lineage=[])
    empty_result = run_corpus_validation(empty_corpus)
    assert empty_result.reason.strip() != ""

    good_artifact = _make_artifact("art-1")
    good_corpus = SyntheticDataCorpus(
        context=context,
        accepted_artifacts=[good_artifact],
        lineage=[_lineage_for(context, "art-1")],
    )
    good_result = run_corpus_validation(good_corpus)
    assert good_result.reason.strip() != ""


def test_flagged_issues_are_never_silently_dropped():
    """A flagged consistency conflict must appear in flagged_rules, not disappear."""
    context = _make_context()
    artifacts = [
        _make_artifact("art-1", lifecycle_state="active", project_id="proj-shared"),
        _make_artifact("art-2", lifecycle_state="archived", project_id="proj-shared"),
    ]
    corpus = SyntheticDataCorpus(
        context=context,
        accepted_artifacts=artifacts,
        lineage=[_lineage_for(context, "art-1"), _lineage_for(context, "art-2")],
    )

    result = run_corpus_validation(corpus)

    assert len(result.flagged_rules) > 0