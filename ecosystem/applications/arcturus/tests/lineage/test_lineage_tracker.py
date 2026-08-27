from ecosystem.applications.arcturus.contracts.shared.base_models import SimulationContext
from ecosystem.applications.arcturus.src.lineage.lineage_tracker import (
    build_config_fingerprint, build_lineage_record,
)


def build_context() -> SimulationContext:
    return SimulationContext(experiment_id="EXP-DAY4", global_seed=7, config={"artifact_types": ["document"]})


def test_lineage_record_captures_full_chain() -> None:
    context = build_context()
    record = build_lineage_record(context=context, tick=5, event_id="EVT-001", data_point_id="ART-001")
    assert record.experiment_id == context.experiment_id
    assert record.tick == 5
    assert record.config_fingerprint


def test_same_config_produces_same_fingerprint() -> None:
    config = {"artifact_types": ["document", "report"]}
    assert build_config_fingerprint(config) == build_config_fingerprint(config)


def test_different_config_produces_different_fingerprint() -> None:
    assert build_config_fingerprint({"artifact_types": ["document"]}) != build_config_fingerprint({"artifact_types": ["report"]})