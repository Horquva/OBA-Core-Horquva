"""
Test suite (roadmap Part-7).

Runs on the standard library alone:  python -m unittest discover tests
Also runs under pytest if the team prefers it:  pytest tests/
"""

from __future__ import annotations

import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from domains.research.domain.models import (                  # noqa: E402
    EvidenceStatus, LifecycleError, LifecycleState, SourceType,
    assert_transition, deterministic_id, normalize_text,
)
from domains.research.domain import taxonomy
from domains.research.engines.ingestion import ValidationError
from domains.research.seed import load_seed
from domains.research.service import FutureSignalService


class TempServiceCase(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        self.tmp.close()
        self.svc = FutureSignalService(self.tmp.name)

    def tearDown(self) -> None:
        self.svc.close()
        os.unlink(self.tmp.name)

    def _signal(self, title: str, description: str, **kw) -> str:
        return self.svc.submit_signal({"title": title, "description": description, **kw})["signal"]["id"]

    def _evidence(self, signal_id: str, source: str, source_type: str = "INDUSTRY_REPORT",
                  observed: str = "2026-01-01", status: str = "VERIFIED") -> None:
        self.svc.add_evidence(signal_id, {
            "title": f"Evidence from {source}",
            "excerpt": "Supporting excerpt describing the observed development in detail.",
            "source_name": source, "source_type": source_type,
            "observed_at": observed, "published_at": observed, "status": status,
        })


# ---------------------------------------------------------------- unit tests

class TestDomain(unittest.TestCase):
    def test_ids_are_deterministic(self):
        self.assertEqual(deterministic_id("sig", "AI Copilots"),
                         deterministic_id("sig", "ai   copilots!"))

    def test_ids_differ_for_different_content(self):
        self.assertNotEqual(deterministic_id("sig", "alpha"), deterministic_id("sig", "beta"))

    def test_normalization_strips_noise(self):
        self.assertEqual(normalize_text("  AI-Assisted   Review!! "), "ai assisted review")

    def test_legal_transition(self):
        assert_transition(LifecycleState.DISCOVERED, LifecycleState.EVIDENCE_CAPTURED)

    def test_illegal_transition_is_refused(self):
        with self.assertRaises(LifecycleError):
            assert_transition(LifecycleState.DISCOVERED, LifecycleState.VALIDATED)

    def test_terminal_state_has_no_exit(self):
        with self.assertRaises(LifecycleError):
            assert_transition(LifecycleState.REJECTED, LifecycleState.DISCOVERED)


class TestTaxonomy(unittest.TestCase):
    def test_classification_is_reproducible(self):
        text = "Teams adopt an AI assistant copilot for human in the loop review"
        self.assertEqual(taxonomy.classify(text), taxonomy.classify(text))

    def test_classification_finds_expected_theme(self):
        self.assertIn("adaptive_governance", taxonomy.classify("policy as code guardrail audit"))

    def test_unknown_dimension_is_refused(self):
        with self.assertRaises(taxonomy.TaxonomyError):
            taxonomy.validate_dimension("vibes")

    def test_unmatched_text_returns_empty(self):
        self.assertEqual(taxonomy.classify("the weather is pleasant today"), [])


class TestEvidenceWeighting(TempServiceCase):
    def test_peer_reviewed_outweighs_social(self):
        sid = self._signal("Signal for weighting test",
                           "A description long enough to satisfy the ingestion validator rules.")
        self._evidence(sid, "Journal", "PEER_REVIEWED")
        self._evidence(sid, "Someone online", "SOCIAL")
        items = {e.provenance.source_type: e.weight for e in self.svc.repo.evidence_for(sid)}
        self.assertGreater(items[SourceType.PEER_REVIEWED], items[SourceType.SOCIAL])

    def test_retracted_evidence_has_zero_weight(self):
        sid = self._signal("Signal for retraction test",
                           "A description long enough to satisfy the ingestion validator rules.")
        self._evidence(sid, "Retracted Source", "INDUSTRY_REPORT", status="RETRACTED")
        self.assertEqual(self.svc.repo.evidence_for(sid)[0].weight, 0.0)


# --------------------------------------------------------- validation tests

class TestValidation(TempServiceCase):
    def test_short_title_refused(self):
        with self.assertRaises(ValidationError):
            self.svc.submit_signal({"title": "AI", "description": "x" * 60})

    def test_short_description_refused(self):
        with self.assertRaises(ValidationError):
            self.svc.submit_signal({"title": "A sufficiently long title", "description": "short"})

    def test_unknown_source_type_refused(self):
        sid = self._signal("Signal for source validation",
                           "A description long enough to satisfy the ingestion validator rules.")
        with self.assertRaises(ValidationError):
            self.svc.add_evidence(sid, {
                "title": "x", "excerpt": "y",
                "source_name": "z", "source_type": "MADE_UP_SOURCE",
            })

    def test_impact_without_evidence_refused(self):
        sid = self._signal("Signal with no evidence attached",
                           "A description long enough to satisfy the ingestion validator rules.")
        with self.assertRaises(ValidationError):
            self.svc.analyze_impact(sid)


# ------------------------------------------------------------ adversarial

class TestAdversarial(TempServiceCase):
    def test_duplicate_signal_merges_instead_of_duplicating(self):
        title = "Organizations adopt continuous compliance guardrails"
        body = "A description long enough to satisfy the ingestion validator rules everywhere."
        first = self.svc.submit_signal({"title": title, "description": body})
        second = self.svc.submit_signal({"title": title.upper() + "  ", "description": body})
        self.assertTrue(first["created"])
        self.assertFalse(second["created"])
        self.assertEqual(first["signal"]["id"], second["signal"]["id"])
        self.assertEqual(len(self.svc.repo.list_signals()), 1)

    def test_single_source_never_becomes_a_pattern(self):
        """Three items from one blog is repetition, not corroboration."""
        for n in range(3):
            sid = self._signal(
                f"Autonomous agent orchestration variant number {n}",
                "Agent orchestration and autonomous workflow automation described at length here.",
            )
            self._evidence(sid, "The Same Blog", "PRACTITIONER_BLOG", observed=f"2026-0{n+1}-01")
            self.svc.analyze_impact(sid)
        self.svc.run_intelligence_cycle()
        self.assertEqual(len(self.svc.repo.list_patterns()), 0)

    def test_disputed_evidence_produces_high_severity_finding(self):
        sid = self._signal("Signal backed by disputed material",
                           "A description long enough to satisfy the ingestion validator rules.")
        self._evidence(sid, "Vendor", "VENDOR_PUBLICATION", status="DISPUTED")
        findings = self.svc.contradictions.check_signal(sid)
        self.assertTrue(any(f["type"] == "CONFLICTING_EVIDENCE" and f["severity"] == "HIGH"
                            for f in findings))

    def test_outdated_evidence_is_flagged(self):
        sid = self._signal("Signal backed by very old material",
                           "A description long enough to satisfy the ingestion validator rules.")
        self._evidence(sid, "Old Report", "INDUSTRY_REPORT", observed="2018-01-01")
        findings = self.svc.contradictions.check_signal(sid)
        self.assertTrue(any(f["type"] == "OUTDATED_EVIDENCE" for f in findings))

    def test_contradictions_reduce_confidence(self):
        """Same evidence volume, worse quality -> strictly lower confidence."""
        for n in range(2):
            sid = self._signal(
                f"Clean human in the loop copilot adoption case {n}",
                "An ai assistant copilot with human in the loop augmentation described at length.",
            )
            self._evidence(sid, f"Clean Source {n}", "PEER_REVIEWED", observed=f"2026-0{n+1}-01")
            self.svc.analyze_impact(sid)
        for n in range(2):
            sid = self._signal(
                f"Disputed agent orchestration autonomous case {n}",
                "Agent orchestration and autonomous workflow automation described at length here.",
            )
            self._evidence(sid, f"Weak Source {n}", "SOCIAL",
                           observed=f"2026-0{n+1}-01", status="DISPUTED")
            self.svc.analyze_impact(sid)
        self.svc.run_intelligence_cycle()
        scores = {p.theme: p.confidence.value for p in self.svc.repo.list_patterns()}
        self.assertGreater(scores["human_ai_collaboration"], scores["autonomous_coordination"])

    def test_validation_blocked_by_high_severity_contradiction(self):
        for n in range(2):
            sid = self._signal(
                f"Disputed agent orchestration autonomous case {n}",
                "Agent orchestration and autonomous workflow automation described at length here.",
            )
            self._evidence(sid, f"Weak Source {n}", "SOCIAL",
                           observed=f"2026-0{n+1}-01", status="DISPUTED")
            self.svc.analyze_impact(sid)
        self.svc.run_intelligence_cycle()
        pattern = self.svc.repo.list_patterns()[0]
        self.svc.confirm_pattern(pattern.id, reviewer="tester")
        with self.assertRaises(ValidationError):
            self.svc.validate_pattern(pattern.id, reviewer="tester")

    def test_cannot_validate_without_human_confirmation(self):
        for n in range(2):
            sid = self._signal(
                f"Clean human in the loop copilot adoption case {n}",
                "An ai assistant copilot with human in the loop augmentation described at length.",
            )
            self._evidence(sid, f"Clean Source {n}", "PEER_REVIEWED", observed=f"2026-0{n+1}-01")
            self.svc.analyze_impact(sid)
        self.svc.run_intelligence_cycle()
        pattern = self.svc.repo.list_patterns()[0]
        with self.assertRaises(ValidationError):
            self.svc.validate_pattern(pattern.id, reviewer="tester")


# ------------------------------------------------------------ integration

class TestEndToEnd(TempServiceCase):
    def test_full_pipeline_produces_artifact_with_provenance(self):
        load_seed(self.svc)
        self.svc.run_intelligence_cycle()
        patterns = self.svc.repo.list_patterns()
        self.assertGreater(len(patterns), 0)

        clean = [p for p in patterns
                 if not any(c.get("severity") == "HIGH" for c in p.contradictions)]
        self.assertGreater(len(clean), 0, "seed set should yield at least one clean pattern")

        target = max(clean, key=lambda p: p.confidence.value)
        self.svc.confirm_pattern(target.id, reviewer="tester")
        artifact = self.svc.validate_pattern(target.id, reviewer="tester")

        payload = artifact.payload
        for required in ("identity", "evidence", "organizational_impact", "relationships",
                         "pattern_candidates", "confidence", "provenance",
                         "contradictions", "trajectory"):
            self.assertIn(required, payload, f"contract missing '{required}'")
        self.assertTrue(payload["evidence"], "artifact must carry its evidence")
        self.assertTrue(payload["provenance"]["audit_trail"], "artifact must carry an audit trail")
        self.assertEqual(payload["provenance"]["human_reviewer"], "tester")

    def test_every_pattern_can_explain_itself(self):
        load_seed(self.svc)
        self.svc.run_intelligence_cycle()
        for p in self.svc.repo.list_patterns():
            self.assertTrue(p.explanation.get("why_detected"))
            self.assertTrue(p.explanation.get("supporting_signals"))
            self.assertTrue(p.explanation.get("supporting_evidence"))
            self.assertTrue(p.explanation.get("open_questions"))
            self.assertIn("weights", p.explanation["scoring_method"])

    def test_cycle_is_idempotent(self):
        load_seed(self.svc)
        self.svc.run_intelligence_cycle()
        first = {p.id: p.confidence.value for p in self.svc.repo.list_patterns()}
        self.svc.run_intelligence_cycle()
        second = {p.id: p.confidence.value for p in self.svc.repo.list_patterns()}
        self.assertEqual(first, second, "re-running the cycle must not drift the results")

    def test_lifecycle_history_is_recorded(self):
        load_seed(self.svc)
        self.svc.run_intelligence_cycle()
        for signal in self.svc.repo.list_signals():
            states = [h["state"] for h in signal.history]
            self.assertEqual(states[0], LifecycleState.DISCOVERED.value)
            self.assertEqual(len(states), len(set(states)), "no state recorded twice")


if __name__ == "__main__":
    unittest.main(verbosity=2)
