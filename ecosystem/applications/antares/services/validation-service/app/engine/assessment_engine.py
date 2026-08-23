"""
Capability Assessment Engine
Roadmap Reference: PART-3 — Build the Live Capability Assessment Engine

Pipeline:
Candidate Capability -> Capability Intake -> Completeness Check
-> Evidence Assessment -> Business Value Assessment
-> Organizational Impact Assessment -> Reusability Assessment
-> Constitutional Assessment -> Validation Result

This engine produces STRUCTURED, EXPLAINABLE results. It never simply
returns "validated" without reasoning tied to evidence.
"""

from __future__ import annotations

from app.models.capability import Capability
from app.models.validation_dimension import DIMENSION_REGISTRY, DimensionName
from app.models.assessment import DimensionFinding, ValidationResult, ValidationState


class AssessmentEngine:
    """
    Evaluates a Capability against all registered validation dimensions
    and produces a fully explainable ValidationResult.
    """

    def __init__(self, dimension_registry=None):
        self.dimension_registry = dimension_registry or DIMENSION_REGISTRY

    # ---- Per-dimension assessment methods -------------------------------

    def _assess_organizational_value(self, cap: Capability) -> DimensionFinding:
        strengths, weaknesses, missing = [], [], []
        score = 0.0

        if cap.organizational_problem.strip():
            score += 0.4
            strengths.append("Organizational problem is stated")
        else:
            missing.append("organizational_problem")

        if cap.expected_value.strip():
            score += 0.4
            strengths.append("Expected value is stated")
        else:
            missing.append("expected_value")

        if len(cap.expected_value.split()) >= 6:
            score += 0.2
            strengths.append("Expected value is described with sufficient detail")
        elif cap.expected_value.strip():
            weaknesses.append("Expected value statement is very brief")

        passed = score >= self.dimension_registry[DimensionName.ORGANIZATIONAL_VALUE].min_passing_score
        reasoning = (
            f"Organizational value scored {score:.2f} based on presence and "
            f"specificity of the stated problem and expected value."
        )
        return DimensionFinding(
            dimension=DimensionName.ORGANIZATIONAL_VALUE,
            score=score, passed=passed, reasoning=reasoning,
            evidence_used=["capability.organizational_problem", "capability.expected_value"],
            strengths=strengths, weaknesses=weaknesses, missing_information=missing,
        )

    def _assess_organizational_impact(self, cap: Capability) -> DimensionFinding:
        strengths, weaknesses, missing = [], [], []
        score = 0.0

        if cap.target_organization.strip():
            score += 0.5
            strengths.append("Target organization identified")
        else:
            missing.append("target_organization")

        if cap.expected_outcome.strip():
            score += 0.5
            strengths.append("Expected outcome described")
        else:
            missing.append("expected_outcome")

        passed = score >= self.dimension_registry[DimensionName.ORGANIZATIONAL_IMPACT].min_passing_score
        reasoning = f"Organizational impact scored {score:.2f} based on target and expected outcome clarity."
        return DimensionFinding(
            dimension=DimensionName.ORGANIZATIONAL_IMPACT,
            score=score, passed=passed, reasoning=reasoning,
            evidence_used=["capability.target_organization", "capability.expected_outcome"],
            strengths=strengths, weaknesses=weaknesses, missing_information=missing,
        )

    def _assess_evidence_quality(self, cap: Capability) -> DimensionFinding:
        strengths, weaknesses, missing = [], [], []
        refs = cap.evidence_references

        if not refs:
            missing.append("evidence_references")
            score = 0.0
            reasoning = "No evidence references were attached to this capability."
        else:
            traceable = [e for e in refs if e.url_or_locator or e.source]
            score = min(1.0, 0.3 + 0.2 * len(traceable))
            strengths.append(f"{len(traceable)} traceable evidence reference(s) found")
            if len(refs) < 2:
                weaknesses.append("Only one piece of evidence provided; more strengthens the claim")
            reasoning = (
                f"Evidence quality scored {score:.2f} based on {len(traceable)} "
                f"traceable reference(s) out of {len(refs)} submitted."
            )

        passed = score >= self.dimension_registry[DimensionName.EVIDENCE_QUALITY].min_passing_score
        return DimensionFinding(
            dimension=DimensionName.EVIDENCE_QUALITY,
            score=score, passed=passed, reasoning=reasoning,
            evidence_used=[e.evidence_id for e in refs],
            strengths=strengths, weaknesses=weaknesses, missing_information=missing,
        )

    def _assess_explainability(self, cap: Capability) -> DimensionFinding:
        strengths, weaknesses, missing = [], [], []
        word_count = len(cap.description.split())

        if not cap.description.strip():
            score = 0.0
            missing.append("description")
            reasoning = "No description provided; capability cannot be explained in plain language."
        elif word_count < 15:
            score = 0.4
            weaknesses.append("Description is too brief to be clearly explainable")
            reasoning = f"Description present but short ({word_count} words)."
        else:
            score = 0.9
            strengths.append("Description provides enough detail to explain the mechanism")
            reasoning = f"Description present and reasonably detailed ({word_count} words)."

        passed = score >= self.dimension_registry[DimensionName.EXPLAINABILITY].min_passing_score
        return DimensionFinding(
            dimension=DimensionName.EXPLAINABILITY,
            score=score, passed=passed, reasoning=reasoning,
            evidence_used=["capability.description"],
            strengths=strengths, weaknesses=weaknesses, missing_information=missing,
        )

    def _assess_reusability(self, cap: Capability) -> DimensionFinding:
        strengths, weaknesses, missing = [], [], []
        score = 0.6  # neutral baseline; refined by dependency clarity

        if cap.dependencies:
            score += 0.2
            strengths.append("Dependencies are explicitly listed")
        else:
            weaknesses.append("No dependencies listed; may be understated")

        reasoning = f"Reusability scored {score:.2f} based on dependency clarity."
        passed = score >= self.dimension_registry[DimensionName.REUSABILITY].min_passing_score
        return DimensionFinding(
            dimension=DimensionName.REUSABILITY,
            score=min(score, 1.0), passed=passed, reasoning=reasoning,
            evidence_used=["capability.dependencies"],
            strengths=strengths, weaknesses=weaknesses, missing_information=missing,
        )

    def _assess_enterprise_readiness(self, cap: Capability) -> DimensionFinding:
        strengths, weaknesses, missing = [], [], []
        score = 0.5

        if cap.risks:
            score += 0.3
            strengths.append("Known risks are documented")
        else:
            weaknesses.append("No risks documented; readiness cannot be fully confirmed")

        reasoning = f"Enterprise readiness scored {score:.2f} based on documented risk awareness."
        passed = score >= self.dimension_registry[DimensionName.ENTERPRISE_READINESS].min_passing_score
        return DimensionFinding(
            dimension=DimensionName.ENTERPRISE_READINESS,
            score=min(score, 1.0), passed=passed, reasoning=reasoning,
            evidence_used=["capability.risks"],
            strengths=strengths, weaknesses=weaknesses, missing_information=missing,
        )

    def _assess_constitutional_alignment(self, cap: Capability) -> DimensionFinding:
        # NOTE: This platform does NOT grant constitutional approval.
        # It only flags whether a known conflict has been documented.
        strengths, weaknesses, missing = [], [], []
        notes = (cap.constitutional_notes or "").lower()
        negations = ("no conflict", "no known conflict", "not in conflict", "does not conflict")
        has_negated_conflict = any(neg in notes for neg in negations)
        has_conflict_flag = "conflict" in notes and not has_negated_conflict

        if has_conflict_flag:
            score = 0.2
            weaknesses.append("Constitutional notes mention a possible conflict")
        elif cap.constitutional_notes:
            score = 0.9
            strengths.append("Constitutional notes present, no conflict flagged")
        else:
            score = 0.5
            missing.append("constitutional_notes")

        reasoning = (
            f"Constitutional alignment scored {score:.2f} based on submitted notes. "
            "This is a documentation check only — final constitutional authority "
            "remains outside this platform."
        )
        passed = score >= self.dimension_registry[DimensionName.CONSTITUTIONAL_ALIGNMENT].min_passing_score
        return DimensionFinding(
            dimension=DimensionName.CONSTITUTIONAL_ALIGNMENT,
            score=score, passed=passed, reasoning=reasoning,
            evidence_used=["capability.constitutional_notes"],
            strengths=strengths, weaknesses=weaknesses, missing_information=missing,
        )

    def _assess_oba_compatibility(self, cap: Capability) -> DimensionFinding:
        strengths, weaknesses, missing = [], [], []
        if cap.oba_compatibility_notes:
            score = 0.8
            strengths.append("OBA compatibility notes present")
        else:
            score = 0.5
            missing.append("oba_compatibility_notes")

        reasoning = f"OBA compatibility scored {score:.2f} based on submitted notes."
        passed = score >= self.dimension_registry[DimensionName.OBA_COMPATIBILITY].min_passing_score
        return DimensionFinding(
            dimension=DimensionName.OBA_COMPATIBILITY,
            score=score, passed=passed, reasoning=reasoning,
            evidence_used=["capability.oba_compatibility_notes"],
            strengths=strengths, weaknesses=weaknesses, missing_information=missing,
        )

    # ---- Orchestration ----------------------------------------------------

    def run_completeness_check(self, cap: Capability) -> list[str]:
        """Returns missing required fields. Empty = structurally complete."""
        return cap.required_fields_present()

    def assess(self, cap: Capability) -> ValidationResult:
        """
        Runs the full PART-3 pipeline and returns an explainable ValidationResult.
        Does NOT set a final decision state — that is PART-4's responsibility.
        """
        missing_required = self.run_completeness_check(cap)

        assessors = [
            self._assess_organizational_value,
            self._assess_organizational_impact,
            self._assess_evidence_quality,
            self._assess_explainability,
            self._assess_reusability,
            self._assess_enterprise_readiness,
            self._assess_constitutional_alignment,
            self._assess_oba_compatibility,
        ]

        findings = [assessor(cap) for assessor in assessors]

        total_weight = sum(self.dimension_registry[f.dimension].weight for f in findings)
        weighted_score = sum(
            f.score * self.dimension_registry[f.dimension].weight for f in findings
        ) / total_weight if total_weight else 0.0

        all_missing = list(dict.fromkeys(
            missing_required + [m for f in findings for m in f.missing_information]
        ))

        result = ValidationResult(
            capability_id=cap.capability_id,
            findings=findings,
            overall_score=weighted_score,
            risks=cap.risks,
            missing_information=all_missing,
        )
        return result
