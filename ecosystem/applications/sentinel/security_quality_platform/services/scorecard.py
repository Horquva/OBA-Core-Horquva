from sqlalchemy.orm import Session

from security_quality_platform.domain.models import (
    Assessment,
    Control,
    Evidence,
    Finding,
    TestCase,
    TestPlan,
    TrustState,
)


SEVERITY_PENALTIES = {
    "INFO": 0,
    "LOW": 5,
    "MEDIUM": 10,
    "HIGH": 20,
    "CRITICAL": 35,
}


TRUST_SCORES = {
    "TRUSTED": 100,
    "AT_RISK": 70,
    "DEGRADED": 40,
    "REVOKED": 0,
}


def calculate_scorecard(db: Session, assessment: Assessment) -> dict:
    # ------------------------------------------------------------
    # Quality score: security test pass rate
    # ------------------------------------------------------------
    test_cases = (
        db.query(TestCase)
        .join(TestPlan)
        .filter(TestPlan.assessment_id == assessment.id)
        .all()
    )

    executed_tests = [
        test for test in test_cases if test.result != "NOT_RUN"
    ]

    if executed_tests:
        passed = sum(
            1 for test in executed_tests if test.result == "PASS"
        )
        quality_score = (passed / len(executed_tests)) * 100
    else:
        quality_score = 0.0

    # ------------------------------------------------------------
    # Risk score: starts healthy, findings reduce it
    # ------------------------------------------------------------
    findings = (
        db.query(Finding)
        .filter(Finding.assessment_id == assessment.id)
        .all()
    )

    risk_score = 100.0

    for finding in findings:
        if finding.status != "CLOSED":
            risk_score -= SEVERITY_PENALTIES.get(
                finding.severity,
                10,
            )

    risk_score = max(0.0, risk_score)

    # ------------------------------------------------------------
    # Evidence health: verified evidence percentage
    # ------------------------------------------------------------
    evidence = (
        db.query(Evidence)
        .filter(Evidence.assessment_id == assessment.id)
        .all()
    )

    if evidence:
        verified = sum(
            1 for item in evidence if item.integrity_verified
        )
        evidence_health_score = (verified / len(evidence)) * 100
    else:
        evidence_health_score = 0.0

    # ------------------------------------------------------------
    # Compliance score: mandatory control pass rate
    # ------------------------------------------------------------
    mandatory_controls = (
        db.query(Control)
        .filter(Control.mandatory.is_(True))
        .all()
    )

    if mandatory_controls:
        passed_controls = sum(
            1 for control in mandatory_controls
            if control.status == "PASS"
        )

        compliance_score = (
            passed_controls / len(mandatory_controls)
        ) * 100
    else:
        compliance_score = 0.0

    # ------------------------------------------------------------
    # Trust score
    # ------------------------------------------------------------
    trust = (
        db.query(TrustState)
        .filter(
            TrustState.subject_type == "assessment",
            TrustState.subject_id == assessment.id,
        )
        .first()
    )

    if trust:
        trust_score = float(
            TRUST_SCORES.get(trust.status, 0)
        )
    else:
        trust_score = 0.0

    # ------------------------------------------------------------
    # Overall assurance score
    # ------------------------------------------------------------
    overall_score = (
        quality_score
        + risk_score
        + compliance_score
        + trust_score
        + evidence_health_score
    ) / 5

    return {
        "quality_score": round(quality_score, 2),
        "risk_score": round(risk_score, 2),
        "compliance_score": round(compliance_score, 2),
        "trust_score": round(trust_score, 2),
        "evidence_health_score": round(
            evidence_health_score,
            2,
        ),
        "overall_score": round(overall_score, 2),
    }
