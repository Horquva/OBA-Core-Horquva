from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from security_quality_platform.api.schemas import (
    AssessmentCreateRequest,
    AssessmentResponse,
    ControlCreateRequest,
    ControlEvaluateRequest,
    ControlResponse,
    EvidenceCreateRequest,
    EvidenceResponse,
    EvidenceVerifyRequest,
    FindingCreateRequest,
    FindingResponse,
    FindingRemediationRequest,
    FindingTransitionRequest,
    TestCaseCreateRequest,
    TestCaseResponse,
    TestCaseResultRequest,
    TestPlanCreateRequest,
    TestPlanResponse,
    TrustCreateRequest,
    TrustResponse,
    TrustTransitionRequest,
    RegressionCaseCreateRequest,
    RegressionCaseResponse,
    RegressionResultRequest,
    ScorecardCreateRequest,
    ScorecardResponse,
    CertificationCreateRequest,
    CertificationDecisionRequest,
    CertificationResponse,
)
from security_quality_platform.database import get_db
from security_quality_platform.domain.enums import (
    AssessmentStatus,
    CertificationStatus,
    ExceptionStatus,
    FindingStatus,
    TrustStatus,
)
from security_quality_platform.domain.models import (
    Assessment,
    AuditRecord,
    Control,
    Evidence,
    Finding,
    TestCase,
    TestPlan,
    TrustState,
    RegressionCase,
    Scorecard,
    Certification,
)
from security_quality_platform.services.lifecycle import (
    change_assessment_status,
    change_finding_status,
    change_trust_status,
    change_certification_status,
)
from security_quality_platform.services.scorecard import calculate_scorecard
from security_quality_platform.services.state_machine import InvalidTransition
from security_quality_platform.api.schemas import (
    AssessmentCreateRequest,
    AssessmentResponse,
    FindingCreateRequest,
    FindingResponse,
    TestCaseCreateRequest,
    TestCaseResponse,
    TestCaseResultRequest,
    TestPlanCreateRequest,
    TestPlanResponse,
)

from security_quality_platform.services.certification import (
    CertificationBlocked,
    validate_certification_readiness,
)

from datetime import datetime

from security_quality_platform.api.schemas import (
    ExceptionCreateRequest,
    ExceptionResponse,
    ExceptionTransitionRequest,
)
from security_quality_platform.domain.enums import ExceptionStatus
from security_quality_platform.domain.models import ExceptionRecord
from security_quality_platform.services.lifecycle import change_exception_status

router = APIRouter(prefix="/api/v1")


ALLOWED_REQUESTER_ROLES = {
    "platform-owner",
    "security-engineer",
    "security-quality",
    "ci-pipeline",
}


def authorize_requester(role: str) -> None:
    if role not in ALLOWED_REQUESTER_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Requester is not authorized to create assessments",
        )


@router.post(
    "/assessments",
    response_model=AssessmentResponse,
    status_code=201,
)
def create_assessment(
    payload: AssessmentCreateRequest,
    db: Session = Depends(get_db),
):
    authorize_requester(payload.requester_role)

    assessment = Assessment(
        target_platform=payload.target_platform,
        target_capability=payload.target_capability,
        environment=payload.environment,
        scope=payload.scope,
        risk_tier=payload.risk_tier,
        verification_depth=payload.verification_depth,
        responsible_owner=payload.responsible_owner,
        verification_authority=payload.verification_authority,
        acceptance_criteria=payload.acceptance_criteria,
    )

    db.add(assessment)
    db.flush()

    audit = AuditRecord(
        correlation_id=assessment.correlation_id,
        actor=payload.requester,
        action="ASSESSMENT_CREATED",
        resource_type="Assessment",
        resource_id=assessment.id,
        previous_state=None,
        new_state=assessment.status,
        details=(
            f"target={payload.target_platform}; "
            f"capability={payload.target_capability}; "
            f"risk={payload.risk_tier}"
        ),
    )

    db.add(audit)
    db.commit()
    db.refresh(assessment)

    return assessment


@router.post("/assessments/{assessment_id}/transition")
def transition_assessment_status(
    assessment_id: str,
    target_status: AssessmentStatus,
    actor: str,
    db: Session = Depends(get_db),
):
    assessment = db.get(Assessment, assessment_id)

    if assessment is None:
        raise HTTPException(
            status_code=404,
            detail="Assessment not found",
        )

    try:
        updated = change_assessment_status(
            db,
            assessment,
            target_status,
            actor=actor,
        )
    except InvalidTransition as exc:
        raise HTTPException(
            status_code=409,
            detail=str(exc),
        ) from exc

    return {
        "id": updated.id,
        "status": updated.status,
        "version": updated.version,
    }


