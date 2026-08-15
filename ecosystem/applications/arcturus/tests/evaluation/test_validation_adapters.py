"""
Tests for the inbound/outbound adapters in validation_adapters.py.

Confirms:
  - experiment_result_to_evidence() maps source_execution_id to run_id
    (not experiment_id), and scopes observed_value to state_snapshot only.
  - The full pipeline (adapter -> ValidationEngine -> outbound adapter)
    runs end to end without error, producing a structured result.
"""

from __future__ import annotations

from ecosystem.applications.arcturus.contracts.shared.base_models import SimulationContext
from ecosystem.applications.arcturus.schemas.evaluation.base_schemas import ExperimentResultPackage
from ecosystem.applications.arcturus.contracts.evaluation.base_models import ValidationRun
from ecosystem.applications.arcturus.src.evaluation_plane.validation_engine import ValidationEngine
from ecosystem.applications.arcturus.src.evaluation_plane.validation_adapters import (
    experiment_result_to_evidence,
    validation_result_to_intelligence_payload,
)


def _build_fake_maaz_result(context: SimulationContext) -> ExperimentResultPackage:
    return ExperimentResultPackage(
        context=context,
        scenario_id="SCN-AB-001",
        final_status="completed",
        state_snapshot={"productivity_change": 12.0},
        event_count=42,
        checkpoint_refs=["chk-1", "chk-2"],
    )


def test_experiment_result_to_evidence_maps_source_execution_id_to_run_id():
    """source_execution_id must come from run_id, not experiment_id."""
    context = SimulationContext(experiment_id="exp-003", global_seed=99)
    package = _build_fake_maaz_result(context)

    evidence = experiment_result_to_evidence(package)

    assert evidence.source_execution_id == str(context.run_id)
    assert evidence.source_execution_id != context.experiment_id
    # experiment_id should still be reachable via context, just not duplicated here
    assert evidence.context.experiment_id == "exp-003"


def test_experiment_result_to_evidence_scopes_observed_value_to_state_snapshot():
    """observed_value must be exactly state_snapshot - no final_status, event_count, or checkpoint_refs mixed in."""
    context = SimulationContext(experiment_id="exp-003", global_seed=99)
    package = _build_fake_maaz_result(context)

    evidence = experiment_result_to_evidence(package)

    assert evidence.observed_value == {"productivity_change": 12.0}
    assert "final_status" not in evidence.observed_value
    assert "event_count" not in evidence.observed_value
    assert "checkpoint_refs" not in evidence.observed_value


def test_adapter_to_engine_to_outbound_pipeline_runs_end_to_end():
    """Full pipeline: Maaz's package -> evidence -> validation result -> outbound payload."""
    context = SimulationContext(experiment_id="exp-003", global_seed=99)
    package = _build_fake_maaz_result(context)

    evidence = experiment_result_to_evidence(package)
    run = ValidationRun(context=context, evidence=evidence)
    result = ValidationEngine().run_validation(run)
    payload = validation_result_to_intelligence_payload(result)

    assert result.final_status in ("validated", "rejected", "inconclusive")
    assert payload["run_id"] == str(result.run_id)
    assert payload["experiment_id"] == "exp-003"
    assert "reason" in payload