from __future__ import annotations

from ecosystem.applications.arcturus.contracts.evaluation.base_models import EvidenceContract
from ecosystem.applications.arcturus.schemas.evaluation.base_schemas import ExperimentResultPackage


# ---------------------------------------------------------------------------
# INBOUND ADAPTER — Maaz's ExperimentResultPackage -> our EvidenceContract
# ---------------------------------------------------------------------------

def experiment_result_to_evidence(package: ExperimentResultPackage) -> EvidenceContract:
    """
    Converts Maaz's confirmed ExperimentResultPackage (Simulation Runtime)
    into our internal EvidenceContract, so the ValidationEngine never has
    to know about his platform's shape directly.

    Maps:
      package.context            -> evidence.context
      package.context.experiment_id (via source) -> evidence.source_execution_id
      package.state_snapshot / event_count -> evidence.observed_value
      package.final_status is carried inside observed_value for the
        Logic/Consistency checks to reference if needed.
    """
    observed_value = {
        "final_status": package.final_status,
        "event_count": package.event_count,
        "state_snapshot": package.state_snapshot,
        "checkpoint_refs": package.checkpoint_refs,
    }

    return EvidenceContract(
        context=package.context,
        source_execution_id=package.context.experiment_id,
        observed_value=observed_value,
        expected_value=None,  # Expected Outcome Check (Day 4+) will supply this from Maryam's scenario data
    )


# ---------------------------------------------------------------------------
# OUTBOUND ADAPTER — our ValidationResultContract -> downstream payload
# ---------------------------------------------------------------------------

def validation_result_to_intelligence_payload(result) -> dict:
    """
    Prepares a validated result for handoff toward Simulation Intelligence
    (Shah Noor's platform). Kept as a plain dict for now since his inbound
    contract isn't finalized yet — update once his shape is confirmed,
    the same way ExperimentResultPackage was.
    """
    return {
        "run_id": str(result.run_id),
        "experiment_id": result.context.experiment_id,
        "final_status": result.final_status,
        "passed_rules": result.passed_rules,
        "failed_rules": result.failed_rules,
        "flagged_rules": result.flagged_rules,
        "reason": result.reason,
    }