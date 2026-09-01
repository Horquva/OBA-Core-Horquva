from __future__ import annotations

from typing import Optional

from ecosystem.applications.arcturus.contracts.evaluation.base_models import (
    EvidenceContract,
    ValidationRun,
    ValidationRuleContract,
    ValidationResultContract,
    ValidationStatus,
    MetricScores,
    ValidationResult,
)

from ecosystem.applications.arcturus.contracts.synthetic_data.base_models import (
    SyntheticDataCorpus,
    SyntheticArtifactContract,
)

from ecosystem.applications.arcturus.src.evaluation_plane.validation_adapters import (
    check_cross_domain_consistency,
)

class ValidationEngine:
    """
    Core local engine for the Validation & Evaluation Platform.

    Implements the executable versions of the Week 2 Validation Rules.
    Day 2 scope: Logic Check and Internal Consistency Check only
    (the two hard-fail, no-exception checks from the Acceptance Criteria).
    Industry Pattern and Expected Outcome checks are deferred to a later day,
    since they are flagged-for-review rather than hard-fail.
    """

    # Default threshold: a result is "beyond realistic capability" if it
    # changes by more than this percentage versus the expected value.
    MAX_REALISTIC_CHANGE_PERCENT: float = 50.0

    # ------------------------------------------------------------------
    # LOGIC CHECK
    # ------------------------------------------------------------------
    def evaluate_logic_rule(self, evidence: EvidenceContract) -> tuple[bool, str]:
        """
        Fails if the observed result is beyond realistic human/organizational
        capability — e.g. an extreme, sudden change with no expected basis.

        Returns (passed, reason).
        """
        observed = evidence.observed_value
        expected = evidence.expected_value

        observed_number = self._extract_number(observed)

        if observed_number is None:
            return True, "No numeric value present to evaluate against realistic limits."

        if expected is None:
            if abs(observed_number) > 1000:
                return False, (
                    f"Observed value {observed_number} is far beyond any realistic "
                    f"organizational scale, with no expected value to justify it."
                )
            return True, "No expected value to compare against; observed value within absolute limits."

        if expected == 0:
            return True, "Expected value is zero; percentage-change check skipped."

        percent_change = abs((observed_number - expected) / expected) * 100

        if percent_change > self.MAX_REALISTIC_CHANGE_PERCENT:
            return False, (
                f"Observed value {observed_number} differs from expected {expected} "
                f"by {percent_change:.1f}%, exceeding the {self.MAX_REALISTIC_CHANGE_PERCENT}% "
                f"realistic capability threshold."
            )

        return True, f"Observed value within realistic range ({percent_change:.1f}% change)."

    # ------------------------------------------------------------------
    # INTERNAL CONSISTENCY CHECK
    # ------------------------------------------------------------------
    def evaluate_consistency_rule(self, evidence: EvidenceContract) -> tuple[bool, str]:
        """
        Fails if related parts of the evidence contradict each other —
        e.g. one department's output improves while a directly related
        department's data moves in a way that does not support it.

        Expects evidence.observed_value to optionally contain a
        "related_values" dict of {label: number} for cross-checking.
        If no related values are present, the check passes by default
        (nothing to contradict).
        """
        observed = evidence.observed_value

        if not isinstance(observed, dict):
            return True, "Observed value is not structured; no related fields to check."

        related = observed.get("related_values")

        if not related or not isinstance(related, dict) or len(related) < 2:
            return True, "No related values provided; internal consistency check skipped."

        values = list(related.values())
        directions = [1 if v > 0 else (-1 if v < 0 else 0) for v in values]

        if 1 in directions and -1 in directions:
            return False, (
                f"Related values move in contradictory directions: {related}. "
                f"Expected related metrics to move consistently with each other."
            )

        return True, f"Related values are directionally consistent: {related}."

    @staticmethod
    def _extract_number(value) -> Optional[float]:
        """Best-effort extraction of a single numeric value from observed_value."""
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, dict):
            for v in value.values():
                if isinstance(v, (int, float)):
                    return float(v)
        return None

    # ------------------------------------------------------------------
    # MAIN ENTRY POINT
    # ------------------------------------------------------------------
    def run_validation(self, run: ValidationRun) -> ValidationResultContract:
        """
        Runs all Day 2 checks (Logic, Internal Consistency) against the
        evidence in a ValidationRun and produces a structured result.
        """
        evidence = run.evidence

        passed_rules: list[str] = []
        failed_rules: list[str] = []
        reasons: list[str] = []

        logic_passed, logic_reason = self.evaluate_logic_rule(evidence)
        (passed_rules if logic_passed else failed_rules).append("logic_check")
        reasons.append(f"logic_check: {logic_reason}")

        consistency_passed, consistency_reason = self.evaluate_consistency_rule(evidence)
        (passed_rules if consistency_passed else failed_rules).append("internal_consistency_check")
        reasons.append(f"internal_consistency_check: {consistency_reason}")

        # Per the Week 2 Acceptance Criteria: Logic and Internal Consistency
        # are hard-fail checks, no exceptions.
        if failed_rules:
            final_status = "rejected"
        else:
            final_status = "validated"

        return ValidationResultContract(
            run_id=run.run_id,
            context=run.context,
            passed_rules=passed_rules,
            failed_rules=failed_rules,
            flagged_rules=[],
            final_status=final_status,
            reason=" | ".join(reasons),
        )

