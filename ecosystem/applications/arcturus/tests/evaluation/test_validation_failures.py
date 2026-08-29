"""
Day 6 tests — corrupted data points and mixed valid/invalid corpus handling.

Scope (per sprint plan, Day 6 failure-engineering task):
  1. Corrupted data point -> REJECTED with reason.
  2. Mixed valid/invalid corpus -> partial validation with detailed report.

These are new failure modes not exercised by the Day 4 test_no_silent_pass.py
suite, which only ever tests a corpus that is entirely empty, entirely valid,
or a single bad artifact alone. Day 6 specifically tests corpora that MIX
valid and invalid artifacts together, and artifacts corrupted on more than
one structural gate at once.
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
    return SimulationContext(experiment_id="exp-day6-validation-failures", global_seed=6)


def _make_good_artifact(artifact_id: str, project_id: str | None = None) -> SyntheticArtifactContract:
    """A structurally valid artifact: passes all three gates."""
    return SyntheticArtifactContract(
        artifact_id=artifact_id,
        artifact_type="employee_record",
        content={"field": "value"},
        lifecycle_state="active",
        version=1,
        project_id=project_id,
        created_at=datetime.now(timezone.utc),
        provenance={"source": "synthetic-gen-v1"},
    )


def _make_corrupted_artifact(
    artifact_id: str,
    missing_lifecycle_state: bool = False,
    missing_provenance: bool = False,
    invalid_version: bool = False,
) -> SyntheticArtifactContract:
    """
    A structurally corrupted artifact. Uses model_construct to bypass Pydantic
    validation, same pattern as Day 4's test_gate_failure_is_never_validated,
    since Pydantic already enforces these fields at normal construction time.
    """
    return SyntheticArtifactContract.model_construct(
        artifact_id=artifact_id,
        artifact_type="employee_record",
        content={"field": "value"},
        lifecycle_state="" if missing_lifecycle_state else "active",
        version=0 if invalid_version else 1,
        created_at=datetime.now(timezone.utc),
        provenance={} if missing_provenance else {"source": "synthetic-gen-v1"},
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


def test_corrupted_artifact_with_multiple_failures_reports_all_reasons():
    """
    An artifact corrupted on ALL THREE structural gates at once must be
    REJECTED, and the reason must name all three failures for that artifact
    -- not just the first one found.
    """
    context = _make_context()
    corrupted = _make_corrupted_artifact(
        "art-corrupted",
        missing_lifecycle_state=True,
        missing_provenance=True,
        invalid_version=True,
    )
    corpus = SyntheticDataCorpus(
        context=context,
        accepted_artifacts=[corrupted],
        lineage=[_lineage_for(context, "art-corrupted")],
    )

    result = run_corpus_validation(corpus)

    assert result.status == "REJECTED"
    assert "missing lifecycle_state" in result.reason
    assert "missing provenance" in result.reason
    assert "invalid version" in result.reason


def test_mixed_corpus_is_rejected_with_partial_counts():
    """
    A corpus with 2 good artifacts and 1 corrupted artifact must still be
    REJECTED overall (no partial credit on status -- one bad artifact rejects
    the corpus), but the result must report the actual split: 2 accepted,
    1 rejected. The report must not claim 0 accepted just because the
    corpus as a whole was rejected.
    """
    context = _make_context()
    good_1 = _make_good_artifact("art-good-1")
    good_2 = _make_good_artifact("art-good-2")
    corrupted = _make_corrupted_artifact("art-bad", missing_provenance=True)

    corpus = SyntheticDataCorpus(
        context=context,
        accepted_artifacts=[good_1, good_2, corrupted],
        lineage=[
            _lineage_for(context, "art-good-1"),
            _lineage_for(context, "art-good-2"),
            _lineage_for(context, "art-bad"),
        ],
    )

    result = run_corpus_validation(corpus)

    assert result.status == "REJECTED"
    assert result.accepted_artifact_count == 2
    assert result.rejected_artifact_count == 1
    assert "art-bad" in result.reason
    # The good artifacts must not appear in the failure reasoning.
    assert "art-good-1" not in result.reason
    assert "art-good-2" not in result.reason


def test_mixed_corpus_metrics_reflect_partial_state():
    """
    Metrics on a mixed corpus must reflect the actual proportions, not
    collapse to 0 or 1 just because the overall status is REJECTED.
    accuracy should be 2/3 (two of three artifacts passed structural gates).
    """
    context = _make_context()
    good_1 = _make_good_artifact("art-good-1")
    good_2 = _make_good_artifact("art-good-2")
    corrupted = _make_corrupted_artifact("art-bad", invalid_version=True)

    corpus = SyntheticDataCorpus(
        context=context,
        accepted_artifacts=[good_1, good_2, corrupted],
        lineage=[
            _lineage_for(context, "art-good-1"),
            _lineage_for(context, "art-good-2"),
            _lineage_for(context, "art-bad"),
        ],
    )

    result = run_corpus_validation(corpus)

    assert result.metrics.accuracy == 2 / 3


def test_multiple_corrupted_artifacts_all_reported_not_just_first():
    """
    A corpus with TWO separately corrupted artifacts must report failures
    for BOTH of them in the reason, and both must be reflected in
    rejected_artifact_count -- the engine must not stop at the first
    failure it finds and silently ignore the second.
    """
    context = _make_context()
    bad_1 = _make_corrupted_artifact("art-bad-1", missing_lifecycle_state=True)
    bad_2 = _make_corrupted_artifact("art-bad-2", missing_provenance=True)

    corpus = SyntheticDataCorpus(
        context=context,
        accepted_artifacts=[bad_1, bad_2],
        lineage=[
            _lineage_for(context, "art-bad-1"),
            _lineage_for(context, "art-bad-2"),
        ],
    )

    result = run_corpus_validation(corpus)

    assert result.status == "REJECTED"
    assert result.rejected_artifact_count == 2
    assert "art-bad-1" in result.reason
    assert "art-bad-2" in result.reason


def test_empty_content_is_not_a_structural_corruption():
    """
    An artifact with empty `content` is structurally VALID (content is not
    a structural gate -- it only affects the coverage metric). This test
    guards against a future change accidentally treating empty content as
    a rejection-worthy corruption, which would conflate two different
    concepts: structural integrity vs. data completeness.
    """
    context = _make_context()
    empty_content_artifact = SyntheticArtifactContract(
        artifact_id="art-empty-content",
        artifact_type="employee_record",
        content={},  # empty, but not corrupted
        lifecycle_state="active",
        version=1,
        created_at=datetime.now(timezone.utc),
        provenance={"source": "synthetic-gen-v1"},
    )
    corpus = SyntheticDataCorpus(
        context=context,
        accepted_artifacts=[empty_content_artifact],
        lineage=[_lineage_for(context, "art-empty-content")],
    )

    result = run_corpus_validation(corpus)

    assert result.status == "VALIDATED"
    assert result.rejected_artifact_count == 0
    # Coverage should reflect the empty content, even though status passed.
    assert result.metrics.coverage == 0.0