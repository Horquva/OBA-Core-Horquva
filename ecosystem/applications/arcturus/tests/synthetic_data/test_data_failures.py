"""
tests/synthetic_data/test_data_failures.py

Day 6 — failure engineering, Synthetic Data platform. Every case must
produce an honest rejection, an honest raised error, or an empty corpus —
never a silent crash, never fabricated data standing in for a real result.
"""

from uuid import UUID

import pytest
from pydantic import ValidationError

from ecosystem.applications.arcturus.contracts.shared.base_models import SimulationContext
from ecosystem.applications.arcturus.contracts.simulation.base_models import (
    ExecutionStatus, ExperimentResultPackage,
)
from ecosystem.applications.arcturus.src.synthetic_data.generation_service import SyntheticGenerationService

FIXED_RUN_ID = UUID("00000000-0000-0000-0000-000000000001")


def build_context() -> SimulationContext:
    return SimulationContext(run_id=FIXED_RUN_ID, experiment_id="EXP-DAY6", global_seed=7)


def build_result(state_snapshot: dict) -> ExperimentResultPackage:
    return ExperimentResultPackage(
        context=build_context(), scenario_id="SCN-AB-001",
        final_status=ExecutionStatus.COMPLETED, state_snapshot=state_snapshot,
    )


def valid_artifact_dict(artifact_id: str = "ART-001") -> dict:
    return {
        "artifact_id": artifact_id, "artifact_type": "document", "lifecycle_state": "generated",
        "created_at": "2026-08-27T12:00:00Z", "provenance": {"global_seed": 7},
    }


def test_empty_event_stream_produces_empty_corpus_not_fabricated() -> None:
    corpus = SyntheticGenerationService().generate_corpus(result=build_result({"clock_step": 0}))
    assert corpus.accepted_artifacts == []
    assert corpus.rejected_artifacts == []
    assert corpus.lineage == []


def test_artifacts_not_a_list_is_rejected_at_the_contract_boundary() -> None:
    """
    PR #154 replaced the loose dict-based state_snapshot with a typed
    model that has its own `artifacts: list` field. Pydantic now rejects
    a non-list value before generate_corpus() ever runs — a stronger
    boundary than our own isinstance check. The honest failure here is
    now a raised ValidationError, not a rejected corpus record.
    """
    with pytest.raises(ValidationError):
        build_result({"artifacts": "this-should-be-a-list", "clock_step": 1})


def test_artifacts_as_dict_is_rejected_at_the_contract_boundary() -> None:
    with pytest.raises(ValidationError):
        build_result({"artifacts": {"not": "a list"}, "clock_step": 1})


def test_duplicate_artifact_id_in_same_batch_is_rejected_not_silently_accepted() -> None:
    result = build_result({
        "artifacts": [valid_artifact_dict("ART-001"), valid_artifact_dict("ART-001")],
        "clock_step": 1,
    })
    corpus = SyntheticGenerationService().generate_corpus(result=result)
    assert len(corpus.accepted_artifacts) == 1
    assert len(corpus.rejected_artifacts) == 1
    assert "duplicate" in corpus.rejected_artifacts[0].rejection_reason.lower()


def test_corpus_never_raises_when_snapshot_bypasses_validation() -> None:
    """
    Defense-in-depth: model_construct() bypasses pydantic validation
    entirely. If a malformed state_snapshot ever reaches generate_corpus()
    this way, our own isinstance guard is the only thing standing between
    this and a crash — confirming it still works even though normal
    construction can no longer produce this input.
    """
    result = ExperimentResultPackage.model_construct(
        context=build_context(), scenario_id="SCN-AB-001",
        final_status=ExecutionStatus.COMPLETED, state_snapshot={"artifacts": 12345},
    )
    corpus = SyntheticGenerationService().generate_corpus(result=result)
    assert corpus.accepted_artifacts == []
    assert len(corpus.rejected_artifacts) == 1