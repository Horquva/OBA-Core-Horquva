"""
Validation Decision Intelligence
Roadmap Reference: PART-4 — Build Validation Decision Intelligence

State Model (exact, from roadmap):
SUBMITTED -> INCOMPLETE -> UNDER_REVIEW -> REVISION_REQUIRED
-> VALIDATION_READY -> VALIDATED / REJECTED

This module turns a ValidationResult (from the AssessmentEngine) into a
final decision state, with full reasoning and a preserved revision history.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone

from app.models.assessment import ValidationResult, ValidationState


REJECTION_SCORE_THRESHOLD = 0.35   # below this -> REJECTED, not just revision
VALIDATION_SCORE_THRESHOLD = 0.7   # at/above this + no missing info -> VALIDATED


@dataclass
class DecisionHistoryEntry:
    """One immutable entry in a capability's validation history."""
    timestamp: datetime
    state: ValidationState
    overall_score: float
    recommendation: str
    triggered_by: str = "assessment_engine"


@dataclass
class CapabilityDecisionRecord:
    """
    Tracks the full decision lifecycle of one capability, including
    every revision cycle, so history remains traceable (PART-4 requirement).
    """
    capability_id: str
    history: list[DecisionHistoryEntry] = field(default_factory=list)
    current_state: ValidationState = ValidationState.SUBMITTED

    def add(self, entry: DecisionHistoryEntry) -> None:
        self.history.append(entry)
        self.current_state = entry.state


class DecisionEngine:
    """Applies decision logic on top of an assessment result."""

    def decide(self, result: ValidationResult) -> ValidationResult:
        """
        Mutates and returns the ValidationResult with a final `state`
        and human-readable `recommendation`, following the roadmap's
        state model and evidence-based decisioning structure:
        Capability -> Assessment Dimensions -> Evidence -> Findings
        -> Strengths -> Weaknesses -> Risks -> Missing Information
        -> Validation Recommendation
        """
        if result.missing_information and any(
            field_name in result.missing_information
            for field_name in ("capability_name", "description", "organizational_problem",
                                "target_organization", "expected_value", "source_platform")
        ):
            result.state = ValidationState.INCOMPLETE
            result.recommendation = (
                "Capability intake is structurally incomplete. Required fields are "
                f"missing: {', '.join(result.missing_information)}. Cannot proceed to review."
            )
            return result

        failed_dimensions = [f for f in result.findings if not f.passed]

        if result.overall_score < REJECTION_SCORE_THRESHOLD:
            result.state = ValidationState.REJECTED
            result.recommendation = (
                f"Overall score {result.overall_score:.2f} is below the rejection "
                f"threshold ({REJECTION_SCORE_THRESHOLD}). Failed dimensions: "
                f"{', '.join(f.dimension.value for f in failed_dimensions)}."
            )
            return result

        if failed_dimensions or result.missing_information:
            result.state = ValidationState.REVISION_REQUIRED
            result.recommendation = (
                "Capability shows organizational merit but requires revision. "
                f"Weak dimensions: {', '.join(f.dimension.value for f in failed_dimensions) or 'none'}. "
                f"Missing information: {', '.join(result.missing_information) or 'none'}."
            )
            return result

        if result.overall_score >= VALIDATION_SCORE_THRESHOLD:
            result.state = ValidationState.VALIDATED
            result.recommendation = (
                f"All dimensions passed with an overall score of {result.overall_score:.2f}. "
                "Capability is evidence-backed, explainable, and ready to move downstream. "
                "Note: this is a validation recommendation, not final constitutional approval."
            )
            return result

        # Passed every dimension but below the VALIDATED bar overall
        result.state = ValidationState.VALIDATION_READY
        result.recommendation = (
            f"All dimensions individually passed, but overall score "
            f"({result.overall_score:.2f}) is below the validation bar "
            f"({VALIDATION_SCORE_THRESHOLD}). Marked ready for reviewer sign-off."
        )
        return result

    def mark_under_review(
        self, record: CapabilityDecisionRecord, capability_id: str
    ) -> CapabilityDecisionRecord:
        """
        Explicitly transitions a capability into UNDER_REVIEW once it has
        passed the structural completeness pre-check and enters the full
        assessment pipeline. This state was previously defined in the enum
        but never actually reached — the roadmap's state model requires it
        to be a real, traceable step: SUBMITTED -> INCOMPLETE -> UNDER_REVIEW
        -> REVISION_REQUIRED -> VALIDATION_READY -> VALIDATED / REJECTED.
        """
        entry = DecisionHistoryEntry(
            timestamp=datetime.now(timezone.utc),
            state=ValidationState.UNDER_REVIEW,
            overall_score=0.0,
            recommendation=(
                "Capability passed structural completeness and has entered "
                "full assessment review."
            ),
            triggered_by="decision_engine.mark_under_review",
        )
        record.add(entry)
        return record

    def record_decision(
        self, record: CapabilityDecisionRecord, result: ValidationResult
    ) -> CapabilityDecisionRecord:
        """Appends a decision to the capability's traceable history."""
        entry = DecisionHistoryEntry(
            timestamp=datetime.now(timezone.utc),
            state=result.state,
            overall_score=result.overall_score,
            recommendation=result.recommendation,
        )
        record.add(entry)
        return record
