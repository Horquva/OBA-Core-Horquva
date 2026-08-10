from security_quality_platform.database import Base, SessionLocal, engine
from security_quality_platform.domain.models import (
    Assessment,
    AuditRecord,
    Certification,
    Control,
    Evidence,
    ExceptionRecord,
    Finding,
    RegressionCase,
    Scorecard,
    TestCase as DomainTestCase,
    TestPlan as DomainTestPlan,
    TrustState,
)


def test_required_domain_tables_exist():
    Base.metadata.create_all(bind=engine)

    expected = {
        "assessments",
        "test_plans",
        "test_cases",
        "findings",
        "evidence",
        "controls",
        "exceptions",
        "certifications",
        "trust_states",
        "regression_cases",
        "scorecards",
        "audit_records",
    }

    assert expected.issubset(set(Base.metadata.tables.keys()))


def test_assessment_persists():
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        assessment = Assessment(
            target_platform="Sentinel",
            target_capability="Application Security",
            environment="test",
            scope="Verify application security controls",
            risk_tier="TIER_1",
            verification_depth="DEEP",
            responsible_owner="platform-owner",
            verification_authority="security-quality",
            acceptance_criteria="Required tests and evidence must pass",
        )

        db.add(assessment)
        db.commit()
        db.refresh(assessment)

        stored = db.get(Assessment, assessment.id)

        assert stored is not None
        assert stored.target_platform == "Sentinel"
        assert stored.status == "REQUESTED"

    finally:
        db.close()


def test_all_required_model_classes_exist():
    required = [
        Assessment,
        DomainTestPlan,
        DomainTestCase,
        Finding,
        Evidence,
        Control,
        ExceptionRecord,
        Certification,
        TrustState,
        RegressionCase,
        Scorecard,
        AuditRecord,
    ]

    assert len(required) == 12
