from modules.quality_models import (
    EngineeringArtifact,
    QualityStandard,
    GovernanceRule,
    Review,
    QualityCheck,
    QualityGate,
    Finding,
    Severity,
    ComplianceRequirement,
    Evidence,
    Remediation,
    Approval,
    Exception,
    AuditRecord,
    QualityMetric,
    ImprovementInitiative,
)


def test_quality_models_can_be_created():
    artifact = EngineeringArtifact(
        id="artifact-1",
        name="Test Artifact",
        artifact_type="document",
        source="test",
    )

    standard = QualityStandard(
        id="standard-1",
        name="Test Standard",
        description="Test quality standard",
        version="1.0",
    )

    rule = GovernanceRule(
        id="rule-1",
        name="Test Rule",
        description="Test governance rule",
    )

    review = Review(
        id="review-1",
        artifact_id=artifact.id,
        reviewer="reviewer-1",
        status="PENDING",
    )

    check = QualityCheck(
        id="check-1",
        artifact_id=artifact.id,
        rule_id=rule.id,
        status="PASSED",
    )

    gate = QualityGate(
        id="gate-1",
        name="Test Gate",
        status="PASSED",
        required_check_ids=[check.id],
    )

    finding = Finding(
        id="finding-1",
        artifact_id=artifact.id,
        title="Test Finding",
        description="Test finding",
        severity=Severity.MEDIUM,
        rule_id=rule.id,
    )

    compliance = ComplianceRequirement(
        id="compliance-1",
        name="Test Requirement",
        description="Test compliance requirement",
    )

    evidence = Evidence(
        id="evidence-1",
        artifact_id=artifact.id,
        evidence_type="document",
        source="test",
        description="Test evidence",
    )

    remediation = Remediation(
        id="remediation-1",
        finding_id=finding.id,
        description="Fix test finding",
    )

    approval = Approval(
        id="approval-1",
        review_id=review.id,
        approver="approver-1",
        status="APPROVED",
    )

    exception_record = Exception(
        id="exception-1",
        artifact_id=artifact.id,
        reason="Test exception",
        requested_by="user-1",
    )

    audit = AuditRecord(
        id="audit-1",
        action="CREATE",
        actor="user-1",
        timestamp="2026-08-15T00:00:00",
        artifact_id=artifact.id,
    )

    metric = QualityMetric(
        id="metric-1",
        name="Test Pass Rate",
        value=100.0,
        unit="percent",
    )

    initiative = ImprovementInitiative(
        id="initiative-1",
        title="Test Improvement",
        description="Test improvement initiative",
    )

    models = [
        artifact,
        standard,
        rule,
        review,
        check,
        gate,
        finding,
        compliance,
        evidence,
        remediation,
        approval,
        exception_record,
        audit,
        metric,
        initiative,
    ]

    assert len(models) == 15
    assert finding.severity == Severity.MEDIUM
    assert gate.required_check_ids == ["check-1"]


if __name__ == "__main__":
    test_quality_models_can_be_created()
    print("Quality model tests passed successfully")
