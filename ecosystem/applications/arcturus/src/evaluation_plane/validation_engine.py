from __future__ import annotations

from typing import Optional

from ecosystem.applications.arcturus.contracts.evaluation.base_models import (
    EvidenceContract,
    ValidationRun,
    ValidationRuleContract,
    ValidationResultContract,
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