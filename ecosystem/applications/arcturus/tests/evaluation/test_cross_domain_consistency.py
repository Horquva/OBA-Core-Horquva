"""
Day 4 tests — cross-domain consistency checker (soft check, flagged not rejected).
"""
from __future__ import annotations

from datetime import datetime, timezone

from ecosystem.applications.arcturus.contracts.shared.base_models import SimulationContext
from ecosystem.applications.arcturus.contracts.synthetic_data.base_models import (
    SyntheticArtifactContract,
    SyntheticDataCorpus,
)
from ecosystem.applications.arcturus.src.evaluation_plane.validation_adapters import (
    check_cross_domain_consistency,
)
from ecosystem.applications.arcturus.src.evaluation_plane.validation_engine import (
    run_corpus_validation,
)


def _make_context() -> SimulationContext:
    return SimulationContext(experiment_id="exp-day4-consistency", global_seed=3)


def _make_artifact(
    artifact_id: str,
    lifecycle_state: str = "active",
    project_id: str | None = None,
    department_id: str | None = None,
) -> SyntheticArtifactContract:
    return SyntheticArtifactContract(
        artifact_id=artifact_id,
        artifact_type="employee_record",
        content={"field": "value"},
        lifecycle_state=lifecycle_state,
        version=1,
        project_id=project_id,
        department_id=department_id,
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


def test_no_shared_group_fields_passes_clean():
    context = _make_context()
    artifacts = [_make_artifact("art-1"), _make_artifact("art-2")]
    corpus = SyntheticDataCorpus(
        context=context,
        accepted_artifacts=artifacts,
        lineage=[_lineage_for(context, "art-1"), _lineage_for(context, "art-2")],
    )

    passed, issues = check_cross_domain_consistency(corpus)

    assert passed is True
    assert issues == []


def test_conflicting_lifecycle_in_same_project_is_flagged():
    context = _make_context()
    artifacts = [
        _make_artifact("art-1", lifecycle_state="active", project_id="proj-1"),
        _make_artifact("art-2", lifecycle_state="archived", project_id="proj-1"),
    ]
    corpus = SyntheticDataCorpus(
        context=context,
        accepted_artifacts=artifacts,
        lineage=[_lineage_for(context, "art-1"), _lineage_for(context, "art-2")],
    )

    passed, issues = check_cross_domain_consistency(corpus)

    assert passed is False
    assert any("project_id=proj-1" in issue for issue in issues)


def test_same_lifecycle_in_same_project_passes():
    context = _make_context()
    artifacts = [
        _make_artifact("art-1", lifecycle_state="active", project_id="proj-1"),
        _make_artifact("art-2", lifecycle_state="active", project_id="proj-1"),
    ]
    corpus = SyntheticDataCorpus(
        context=context,
        accepted_artifacts=artifacts,
        lineage=[_lineage_for(context, "art-1"), _lineage_for(context, "art-2")],
    )

    passed, issues = check_cross_domain_consistency(corpus)

    assert passed is True
    assert issues == []

def test_flagged_conflict_does_not_cause_rejection():
    """
    Core rule from Hashim's guidance: cross-domain lifecycle conflicts are
    a soft check. A corpus with a flagged conflict but no structural gate
    failures must still be VALIDATED, never REJECTED.
    """
    context = _make_context()
    artifacts = [
        _make_artifact("art-1", lifecycle_state="active", department_id="dept-1"),
        _make_artifact("art-2", lifecycle_state="archived", department_id="dept-1"),
    ]
    corpus = SyntheticDataCorpus(
        context=context,
        accepted_artifacts=artifacts,
        lineage=[_lineage_for(context, "art-1"), _lineage_for(context, "art-2")],
    )

    result = run_corpus_validation(corpus)

    assert result.status == "VALIDATED"
    assert len(result.flagged_rules) > 0
    assert result.rejected_artifact_count == 0