def _artifact_passes_structural_gates(artifact: SyntheticArtifactContract) -> tuple[bool, list[str]]:
    """
    Structural-only gates: checks contract-level fields, not the open
    `content` dict. We don't assume what's inside content since Ahmed's
    generation service owns that shape and hasn't published a fixed schema.
    """
    failures: list[str] = []

    if not artifact.lifecycle_state or not artifact.lifecycle_state.strip():
        failures.append(f"{artifact.artifact_id}: missing lifecycle_state")

    if not artifact.provenance:
        failures.append(f"{artifact.artifact_id}: missing provenance (no lineage)")

    if artifact.version < 1:
        failures.append(f"{artifact.artifact_id}: invalid version {artifact.version}")

    return (len(failures) == 0, failures)

def run_corpus_validation(result: SyntheticDataCorpus) -> ValidationResult:
    """
    Day 4: evaluates a SyntheticDataCorpus (Ahmed's corpus) and
    produces a tri-state ValidationResult.

    INCONCLUSIVE = no accepted artifacts at all -> no evidence to judge, not a failure.
    REJECTED = at least one accepted artifact, but one or more failed structural
               gates (hard-fail: missing lifecycle_state, missing provenance,
               invalid version). No partial credit.
    VALIDATED = at least one accepted artifact, all passed structural gates.
               May still carry flagged_rules (soft-check anomalies) without
               being downgraded to REJECTED, per Hashim's Day 4 guidance:
               cross-domain lifecycle conflicts are flagged, not hard-fail.
    """
    context = result.context
    artifacts = result.accepted_artifacts

    if not artifacts:
        return ValidationResult(
            context=context,
            status=ValidationStatus.INCONCLUSIVE,
            reason="No accepted artifacts present in SyntheticDataCorpus; no evidence to evaluate.",
            flagged_rules=[],
            metrics=MetricScores(coverage=0.0, accuracy=0.0, consistency=0.0),
            accepted_artifact_count=0,
            rejected_artifact_count=0,
        )

    all_failures: list[str] = []
    accepted_count = 0
    rejected_count = 0
    non_empty_content_count = 0

    for artifact in artifacts:
        if artifact.content:
            non_empty_content_count += 1

        passed, failures = _artifact_passes_structural_gates(artifact)
        if passed:
            accepted_count += 1
        else:
            rejected_count += 1
            all_failures.extend(failures)

    # Soft check: cross-domain consistency. Never causes REJECTED on its own.
    consistency_passed, consistency_issues = check_cross_domain_consistency(result)

    total = len(artifacts)
    coverage = non_empty_content_count / total
    accuracy = accepted_count / total
    consistency = 1.0 if consistency_passed else max(0.0, 1.0 - (len(consistency_issues) / total))

    metrics = MetricScores(coverage=coverage, accuracy=accuracy, consistency=consistency)

    if rejected_count > 0:
        # Hard-fail: structural gate violations only.
        reason = (
            f"Structural quality gates failed for {rejected_count} artifact(s): "
            + "; ".join(all_failures)
        )
        return ValidationResult(
            context=context,
            status=ValidationStatus.REJECTED,
            reason=reason,
            flagged_rules=consistency_issues,  # still recorded, even though this corpus is rejected for a harder reason
            metrics=metrics,
            accepted_artifact_count=accepted_count,
            rejected_artifact_count=rejected_count,
        )

    # All artifacts passed structural gates. Cross-domain issues, if any,
    # are flagged but do not downgrade the status.
    reason = f"All {total} artifact(s) passed structural quality gates (lifecycle_state, provenance, version)."
    if consistency_issues:
        reason += f" {len(consistency_issues)} cross-domain consistency issue(s) flagged (non-fatal)."

    return ValidationResult(
        context=context,
        status=ValidationStatus.VALIDATED,
        reason=reason,
        flagged_rules=consistency_issues,
        metrics=metrics,
        accepted_artifact_count=accepted_count,
        rejected_artifact_count=0,
    )