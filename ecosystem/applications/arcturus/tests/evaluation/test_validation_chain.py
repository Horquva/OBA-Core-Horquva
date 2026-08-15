"""
Test for the Day 5 validation_chain.py entry point.

Confirms run_validation_chain() correctly wires together the adapter,
engine, and outbound payload built across Days 1-4.
"""

from __future__ import annotations

from ecosystem.applications.arcturus.contracts.shared.base_models import SimulationContext
from ecosystem.applications.arcturus.schemas.evaluation.base_schemas import ExperimentResultPackage
from ecosystem.applications.arcturus.src.integration.validation_chain import run_validation_chain


def test_run_validation_chain_returns_structured_payload():
    context = SimulationContext(experiment_id="exp-day5", global_seed=5)
    package = ExperimentResultPackage(
        context=context,
        scenario_id="SCN-DY-005",
        final_status="completed",
        state_snapshot={"productivity_change": 8.0},
        event_count=10,
        checkpoint_refs=["chk-1"],
    )

    payload = run_validation_chain(package)

    assert payload["experiment_id"] == "exp-day5"
    assert payload["final_status"] in ("validated", "rejected", "inconclusive")
    assert "reason" in payload
    