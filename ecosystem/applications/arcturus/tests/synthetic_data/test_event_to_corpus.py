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


def test_valid_artifacts_become_accepted_artifacts() -> None:
    result = build_result({
        "artifacts": [valid_artifact_dict("ART-001"), valid_artifact_dict("ART-002")],
        "clock_step": 5,
    })

    corpus = SyntheticGenerationService().generate_corpus(result=result)

    assert len(corpus.accepted_artifacts) == 2
    assert {a.artifact_id for a in corpus.accepted_artifacts} == {"ART-001", "ART-002"}


def test_every_accepted_artifact_gets_a_lineage_record() -> None:
    result = build_result({
        "artifacts": [valid_artifact_dict("ART-001"), valid_artifact_dict("ART-002")],
        "clock_step": 5,
    })

    corpus = SyntheticGenerationService().generate_corpus(result=result)

    assert {a.artifact_id for a in corpus.accepted_artifacts} == {r.data_point_id for r in corpus.lineage}
    assert len(corpus.lineage) == 2


def test_lineage_tick_matches_clock_step() -> None:
    result = build_result({"artifacts": [valid_artifact_dict("ART-001")], "clock_step": 9})

    corpus = SyntheticGenerationService().generate_corpus(result=result)

    assert corpus.lineage[0].tick == 9


def test_missing_clock_step_defaults_to_zero() -> None:
    result = build_result({"artifacts": [valid_artifact_dict("ART-001")]})  # no clock_step key

    corpus = SyntheticGenerationService().generate_corpus(result=result)

    assert corpus.lineage[0].tick == 0


def test_lineage_carries_experiment_context() -> None:
    result = build_result({"artifacts": [valid_artifact_dict("ART-001")], "clock_step": 1})

    corpus = SyntheticGenerationService().generate_corpus(result=result)

    record = corpus.lineage[0]
    assert record.experiment_id == "EXP-DAY4"
    assert record.global_seed == 7
    assert record.config_fingerprint