@router.post(
    "/assessments/{assessment_id}/test-plans",
    response_model=TestPlanResponse,
    status_code=201,
)
def create_test_plan(
    assessment_id: str,
    payload: TestPlanCreateRequest,
    db: Session = Depends(get_db),
):
    assessment = db.get(Assessment, assessment_id)

    if assessment is None:
        raise HTTPException(
            status_code=404,
            detail="Assessment not found",
        )

    test_plan = TestPlan(
        assessment_id=assessment.id,
        name=payload.name,
        description=payload.description,
        owner=payload.owner,
    )

    db.add(test_plan)
    db.commit()
    db.refresh(test_plan)

    return test_plan


@router.post(
    "/test-plans/{test_plan_id}/test-cases",
    response_model=TestCaseResponse,
    status_code=201,
)
def create_test_case(
    test_plan_id: str,
    payload: TestCaseCreateRequest,
    db: Session = Depends(get_db),
):
    test_plan = db.get(TestPlan, test_plan_id)

    if test_plan is None:
        raise HTTPException(
            status_code=404,
            detail="Test plan not found",
        )

    test_case = TestCase(
        test_plan_id=test_plan.id,
        name=payload.name,
        category=payload.category,
        owner=payload.owner,
        evidence_required=payload.evidence_required,
    )

    db.add(test_case)
    db.commit()
    db.refresh(test_case)

    return test_case


@router.post(
    "/assessments/{assessment_id}/findings",
    response_model=FindingResponse,
    status_code=201,
)
def create_finding(
    assessment_id: str,
    payload: FindingCreateRequest,
    db: Session = Depends(get_db),
):
    assessment = db.get(Assessment, assessment_id)

    if assessment is None:
        raise HTTPException(
            status_code=404,
            detail="Assessment not found",
        )

    finding = Finding(
        assessment_id=assessment.id,
        title=payload.title,
        description=payload.description,
        severity=payload.severity.value,
        owner=payload.owner,
    )

    db.add(finding)
    db.commit()
    db.refresh(finding)

    return finding
    
    
@router.post(
    "/test-cases/{test_case_id}/result",
    response_model=TestCaseResponse,
)
def record_test_case_result(
    test_case_id: str,
    payload: TestCaseResultRequest,
    db: Session = Depends(get_db),
):
    test_case = db.get(TestCase, test_case_id)

    if test_case is None:
        raise HTTPException(
            status_code=404,
            detail="Test case not found",
        )

    if payload.result.value == "FAIL" and not payload.failure_classification:
        raise HTTPException(
            status_code=422,
            detail="Failed tests require a failure classification",
        )

    test_case.result = payload.result.value
    test_case.failure_classification = payload.failure_classification
    test_case.retest_required = payload.result.value == "FAIL"

    db.commit()
    db.refresh(test_case)

    return test_case
    
 
 
@router.post(
    "/findings/{finding_id}/remediation",
    response_model=FindingResponse,
)
def add_finding_remediation(
    finding_id: str,
    payload: FindingRemediationRequest,
    db: Session = Depends(get_db),
):
    finding = db.get(Finding, finding_id)

    if finding is None:
        raise HTTPException(
            status_code=404,
            detail="Finding not found",
        )

    finding.remediation = payload.remediation

    db.commit()
    db.refresh(finding)

    return finding


@router.post(
    "/findings/{finding_id}/transition",
    response_model=FindingResponse,
)
def transition_finding_status(
    finding_id: str,
    payload: FindingTransitionRequest,
    db: Session = Depends(get_db),
):
    finding = db.get(Finding, finding_id)

    if finding is None:
        raise HTTPException(
            status_code=404,
            detail="Finding not found",
        )

    try:
        target = FindingStatus(payload.target_status)

        updated = change_finding_status(
            db,
            finding,
            target,
            actor=payload.actor,
            correlation_id=finding.assessment.correlation_id,
        )

    except InvalidTransition as exc:
        raise HTTPException(
            status_code=409,
            detail=str(exc),
        ) from exc

    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail="Invalid finding status",
        ) from exc

    return updated
    
