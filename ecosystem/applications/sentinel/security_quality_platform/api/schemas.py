from pydantic import BaseModel, Field

from security_quality_platform.domain.enums import Severity, TestResult


# ---------------------------------------------------------------------------
# Assessment
# ---------------------------------------------------------------------------

class AssessmentCreateRequest(BaseModel):
    requester: str = Field(min_length=1)
    requester_role: str = Field(min_length=1)

    target_platform: str = Field(min_length=1)
    target_capability: str = Field(min_length=1)
    environment: str = Field(min_length=1)
    scope: str = Field(min_length=3)

    risk_tier: str = Field(pattern=r"^TIER_[123]$")
    verification_depth: str = Field(min_length=1)

    responsible_owner: str = Field(min_length=1)
    verification_authority: str = Field(min_length=1)
    acceptance_criteria: str = Field(min_length=3)


class AssessmentResponse(BaseModel):
    id: str
    correlation_id: str
    target_platform: str
    target_capability: str
    environment: str
    scope: str
    risk_tier: str
    verification_depth: str
    responsible_owner: str
    verification_authority: str
    acceptance_criteria: str
    status: str
    version: int

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Test Management
# ---------------------------------------------------------------------------

class TestPlanCreateRequest(BaseModel):
    name: str = Field(min_length=3)
    description: str | None = None
    owner: str = Field(min_length=1)


class TestPlanResponse(BaseModel):
    id: str
    assessment_id: str
    name: str
    description: str | None
    owner: str
    version: int

    model_config = {"from_attributes": True}


class TestCaseCreateRequest(BaseModel):
    name: str = Field(min_length=3)
    category: str = Field(min_length=1)
    owner: str = Field(min_length=1)
    evidence_required: bool = True


class TestCaseResponse(BaseModel):
    id: str
    test_plan_id: str
    name: str
    category: str
    owner: str
    result: str
    failure_classification: str | None
    evidence_required: bool
    retest_required: bool

    model_config = {"from_attributes": True}


class TestCaseResultRequest(BaseModel):
    result: TestResult
    failure_classification: str | None = None


# ---------------------------------------------------------------------------
# Finding Management
# ---------------------------------------------------------------------------

class FindingCreateRequest(BaseModel):
    title: str = Field(min_length=3)
    description: str = Field(min_length=3)
    severity: Severity
    owner: str = Field(min_length=1)


class FindingResponse(BaseModel):
    id: str
    assessment_id: str
    title: str
    description: str
    severity: str
    status: str
    owner: str
    remediation: str | None
    verified_by: str | None
    version: int

    model_config = {"from_attributes": True}
    
    
    
class FindingRemediationRequest(BaseModel):
    remediation: str = Field(min_length=3)
    actor: str = Field(min_length=1)


class FindingTransitionRequest(BaseModel):
    target_status: str = Field(min_length=1)
    actor: str = Field(min_length=1)
    
    
# ---------------------------------------------------------------------------
# Evidence
# ---------------------------------------------------------------------------

class EvidenceCreateRequest(BaseModel):
    evidence_type: str = Field(min_length=1)
    source: str = Field(min_length=1)
    storage_reference: str = Field(min_length=1)

    # SHA-256 must be exactly 64 hexadecimal characters.
    sha256: str = Field(
        pattern=r"^[a-fA-F0-9]{64}$"
    )

    provenance: str = Field(min_length=3)
    collected_by: str = Field(min_length=1)


class EvidenceResponse(BaseModel):
    id: str
    assessment_id: str
    evidence_type: str
    source: str
    storage_reference: str
    sha256: str
    provenance: str
    collected_by: str
    integrity_verified: bool

    model_config = {"from_attributes": True}


class EvidenceVerifyRequest(BaseModel):
    observed_sha256: str = Field(
        pattern=r"^[a-fA-F0-9]{64}$"
    )
    verified_by: str = Field(min_length=1)
    
    
# ---------------------------------------------------------------------------
# Compliance & Controls
# ---------------------------------------------------------------------------

