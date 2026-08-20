from __future__ import annotations

import re

from modules.quality_models import (
    QualityStandard,
    GovernanceRule,
    QualityGate,
    EngineeringArtifact,
    QualityCheck,
    Severity,
    Finding,
    Evidence,
    Remediation,
)
def _has_h2_section(content: str, variants: list[str]) -> bool:
    headings = re.findall(
        r"^##\s+(.+?)\s*$",
        content,
        re.MULTILINE,
    )

    normalized_headings = {
        heading.strip().lower()
        for heading in headings
    }

    return any(
        variant.lower() in normalized_headings
        for variant in variants
    )
def check_readme(
    readme_content: str,
    artifact: EngineeringArtifact,
    rule_id: str,
) -> tuple[list[Finding], list[Evidence], list[Remediation]]:
    findings = []
    evidence = []
    remediations = []

    checks = [
        ("Purpose", ["Purpose"], "Add a ## Purpose section to the README."),
        (
            "Setup",
            ["Installation", "Setup"],
            "Add a ## Installation or ## Setup section to the README.",
        ),
    ]

    for section_name, variants, remediation_text in checks:
        if not _has_h2_section(readme_content, variants):
            finding_id = f"{artifact.id}-{section_name.lower()}-missing"

            findings.append(
                Finding(
                    id=finding_id,
                    artifact_id=artifact.id,
                    title=f"README {section_name} section missing",
                    description=(
                        f"The README does not contain the required H2 "
                        f"{section_name} section."
                    ),
                    severity=Severity.MEDIUM,
                    rule_id=rule_id,
                )
            )

            evidence.append(
                Evidence(
                    id=f"{finding_id}-evidence",
                    artifact_id=artifact.id,
                    evidence_type="README_HEADING_CHECK",
                    source=artifact.source,
                    description=(
                        f"Required H2 section '{section_name}' "
                        "was not found in the README."
                    ),
                )
            )

            remediations.append(
                Remediation(
                    id=f"{finding_id}-remediation",
                    finding_id=finding_id,
                    description=remediation_text,
                )
            )

    return findings, evidence, remediations
def create_documentation_rule():
    standard = QualityStandard(
        id="DOC-STD-001",
        name="Documentation Quality Standard",
        description="Required README sections must be present.",
        version="1.0",
    )

    rule = GovernanceRule(
        id="DOC-RULE-001",
        name="README Required Sections",
        description="README must contain Purpose and Installation or Setup sections.",
        standard_id=standard.id,
        severity=Severity.MEDIUM,
    )

    return standard, rule