@router.post(
    "/assessments/{assessment_id}/evidence",
    response_model=EvidenceResponse,
    status_code=201,
)
def create_evidence(
    assessment_id: str,
    payload: EvidenceCreateRequest,
    db: Session = Depends(get_db),
):
    assessment = db.get(Assessment, assessment_id)

    if assessment is None:
        raise HTTPException(
            status_code=404,
            detail="Assessment not found",
        )

    evidence = Evidence(
        assessment_id=assessment.id,
        evidence_type=payload.evidence_type,
        source=payload.source,
        storage_reference=payload.storage_reference,
        sha256=payload.sha256.lower(),
        provenance=payload.provenance,
        collected_by=payload.collected_by,
        integrity_verified=False,
    )

    db.add(evidence)
    db.flush()

    audit = AuditRecord(
        correlation_id=assessment.correlation_id,
        actor=payload.collected_by,
        action="EVIDENCE_CREATED",
        resource_type="Evidence",
        resource_id=evidence.id,
        previous_state=None,
        new_state="UNVERIFIED",
        details=f"source={payload.source}; type={payload.evidence_type}",
    )

    db.add(audit)
    db.commit()
    db.refresh(evidence)

    return evidence


@router.post(
    "/evidence/{evidence_id}/verify",
    response_model=EvidenceResponse,
)
def verify_evidence(
    evidence_id: str,
    payload: EvidenceVerifyRequest,
    db: Session = Depends(get_db),
):
    evidence = db.get(Evidence, evidence_id)

    if evidence is None:
        raise HTTPException(
            status_code=404,
            detail="Evidence not found",
        )

    assessment = db.get(Assessment, evidence.assessment_id)

    if payload.observed_sha256.lower() != evidence.sha256.lower():
        raise HTTPException(
            status_code=409,
            detail="Evidence integrity verification failed",
        )

    evidence.integrity_verified = True

    audit = AuditRecord(
        correlation_id=assessment.correlation_id,
        actor=payload.verified_by,
        action="EVIDENCE_VERIFIED",
        resource_type="Evidence",
        resource_id=evidence.id,
        previous_state="UNVERIFIED",
        new_state="VERIFIED",
        details="SHA-256 integrity check passed",
    )

    db.add(audit)
    db.commit()
    db.refresh(evidence)

    return evidence
    
    
@router.post(
    "/controls",
    response_model=ControlResponse,
    status_code=201,
)
def create_control(
    payload: ControlCreateRequest,
    db: Session = Depends(get_db),
):
    existing = (
        db.query(Control)
        .filter(Control.control_key == payload.control_key)
        .first()
    )

    if existing is not None:
        raise HTTPException(
            status_code=409,
            detail="Control key already exists",
        )

    control = Control(
        control_key=payload.control_key,
        name=payload.name,
        framework=payload.framework,
        framework_reference=payload.framework_reference,
        owner=payload.owner,
        mandatory=payload.mandatory,
    )

    db.add(control)
    db.commit()
    db.refresh(control)

    return control


@router.post(
    "/controls/{control_id}/evaluate",
    response_model=ControlResponse,
)
def evaluate_control(
    control_id: str,
    payload: ControlEvaluateRequest,
    db: Session = Depends(get_db),
):
    control = db.get(Control, control_id)

    if control is None:
        raise HTTPException(
            status_code=404,
            detail="Control not found",
        )

    control.status = payload.status

    db.commit()
    db.refresh(control)

    return control
    
@router.post(
    "/exceptions",
    response_model=ExceptionResponse,
    status_code=201,
)
def create_exception(
    payload: ExceptionCreateRequest,
    db: Session = Depends(get_db),
):
    control = db.get(Control, payload.affected_control_id)

    if control is None:
        raise HTTPException(
            status_code=404,
            detail="Affected control not found",
        )

    exception = ExceptionRecord(
        control_id=payload.affected_control_id,
        reason=payload.reason,
        risk=payload.risk,
        scope=payload.scope,
        compensating_control=payload.compensating_control,
        risk_owner=payload.risk_owner,
        approver=payload.approver,
        start_date=datetime.fromisoformat(payload.start_date),
        expires_at=datetime.fromisoformat(payload.expiry_date),
    )

    db.add(exception)
    db.commit()
    db.refresh(exception)

    return {
        "id": exception.id,
        "reason": exception.reason,
        "risk": exception.risk,
        "scope": exception.scope,
        "affected_control_id": exception.control_id,
        "compensating_control": exception.compensating_control,
        "risk_owner": exception.risk_owner,
        "approver": exception.approver,
        "start_date": exception.start_date.isoformat(),
        "expiry_date": exception.expires_at.isoformat(),
        "status": exception.status,
        "version": exception.version,
    }


