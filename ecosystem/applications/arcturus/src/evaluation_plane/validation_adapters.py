from __future__ import annotations

from ecosystem.applications.arcturus.contracts.evaluation.base_models import EvidenceContract
from ecosystem.applications.arcturus.schemas.evaluation.base_schemas import ExperimentResultPackage
from ecosystem.applications.arcturus.contracts.synthetic_data.base_models import SyntheticDataCorpus


# ---------------------------------------------------------------------------
# INBOUND ADAPTER — Maaz's ExperimentResultPackage -> our EvidenceContract
# ---------------------------------------------------------------------------

def experiment_result_to_evidence(package: ExperimentResultPackage) -> EvidenceContract:
    """
    Converts Maaz's confirmed ExperimentResultPackage (Simulation Runtime)
    into our internal EvidenceContract, so the ValidationEngine never has
    to know about his platform's shape directly.

    Maps:
      package.context               -> evidence.context
      package.context.run_id (str)  -> evidence.source_execution_id
        (run_id is unique per execution; experiment_id can repeat across
        reruns of the same experiment, and remains accessible separately
        via evidence.context.experiment_id)
      package.state_snapshot        -> evidence.observed_value
        (the actual measurement only; final_status, event_count, and
        checkpoint_refs are execution metadata, not the measurement
        itself, and are intentionally excluded here)
    """
    return EvidenceContract(
        context=package.context,
        source_execution_id=str(package.context.run_id),
        observed_value=package.state_snapshot,
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

def check_cross_domain_consistency(
    result: SyntheticDataCorpus,
) -> tuple[bool, list[str]]:
    """
    Cross-domain consistency, across artifacts in one corpus (not within a
    single artifact's content, which is out of scope until content has a
    fixed schema — see run_corpus_validation).

    Per Team lead's guidance (Day 4): this is a SOFT check. Lifecycle-state
    discrepancies within an entity group are domain anomalies, not fatal
    data corruption. Callers should record any issues under flagged_rules,
    never use this to force a REJECTED status on their own.

    Confirmed with Hashim: SyntheticDataCorpus does not carry a top-level
    relationships list (unlike Week 3's SyntheticGenerationResult). That
    relational data now lives as foreign-key fields directly on each
    SyntheticArtifactContract instead. This checker inspects those fields.

    Groups artifacts by each of the five foreign-key fields and flags any
    group whose members report contradictory lifecycle_state values.
    """
    issues: list[str] = []

    group_fields = (
        "owner_entity_id",
        "department_id",
        "business_function_id",
        "project_id",
        "workflow_id",
        "workforce_participant_id",
    )

    for group_field in group_fields:
        groups: dict[str, set[str]] = {}
        for artifact in result.accepted_artifacts:
            group_key = getattr(artifact, group_field)
            if group_key is None:
                continue
            groups.setdefault(group_key, set()).add(artifact.lifecycle_state)

        for group_key, states in groups.items():
            if len(states) > 1:
                issues.append(
                    f"{group_field}={group_key}: conflicting lifecycle_state values {sorted(states)}"
                )

    return (len(issues) == 0, issues)