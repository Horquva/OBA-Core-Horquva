from modules.quality_models import (
    ComplianceRequirement,
    Finding,
    Severity,
)
from modules.quality_rules import QualityRuleEngine


engine = QualityRuleEngine()


# ---------------------------------------------------------
# 1. Compliance automation
# ---------------------------------------------------------

finding = Finding(
    id="finding-001",
    artifact_id="readme-001",
    title="Required section missing",
    description="Purpose section is missing.",
    severity=Severity.MEDIUM,
    rule_id="DOC-RULE-001",
)

requirement = ComplianceRequirement(
    id="DOC-RULE-001",
    name="README Required Sections",
    description="README must contain required sections.",
    mandatory=True,
)

gaps = engine.evaluate_compliance(
    [finding],
    [requirement],
)

assert len(gaps) == 1
assert gaps[0]["requirement_id"] == "DOC-RULE-001"
assert gaps[0]["status"] == "GAP"
assert gaps[0]["finding_ids"] == ["finding-001"]

print("Compliance automation integration test passed successfully")


# ---------------------------------------------------------
# 2. Governance event
# ---------------------------------------------------------

event = engine.create_governance_event(
    action="QUALITY_CHECK",
    actor="masooma",
    artifact_id="readme-001",
    details="Quality check completed.",
)

assert event.action == "QUALITY_CHECK"
assert event.actor == "masooma"
assert event.artifact_id == "readme-001"
assert event.details == "Quality check completed."
assert event.timestamp

print("Governance event integration test passed successfully")


# ---------------------------------------------------------
# 3. Finding lifecycle
# ---------------------------------------------------------

lifecycle_finding = Finding(
    id="finding-002",
    artifact_id="readme-001",
    title="Setup section missing",
    description="Setup section is missing.",
    severity=Severity.MEDIUM,
    rule_id="DOC-RULE-001",
)

lifecycle_event = engine.update_finding_status(
    lifecycle_finding,
    "IN_REVIEW",
    "masooma",
)

assert lifecycle_finding.status == "IN_REVIEW"
assert lifecycle_event.action == "FINDING_IN_REVIEW"
assert lifecycle_event.actor == "masooma"

print("Finding lifecycle integration test passed successfully")


# ---------------------------------------------------------
# 4. Exception handling
# ---------------------------------------------------------

exception = engine.create_exception(
    artifact_id="readme-001",
    reason="Temporary approved documentation exception.",
    requested_by="masooma",
)

assert exception.artifact_id == "readme-001"
assert exception.reason == (
    "Temporary approved documentation exception."
)
assert exception.requested_by == "masooma"
assert exception.status == "PENDING"

print("Exception handling integration test passed successfully")
# ---------------------------------------------------------
# 5. Approval workflow
# ---------------------------------------------------------

approval = engine.create_approval(
    review_id="finding-002-review",
    approver="governance-lead",
    status="APPROVED",
    comments="Review approved after verification.",
)

assert approval.review_id == "finding-002-review"
assert approval.approver == "governance-lead"
assert approval.status == "APPROVED"
assert approval.comments == "Review approved after verification."

print("Approval workflow integration test passed successfully")


# ---------------------------------------------------------
# 6. Exception approval
# ---------------------------------------------------------

exception_event = engine.approve_exception(
    exception,
    "governance-lead",
)

assert exception.status == "APPROVED"
assert exception.approved_by == "governance-lead"
assert exception_event.action == "EXCEPTION_APPROVED"
assert exception_event.actor == "governance-lead"

print("Exception approval integration test passed successfully")