@router.post(
    "/exceptions/{exception_id}/transition",
)
def transition_exception_status(
    exception_id: str,
    payload: ExceptionTransitionRequest,
    db: Session = Depends(get_db),
):
    exception = db.get(ExceptionRecord, exception_id)

    if exception is None:
        raise HTTPException(
            status_code=404,
            detail="Exception not found",
        )

    try:
        target = ExceptionStatus(payload.target_status)

        updated = change_exception_status(
            db,
            exception,
            target,
            actor=payload.actor,
            correlation_id=exception.id,
        )

    except InvalidTransition as exc:
        raise HTTPException(
            status_code=409,
            detail=str(exc),
        ) from exc

    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail="Invalid exception status",
        ) from exc

    return {
        "id": updated.id,
        "status": updated.status,
    }
    
@router.post(
    "/trust",
    response_model=TrustResponse,
    status_code=201,
)
def create_trust_state(
    payload: TrustCreateRequest,
    db: Session = Depends(get_db),
):
    reverify_by = (
        datetime.fromisoformat(payload.reverify_by)
        if payload.reverify_by
        else None
    )

    trust = TrustState(
        subject_type=payload.subject_type,
        subject_id=payload.subject_id,
        reason=payload.reason,
        reverify_by=reverify_by,
    )

    db.add(trust)
    db.commit()
    db.refresh(trust)

    return {
        "id": trust.id,
        "subject_type": trust.subject_type,
        "subject_id": trust.subject_id,
        "status": trust.status,
        "reason": trust.reason,
        "last_verified_at": (
            trust.last_verified_at.isoformat()
            if trust.last_verified_at
            else None
        ),
        "reverify_by": (
            trust.reverify_by.isoformat()
            if trust.reverify_by
            else None
        ),
    }


@router.post(
    "/trust/{trust_id}/transition",
    response_model=TrustResponse,
)
def transition_trust_state(
    trust_id: str,
    payload: TrustTransitionRequest,
    db: Session = Depends(get_db),
):
    trust = db.get(TrustState, trust_id)

    if trust is None:
        raise HTTPException(
            status_code=404,
            detail="Trust state not found",
        )

    try:
        target = TrustStatus(payload.target_status)

        if payload.reason:
            trust.reason = payload.reason

        updated = change_trust_status(
            db,
            trust,
            target,
            actor=payload.actor,
            correlation_id=trust.id,
        )

    except InvalidTransition as exc:
        raise HTTPException(
            status_code=409,
            detail=str(exc),
        ) from exc

    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail="Invalid trust status",
        ) from exc

    return {
        "id": updated.id,
        "subject_type": updated.subject_type,
        "subject_id": updated.subject_id,
        "status": updated.status,
        "reason": updated.reason,
        "last_verified_at": (
            updated.last_verified_at.isoformat()
            if updated.last_verified_at
            else None
        ),
        "reverify_by": (
            updated.reverify_by.isoformat()
            if updated.reverify_by
            else None
        ),
    }
    
@router.post(
    "/regressions",
    response_model=RegressionCaseResponse,
    status_code=201,
)
def create_regression_case(
    payload: RegressionCaseCreateRequest,
    db: Session = Depends(get_db),
):
    if payload.source_finding_id is not None:
        finding = db.get(Finding, payload.source_finding_id)

        if finding is None:
            raise HTTPException(
                status_code=404,
                detail="Source finding not found",
            )

    regression = RegressionCase(
        name=payload.name,
        source_finding_id=payload.source_finding_id,
        test_reference=payload.test_reference,
        owner=payload.owner,
    )

    db.add(regression)
    db.commit()
    db.refresh(regression)

    return regression


@router.post(
    "/regressions/{regression_id}/result",
    response_model=RegressionCaseResponse,
)
def record_regression_result(
    regression_id: str,
    payload: RegressionResultRequest,
    db: Session = Depends(get_db),
):
    regression = db.get(RegressionCase, regression_id)

    if regression is None:
        raise HTTPException(
            status_code=404,
            detail="Regression case not found",
        )

    regression.last_result = payload.result.value

    db.commit()
    db.refresh(regression)

    return regression
    
    