class QualityRuleEngine:

    def __init__(self):
        self.rules = []

    def register_rule(self, rule, artifact_type="documentation"):
        self.rules.append((artifact_type, rule))

    def run(self, artifact, content):
        quality_checks = []
        all_findings = []
        all_evidence = []
        all_remediations = []

        for rule_type, rule in self.rules:
            if rule_type != artifact.artifact_type:
                continue

            findings, evidence, remediations = rule(
                content,
                artifact,
                rule.__name__,
            )

            status = "FAILED" if findings else "PASSED"

            message = (
                f"{len(findings)} finding(s) detected"
                if findings
                else "Rule passed"
            )

            quality_check = QualityCheck(
                id=f"{artifact.id}-{rule.__name__}",
                artifact_id=artifact.id,
                rule_id=rule.__name__,
                status=status,
                message=message,
            )

            quality_checks.append(quality_check)
            all_findings.extend(findings)
            all_evidence.extend(evidence)
            all_remediations.extend(remediations)

        return (
            quality_checks,
            all_findings,
            all_evidence,
            all_remediations,
        )

    def evaluate_compliance(
        self,
        findings,
        requirements,
    ):
        compliance_gaps = []

        for requirement in requirements:
            matching_findings = [
                finding
                for finding in findings
                if finding.rule_id == requirement.id
                and finding.status == "OPEN"
            ]

            if requirement.mandatory and matching_findings:
                compliance_gaps.append(
                    {
                        "requirement_id": requirement.id,
                        "requirement_name": requirement.name,
                        "status": "GAP",
                        "finding_ids": [
                            finding.id
                            for finding in matching_findings
                        ],
                    }
                )
            else:
                compliance_gaps.append(
                    {
                        "requirement_id": requirement.id,
                        "requirement_name": requirement.name,
                        "status": "COMPLIANT",
                        "finding_ids": [],
                    }
                )

        return compliance_gaps

    def create_governance_event(
        self,
        action,
        actor,
        artifact_id=None,
        details="",
    ):
        from datetime import datetime
        from modules.quality_models import AuditRecord

        return AuditRecord(
            id=f"event-{action.lower().replace(' ', '-')}",
            action=action,
            actor=actor,
            timestamp=datetime.utcnow().isoformat(),
            artifact_id=artifact_id,
            details=details,
        )

    def update_finding_status(
        self,
        finding,
        status,
        actor,
    ):
        valid_statuses = {
            "OPEN",
            "IN_REVIEW",
            "REMEDIATED",
            "CLOSED",
            "REJECTED",
        }

        if status not in valid_statuses:
            raise ValueError(
                f"Invalid finding status: {status}"
            )

        finding.status = status

        return self.create_governance_event(
            action=f"FINDING_{status}",
            actor=actor,
            artifact_id=finding.artifact_id,
            details=(
                f"Finding '{finding.id}' status changed to "
                f"'{status}'."
            ),
        )

    def create_exception(
        self,
        artifact_id,
        reason,
        requested_by,
    ):
        from modules.quality_models import Exception

        if not reason.strip():
            raise ValueError(
                "Exception reason cannot be empty."
            )

        if not requested_by.strip():
            raise ValueError(
                "Exception requester cannot be empty."
            )

        return Exception(
            id=f"exception-{artifact_id}",
            artifact_id=artifact_id,
            reason=reason,
            requested_by=requested_by,
            status="PENDING",
        )

    def approve_exception(
        self,
        exception,
        approver,
    ):
        if exception.status != "PENDING":
            raise ValueError(
                "Only pending exceptions can be approved."
            )

        if not approver.strip():
            raise ValueError(
                "Approver cannot be empty."
            )

        exception.status = "APPROVED"
        exception.approved_by = approver

        return self.create_governance_event(
            action="EXCEPTION_APPROVED",
            actor=approver,
            artifact_id=exception.artifact_id,
            details=(
                f"Exception '{exception.id}' approved."
            ),
        )

    def create_approval(
        self,
        review_id,
        approver,
        status="APPROVED",
        comments="",
    ):
        from modules.quality_models import Approval

        if not approver.strip():
            raise ValueError(
                "Approver cannot be empty."
            )

        return Approval(
            id=f"{review_id}-approval",
            review_id=review_id,
            approver=approver,
            status=status,
            comments=comments,
        )

    def request_revalidation(
        self,
        finding,
        actor,
    ):
        if finding.status != "REMEDIATED":
            raise ValueError(
                "Only remediated findings can be revalidated."
            )

        finding.status = "IN_REVIEW"

        return self.create_governance_event(
            action="REVALIDATION_REQUESTED",
            actor=actor,
            artifact_id=finding.artifact_id,
            details=(
                f"Revalidation requested for finding "
                f"'{finding.id}'."
            ),
        )

    def validate_artifact_workflow(
        self,
        artifact,
        content,
        requirements=None,
        actor="system",
    ):
        requirements = requirements or []

        events = []

        events.append(
            self.create_governance_event(
                action="VALIDATION_STARTED",
                actor=actor,
                artifact_id=artifact.id,
                details="Automated quality validation started.",
            )
        )

        (
            quality_checks,
            findings,
            evidence,
            remediations,
        ) = self.run(
            artifact,
            content,
        )

        for finding in findings:
            events.append(
                self.create_governance_event(
                    action="FINDING_GENERATED",
                    actor=actor,
                    artifact_id=artifact.id,
                    details=(
                        f"Finding '{finding.id}' generated."
                    ),
                )
            )

        compliance_gaps = self.evaluate_compliance(
            findings,
            requirements,
        )

        for gap in compliance_gaps:
            if gap["status"] == "GAP":
                events.append(
                    self.create_governance_event(
                        action="COMPLIANCE_ISSUE_DETECTED",
                        actor=actor,
                        artifact_id=artifact.id,
                        details=(
                            f"Compliance gap detected for "
                            f"'{gap['requirement_id']}'."
                        ),
                    )
                )

        quality_gate = self.evaluate_gate(
            quality_checks
        )

        gate_action = (
            "QUALITY_GATE_PASSED"
            if quality_gate.status == "PASSED"
            else "QUALITY_GATE_FAILED"
        )

        events.append(
            self.create_governance_event(
                action=gate_action,
                actor=actor,
                artifact_id=artifact.id,
                details=(
                    f"Quality gate status: "
                    f"{quality_gate.status}."
                ),
            )
        )

        return {
            "quality_checks": quality_checks,
            "findings": findings,
            "evidence": evidence,
            "remediations": remediations,
            "compliance_gaps": compliance_gaps,
            "quality_gate": quality_gate,
            "events": events,
        }

    def evaluate_gate(
        self,
        quality_checks,
        gate_id="default-gate",
    ):
        status = (
            "PASSED"
            if all(
                check.status == "PASSED"
                for check in quality_checks
            )
            else "FAILED"
        )

        return QualityGate(
            id=gate_id,
            name="Quality Gate",
            status=status,
            required_check_ids=[
                check.id
                for check in quality_checks
            ],
        )