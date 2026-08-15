import json
from datetime import datetime, timezone
from uuid import UUID

from ecosystem.applications.arcturus.contracts.shared.base_models import (
    SimulationContext,
)
from ecosystem.applications.arcturus.contracts.synthetic_data.base_models import (
    SyntheticGenerationResult,
)
from ecosystem.applications.arcturus.src.integration.synthetic_data_chain import (
    run_synthetic_data_chain,
)


FIXED_RUN_ID = UUID("00000000-0000-0000-0000-000000000001")
FIXED_TRACE_ID = UUID("00000000-0000-0000-0000-000000000002")
FIXED_CREATED_AT = datetime(2026, 8, 15, 12, 0, 0, tzinfo=timezone.utc)


def build_context() -> SimulationContext:
    return SimulationContext(
        run_id=FIXED_RUN_ID,
        trace_id=FIXED_TRACE_ID,
        experiment_id="EXP-E2E-001",
        global_seed=42,
        created_at=FIXED_CREATED_AT,
    )


def test_chain_produces_runtime_ready_result_and_evidence() -> None:
    context = build_context()

    result, evidence = run_synthetic_data_chain(
        context=context,
        requested_artifact_count=3,
        requested_artifact_types=["document", "report"],
    )

    assert isinstance(result, SyntheticGenerationResult)
    assert len(result.artifacts) == 3
    assert evidence["run_id"] == str(context.run_id)
    assert evidence["experiment_id"] == context.experiment_id
    assert evidence["artifact_count"] == 3
    assert evidence["deterministic_fingerprint"] == result.deterministic_fingerprint
    assert evidence["status"] == "pass"


def test_chain_is_deterministic_end_to_end() -> None:
    context = build_context()

    first_result, first_evidence = run_synthetic_data_chain(context=context, requested_artifact_count=2)
    second_result, second_evidence = run_synthetic_data_chain(context=context, requested_artifact_count=2)

    assert first_result.deterministic_fingerprint == second_result.deterministic_fingerprint
    assert first_evidence["deterministic_fingerprint"] == second_evidence["deterministic_fingerprint"]


def test_evidence_is_json_serializable() -> None:
    context = build_context()

    _, evidence = run_synthetic_data_chain(context=context, requested_artifact_count=1)

    # Must not raise — the evidence aggregator needs this to serialize cleanly.
    json.dumps(evidence)