@router.post(
    "/scorecards",
    response_model=ScorecardResponse,
    status_code=201,
)
def create_scorecard(
    payload: ScorecardCreateRequest,
    db: Session = Depends(get_db),
):
    assessment = db.get(Assessment, payload.assessment_id)

    if assessment is None:
        raise HTTPException(
            status_code=404,
            detail="Assessment not found",
        )

    scores = calculate_scorecard(db, assessment)

    scorecard = Scorecard(
        assessment_id=assessment.id,
        quality_score=scores["quality_score"],
        risk_score=scores["risk_score"],
        compliance_score=scores["compliance_score"],
        trust_score=scores["trust_score"],
        evidence_health_score=scores["evidence_health_score"],
        overall_score=scores["overall_score"],
    )

    db.add(scorecard)
    db.commit()
    db.refresh(scorecard)

    return scorecard
    
    
@router.post(
    "/certifications",
    response_model=CertificationResponse,
    status_code=201,
)
def create_certification(
    payload: CertificationCreateRequest,
    db: Session = Depends(get_db),
):
    assessment = db.get(Assessment, payload.assessment_id)

    if assessment is None:
        raise HTTPException(
            status_code=404,
            detail="Assessment not found",
        )

    certification = Certification(
        assessment_id=assessment.id,
    )

    db.add(certification)
    db.commit()
    db.refresh(certification)
    
    certification = change_certification_status(
    db,
    certification,
    CertificationStatus.UNDER_REVIEW,
    actor=payload.requested_by,
    correlation_id=assessment.correlation_id,
    )

    return {
        "id": certification.id,
        "assessment_id": certification.assessment_id,
        "status": certification.status,
        "decision_reason": certification.decision_reason,
        "approved_by": certification.approved_by,
        "expires_at": (
            certification.expires_at.isoformat()
            if certification.expires_at
            else None
        ),
    }


@router.post(
    "/certifications/{certification_id}/decision",
    response_model=CertificationResponse,
)
def decide_certification(
    certification_id: str,
    payload: CertificationDecisionRequest,
    db: Session = Depends(get_db),
):
    certification = db.get(Certification, certification_id)

    if certification is None:
        raise HTTPException(
            status_code=404,
            detail="Certification not found",
        )

    assessment = db.get(
        Assessment,
        certification.assessment_id,
    )

    if payload.decision in {"APPROVED", "CONDITIONAL"}:
        try:
            validate_certification_readiness(
                db,
                assessment,
            )
        except CertificationBlocked as exc:
            raise HTTPException(
                status_code=409,
                detail=str(exc),
            ) from exc

    target_status = CertificationStatus(payload.decision)

    certification.decision_reason = payload.reason
    certification.approved_by = payload.decided_by

    certification = change_certification_status(
        db,
        certification,
        target_status,
        actor=payload.decided_by,
        correlation_id=assessment.correlation_id,
    )

    return {
        "id": certification.id,
        "assessment_id": certification.assessment_id,
        "status": certification.status,
        "decision_reason": certification.decision_reason,
        "approved_by": certification.approved_by,
        "expires_at": (
            certification.expires_at.isoformat()
            if certification.expires_at
            else None
        ),
    }


@router.get(
    "/assessments/{assessment_id}/release-decision",
)
def get_release_decision(
    assessment_id: str,
    db: Session = Depends(get_db),
):
    assessment = db.get(Assessment, assessment_id)

    if assessment is None:
        raise HTTPException(
            status_code=404,
            detail="Assessment not found",
        )

    try:
        validate_certification_readiness(
            db,
            assessment,
        )
    except CertificationBlocked as exc:
        return {
            "assessment_id": assessment.id,
            "release": "BLOCKED",
            "reason": str(exc),
        }

    return {
        "assessment_id": assessment.id,
        "release": "ELIGIBLE",
        "reason": "All mandatory verification gates passed",
    }
    
    
@router.get("/audit")
def list_audit_records(
    limit: int = 100,
    db: Session = Depends(get_db),
):
    records = (
        db.query(AuditRecord)
        .order_by(AuditRecord.created_at.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "id": record.id,
            "correlation_id": record.correlation_id,
            "actor": record.actor,
            "action": record.action,
            "resource_type": record.resource_type,
            "resource_id": record.resource_id,
            "previous_state": record.previous_state,
            "new_state": record.new_state,
            "details": record.details,
            "created_at": record.created_at.isoformat(),
        }
        for record in records
    ]
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
        
    
    
    
    
    
    
    
    
    
    
    
    
    
