"""
Capability Validation Platform — Final Flow Demo
Roadmap Reference: PART-8 — Final Working Capability Validation Platform

Run this directly to see the full pipeline in action:
    python demo.py

Demonstrates the exact flow:
ANTARES DISCOVERY -> CANDIDATE CAPABILITY -> CAPABILITY INTAKE
-> COMPLETENESS CHECK -> EVIDENCE ANALYSIS -> BUSINESS VALUE ANALYSIS
-> ORGANIZATIONAL IMPACT -> REUSABILITY + READINESS
-> CONSTITUTIONAL ASSESSMENT -> EXPLAINABLE VALIDATION RESULT
-> REVISION / VALIDATION PATH -> DOWNSTREAM ANTARES ENGINE
-> FUTURE OBA CONSUMPTION
"""

import json
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.models.capability import Capability, EvidenceReference
from app.services.validation_service import CapabilityValidationService
from app.engine.comparison_engine import ComparisonEngine


def line(title: str = "") -> None:
    print("\n" + "=" * 70)
    if title:
        print(title)
        print("=" * 70)


def main():
    service = CapabilityValidationService()

    # ---- STEP 1: ANTARES DISCOVERY -> CANDIDATE CAPABILITY -------------
    line("STEP 1 — Candidate capability arrives from upstream discovery")
    candidate = Capability(
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
                               description="Pilot study across 3 leadership teams"),
            EvidenceReference(evidence_id="EV-002", source="signal-registry",
                               description="Survey signal on meeting follow-through"),
        ],
        constitutional_notes="Reviewed against constitutional boundaries; no conflict found.",
        oba_compatibility_notes="Compatible with current OBA integration boundary draft.",
    )
    print(f"Capability received from: {candidate.source_platform}")
    print(f"Capability name: {candidate.capability_name}")

    # ---- STEP 2: CAPABILITY INTAKE -------------------------------------
    line("STEP 2 — Capability Intake")
    intake_result = service.submit_capability(candidate)
    print(json.dumps(intake_result, indent=2))

    # ---- STEP 3: COMPLETENESS -> EVIDENCE -> VALUE -> IMPACT -> ... ----
    line("STEP 3 — Full assessment pipeline runs (8 dimensions)")
    result = service.initiate_validation(candidate.capability_id)
    for finding in result.findings:
        status = "PASS" if finding.passed else "FAIL"
        print(f"  [{status}] {finding.dimension.value:<26} score={finding.score:.2f}  {finding.reasoning}")

    # ---- STEP 4: EXPLAINABLE VALIDATION RESULT -------------------------
    line("STEP 4 — Explainable validation result")
    print(f"Overall score : {result.overall_score:.3f}")
    print(f"Final state   : {result.state.value}")
    print(f"Recommendation: {result.recommendation}")

    # ---- STEP 5: DOWNSTREAM-READY REPORT --------------------------------
    line("STEP 5 — Downstream Antares report (machine-readable)")
    report = service.get_validation_report(candidate.capability_id)
    print(json.dumps(report, indent=2))

    # ---- STEP 6: REVISION PATH DEMO (weak capability) --------------------
    line("STEP 6 — Revision path demo (a weak capability)")
    weak = Capability(capability_name="Untitled idea")
    service.submit_capability(weak)
    weak_result = service.initiate_validation(weak.capability_id)
    print(f"Initial state: {weak_result.state.value}")
    print(f"Missing info : {weak_result.missing_information}")

    print("\n-- submitting revision with required fields --")
    revised = service.request_revision(weak.capability_id, {
        "description": "A capability that flags duplicate vendor invoices before payment is issued.",
        "organizational_problem": "Duplicate invoices are occasionally paid twice.",
        "target_organization": "Finance operations team",
        "expected_value": "Prevents duplicate payments and recovers wasted spend.",
        "source_platform": "Trust & Verification",
        "evidence_references": [
            EvidenceReference(evidence_id="EV-101", source="signal-registry",
                               description="Finance ops duplicate-payment incident log"),
        ],
        "constitutional_notes": "No known conflict.",
        "oba_compatibility_notes": "Compatible.",
    })
    print(f"State after revision: {revised['state']}")

    # ---- STEP 7: PORTFOLIO / COMPARISON INTELLIGENCE ---------------------
    line("STEP 7 — Portfolio intelligence across both capabilities")
    comparator = ComparisonEngine()
    all_results = [result, service.get_assessment(weak.capability_id)]
    portfolio = comparator.portfolio_view(all_results)
    print(json.dumps(portfolio, indent=2))

    # ---- STEP 8: VALIDATION HISTORY (traceability) -----------------------
    line("STEP 8 — Full validation history (traceable, append-only)")
    for entry in service.get_validation_history(candidate.capability_id):
        print(f"  {entry['timestamp']}  {entry['state']:<18} score={entry['overall_score']}")

    line("DONE — Capability Validation Platform demo complete")


if __name__ == "__main__":
    main()