class ControlCreateRequest(BaseModel):
    control_key: str = Field(min_length=2)
    name: str = Field(min_length=3)
    framework: str = Field(min_length=2)
    framework_reference: str | None = None
    owner: str = Field(min_length=1)
    mandatory: bool = True


class ControlResponse(BaseModel):
    id: str
    control_key: str
    name: str
    framework: str
    framework_reference: str | None
    owner: str
    mandatory: bool
    status: str

    model_config = {"from_attributes": True}


class ControlEvaluateRequest(BaseModel):
    status: str = Field(pattern=r"^(PASS|FAIL|EXCEPTION)$")
    evaluator: str = Field(min_length=1)    
    
# ---------------------------------------------------------------------------
# Exception & Risk Acceptance
# ---------------------------------------------------------------------------

class ExceptionCreateRequest(BaseModel):
    reason: str = Field(min_length=3)
    risk: str = Field(min_length=3)
    scope: str = Field(min_length=3)
    affected_control_id: str = Field(min_length=1)
    compensating_control: str = Field(min_length=3)
    risk_owner: str = Field(min_length=1)
    approver: str = Field(min_length=1)
    start_date: str = Field(min_length=10)
    expiry_date: str = Field(min_length=10)


class ExceptionResponse(BaseModel):
    id: str
    reason: str
    risk: str
    scope: str
    affected_control_id: str
    compensating_control: str
    risk_owner: str
    approver: str
    start_date: str
    expiry_date: str
    status: str
    version: int

    model_config = {"from_attributes": True}


class ExceptionTransitionRequest(BaseModel):
    target_status: str = Field(min_length=1)
    actor: str = Field(min_length=1)


# ---------------------------------------------------------------------------
# Trust
# ---------------------------------------------------------------------------

class TrustCreateRequest(BaseModel):
    subject_type: str = Field(min_length=1)
    subject_id: str = Field(min_length=1)
    reason: str | None = None
    reverify_by: str | None = None


class TrustResponse(BaseModel):
    id: str
    subject_type: str
    subject_id: str
    status: str
    reason: str | None
    last_verified_at: str | None
    reverify_by: str | None

    model_config = {"from_attributes": True}


class TrustTransitionRequest(BaseModel):
    target_status: str = Field(min_length=1)
    actor: str = Field(min_length=1)
    reason: str | None = None

# ---------------------------------------------------------------------------
# Regression
# ---------------------------------------------------------------------------

class RegressionCaseCreateRequest(BaseModel):
    name: str = Field(min_length=3)
    source_finding_id: str | None = None
    test_reference: str = Field(min_length=1)
    owner: str = Field(min_length=1)


class RegressionCaseResponse(BaseModel):
    id: str
    name: str
    source_finding_id: str | None
    test_reference: str
    owner: str
    active: bool
    last_result: str

    model_config = {"from_attributes": True}


class RegressionResultRequest(BaseModel):
    result: TestResult
    
# ---------------------------------------------------------------------------
# Scorecard
# ---------------------------------------------------------------------------

class ScorecardCreateRequest(BaseModel):
    assessment_id: str = Field(min_length=1)


class ScorecardResponse(BaseModel):
    id: str
    assessment_id: str
    quality_score: float
    risk_score: float
    compliance_score: float
    trust_score: float
    evidence_health_score: float
    overall_score: float

    model_config = {"from_attributes": True}
    
    
    
# ---------------------------------------------------------------------------
# Certification & Release Gate
# ---------------------------------------------------------------------------

class CertificationCreateRequest(BaseModel):
    assessment_id: str = Field(min_length=1)
    requested_by: str = Field(min_length=1)


class CertificationDecisionRequest(BaseModel):
    decision: str = Field(
        pattern=r"^(APPROVED|CONDITIONAL|REJECTED)$"
    )
    decided_by: str = Field(min_length=1)
    reason: str = Field(min_length=3)


class CertificationResponse(BaseModel):
    id: str
    assessment_id: str
    status: str
    decision_reason: str | None
    approved_by: str | None
    expires_at: str | None

    model_config = {"from_attributes": True}
    
    
    
    
    
    
    
    
    
    
    
    
    





