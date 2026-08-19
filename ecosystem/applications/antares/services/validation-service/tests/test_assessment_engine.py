"""
Unit tests — Capability model, Assessment Engine, Decision Engine.
Roadmap Reference: PART-7 — Testing
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest

from app.models.capability import Capability, EvidenceReference, ReadinessLevel
from app.models.assessment import ValidationState
from app.engine.assessment_engine import AssessmentEngine
from app.engine.decision_engine import DecisionEngine


def make_strong_capability() -> Capability:
    return Capability(
        capability_name="Automated Meeting Intelligence",
        description=(
            "A capability that automatically summarizes leadership meetings, "
            "extracts decisions and action items, and routes them to the "
            "relevant organizational owners without manual note-taking."
        ),
        organizational_problem="Leadership decisions made in meetings are frequently lost or untracked.",
        target_organization="Mid-size enterprise leadership teams",
        expected_value="Reduces decision-tracking overhead and improves accountability across leadership.",
        expected_outcome="Every leadership decision has a traceable owner and deadline.",
        source_platform="Organizational Futures",
        dependencies=["meeting-transcription-service"],
        risks=["Transcription inaccuracy could mislabel a decision"],
        evidence_references=[
            EvidenceReference(evidence_id="EV-001", source="research-artifact-registry",
                               description="Pilot study across 3 leadership teams",
                               url_or_locator="registry://research-artifact-registry/EV-001"),
            EvidenceReference(evidence_id="EV-002", source="signal-registry",
                               description="Survey signal on meeting follow-through",
                               url_or_locator="registry://signal-registry/EV-002"),
        ],
        constitutional_notes="Reviewed against constitutional boundaries; no conflict found.",
        oba_compatibility_notes="Compatible with current OBA integration boundary draft.",
        initial_readiness=ReadinessLevel.MATURE_CANDIDATE,
    )


def make_incomplete_capability() -> Capability:
    return Capability(capability_name="Untitled idea")


class TestCapabilityModel:
    def test_structurally_complete_capability(self):
        cap = make_strong_capability()
        assert cap.is_structurally_complete()
        assert cap.required_fields_present() == []

    def test_incomplete_capability_reports_missing_fields(self):
        cap = make_incomplete_capability()
        missing = cap.required_fields_present()
        assert "organizational_problem" in missing
        assert "target_organization" in missing
        assert not cap.is_structurally_complete()

    def test_to_dict_is_serializable(self):
        cap = make_strong_capability()
        d = cap.to_dict()
        assert d["capability_name"] == "Automated Meeting Intelligence"
        assert isinstance(d["evidence_references"], list)


class TestAssessmentEngine:
    def setup_method(self):
        self.engine = AssessmentEngine()

    def test_strong_capability_scores_well(self):
        result = self.engine.assess(make_strong_capability())
        assert result.overall_score > 0.6
        assert len(result.findings) == 8  # all 8 dimensions run

    def test_every_finding_has_reasoning(self):
        result = self.engine.assess(make_strong_capability())
        for finding in result.findings:
            assert finding.reasoning
            assert isinstance(finding.evidence_used, list)

    def test_incomplete_capability_flags_missing_required_fields(self):
        result = self.engine.assess(make_incomplete_capability())
        assert "organizational_problem" in result.missing_information

    def test_no_evidence_lowers_evidence_quality_score(self):
        cap = make_strong_capability()
        cap.evidence_references = []
        result = self.engine.assess(cap)
        evidence_finding = next(f for f in result.findings if f.dimension.value == "EVIDENCE_QUALITY")
        assert evidence_finding.score == 0.0
        assert "evidence_references" in evidence_finding.missing_information


class TestDecisionEngine:
    def setup_method(self):
        self.assessment_engine = AssessmentEngine()
        self.decision_engine = DecisionEngine()

    def test_incomplete_capability_yields_incomplete_state(self):
        result = self.assessment_engine.assess(make_incomplete_capability())
        result = self.decision_engine.decide(result)
        assert result.state == ValidationState.INCOMPLETE

    def test_strong_capability_yields_validated_or_ready(self):
        result = self.assessment_engine.assess(make_strong_capability())
        result = self.decision_engine.decide(result)
        assert result.state in (ValidationState.VALIDATED, ValidationState.VALIDATION_READY)
        assert result.recommendation

    def test_weak_but_present_capability_yields_revision_required(self):
        cap = make_strong_capability()
        cap.evidence_references = []
        cap.risks = []
        cap.dependencies = []
        result = self.assessment_engine.assess(cap)
        result = self.decision_engine.decide(result)
        assert result.state in (ValidationState.REVISION_REQUIRED, ValidationState.REJECTED)

    def test_empty_capability_never_incorrectly_validated(self):
        cap = Capability()
        result = self.assessment_engine.assess(cap)
        result = self.decision_engine.decide(result)
        assert result.state != ValidationState.VALIDATED


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v"]))
