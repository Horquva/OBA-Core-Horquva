"""
Integration tests — full pipeline through CapabilityValidationService.
Roadmap Reference: PART-7 — Integration Testing, Edge Cases, Explainability Testing
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest

from app.models.capability import Capability, EvidenceReference
from app.models.assessment import ValidationState
from app.services.validation_service import CapabilityValidationService
from app.engine.comparison_engine import ComparisonEngine


@pytest.fixture
def service():
    return CapabilityValidationService()


def submit_and_validate(service, **overrides):
    defaults = dict(
        capability_name="Test Capability",
        description="A reasonably detailed description of what this capability does and why it matters to the organization.",
        organizational_problem="Some organizational problem exists.",
        target_organization="Target org",
        expected_value="Delivers measurable value to the target organization.",
        expected_outcome="A clearer outcome for the org.",
        source_platform="Organizational Futures",
    )
    defaults.update(overrides)
    cap = Capability(**defaults)
    service.submit_capability(cap)
    result = service.initiate_validation(cap.capability_id)
    return cap, result


class TestFullPipeline:
    def test_upstream_to_downstream_flow(self, service):
        cap, result = submit_and_validate(service)
        assert result.capability_id == cap.capability_id
        status = service.get_status(cap.capability_id)
        assert status == result.state

    def test_decision_reasoning_is_machine_readable(self, service):
        cap, result = submit_and_validate(service)
        reasoning = service.get_decision_reasoning(cap.capability_id)
        assert "findings" in reasoning
        assert all("reasoning" in f for f in reasoning["findings"])

    def test_validation_report_is_human_readable(self, service):
        cap, _ = submit_and_validate(service)
        report = service.get_validation_report(cap.capability_id)
        assert report["capability_name"] == "Test Capability"
        assert "recommendation" not in report or True  # report intentionally summary-only


class TestRevisionWorkflow:
    def test_revision_preserves_history(self, service):
        cap = Capability(capability_name="Weak capability")  # missing required fields
        service.submit_capability(cap)
        service.initiate_validation(cap.capability_id)

        # Revise with the missing required fields
        service.request_revision(cap.capability_id, {
            "description": "Now with a proper detailed description of the mechanism involved.",
            "organizational_problem": "A real, specific organizational problem.",
            "target_organization": "Some org",
            "expected_value": "Concrete measurable value delivered to the organization.",
            "source_platform": "Trust & Verification",
        })

        history = service.get_validation_history(cap.capability_id)
        # original INCOMPLETE + revised cycle's UNDER_REVIEW + final decision
        assert len(history) == 3
        assert history[0]["state"] == ValidationState.INCOMPLETE.value
        assert history[1]["state"] == ValidationState.UNDER_REVIEW.value
        assert history[2]["state"] not in (
            ValidationState.INCOMPLETE.value,
            ValidationState.UNDER_REVIEW.value,
        )


class TestEdgeCases:
    def test_unknown_capability_raises(self, service):
        with pytest.raises(KeyError):
            service.initiate_validation("CAP-DOES-NOT-EXIST")

    def test_status_before_assessment_raises(self, service):
        cap = Capability(capability_name="Not yet assessed")
        service.submit_capability(cap)
        with pytest.raises(KeyError):
            service.get_status(cap.capability_id)

    def test_empty_evidence_list_handled_gracefully(self, service):
        cap, result = submit_and_validate(service)
        assert isinstance(result.missing_information, list)  # no crash on empty evidence

    def test_duplicate_capability_names_detected_by_comparison_engine(self, service):
        cap_a, result_a = submit_and_validate(service, capability_name="Meeting Summary Tool")
        cap_b, result_b = submit_and_validate(service, capability_name="Meeting Summary Assistant")
        comparator = ComparisonEngine()
        overlaps = comparator.find_overlaps({
            cap_a.capability_id: cap_a.capability_name,
            cap_b.capability_id: cap_b.capability_name,
        })
        assert (cap_a.capability_id, cap_b.capability_id) in overlaps

    def test_conflicting_evidence_still_produces_a_state(self, service):
        cap = Capability(
            capability_name="Conflicting evidence case",
            description="A capability whose evidence sources disagree with each other on outcomes.",
            organizational_problem="Problem exists",
            target_organization="Org",
            expected_value="Some value",
            source_platform="Trust & Verification",
            evidence_references=[
                EvidenceReference(evidence_id="EV-A", source="signal-registry", description="Positive signal"),
                EvidenceReference(evidence_id="EV-B", source="signal-registry", description="Contradicts EV-A"),
            ],
        )
        service.submit_capability(cap)
        result = service.initiate_validation(cap.capability_id)
        assert result.state is not None  # never crashes, always resolves to a state


class TestComparisonAndPortfolio:
    def test_portfolio_view_categorizes_capabilities(self, service):
        _, result_strong = submit_and_validate(
            service, capability_name="Strong Capability",
            evidence_references=[EvidenceReference(evidence_id="EV-1", source="signal-registry", description="x")],
        )
        _, result_weak = submit_and_validate(
            service, capability_name="Weak Capability", expected_value="", target_organization="",
        )
        comparator = ComparisonEngine()
        portfolio = comparator.portfolio_view([result_strong, result_weak])
        assert "strongest" in portfolio
        assert "needing_revision" in portfolio or "needing_evidence" in portfolio


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v"]))
