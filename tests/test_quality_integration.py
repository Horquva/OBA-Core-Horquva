from modules.quality_models import (
    ComplianceRequirement,
    EngineeringArtifact,
    Finding,
    Severity,
)

from modules.quality_rules import (
    QualityRuleEngine,
    check_readme,
)

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
# ---------------------------------------------------------
# 7. Automated validation workflow
# ---------------------------------------------------------

workflow_artifact = EngineeringArtifact(
    id="workflow-readme-001",
    name="README.md",
    artifact_type="documentation",
    source="README.md",
)

workflow_requirements = [
    ComplianceRequirement(
        id="check_readme",
        name="README Required Sections",
        description="README must contain required sections.",
        mandatory=True,
    )
]

engine.register_rule(
    check_readme,
    artifact_type="documentation",
)

workflow_result = engine.validate_artifact_workflow(
    workflow_artifact,
    "# Project\n\n## Purpose\n\nProject purpose.",
    workflow_requirements,
    actor="masooma",
)

assert "quality_checks" in workflow_result
assert "findings" in workflow_result
assert "compliance_gaps" in workflow_result
assert "quality_gate" in workflow_result
assert "events" in workflow_result

assert workflow_result["quality_gate"].status == "FAILED"

event_actions = [
    event.action
    for event in workflow_result["events"]
]

assert "VALIDATION_STARTED" in event_actions
assert "FINDING_GENERATED" in event_actions
assert "COMPLIANCE_ISSUE_DETECTED" in event_actions
assert "QUALITY_GATE_FAILED" in event_actions

print("Automated validation workflow test passed successfully")


# ---------------------------------------------------------
# 8. Revalidation workflow
# ---------------------------------------------------------

revalidation_finding = Finding(
    id="finding-revalidation-001",
    artifact_id="workflow-readme-001",
    title="Documentation issue",
    description="Issue was remediated.",
    severity=Severity.MEDIUM,
    rule_id="DOC-RULE-001",
    status="REMEDIATED",
)

revalidation_event = engine.request_revalidation(
    revalidation_finding,
    "masooma",
)

assert revalidation_finding.status == "IN_REVIEW"
assert revalidation_event.action == "REVALIDATION_REQUESTED"
assert revalidation_event.actor == "masooma"

print("Revalidation workflow test passed successfully")


# ---------------------------------------------------------
# 9. Successful validation workflow
# ---------------------------------------------------------

passing_artifact = EngineeringArtifact(
    id="workflow-readme-002",
    name="README.md",
    artifact_type="documentation",
    source="README.md",
)

passing_result = engine.validate_artifact_workflow(
    passing_artifact,
    (
        "# Project\n\n"
        "## Purpose\n\n"
        "Project purpose.\n\n"
        "## Setup\n\n"
        "Installation instructions."
    ),
    workflow_requirements,
    actor="masooma",
)

assert passing_result["quality_gate"].status == "PASSED"

passing_event_actions = [
    event.action
    for event in passing_result["events"]
]

assert "VALIDATION_STARTED" in passing_event_actions
assert "QUALITY_GATE_PASSED" in passing_event_actions

print("Successful validation workflow test passed successfully")