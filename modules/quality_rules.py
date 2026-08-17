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

    def evaluate_gate(self, quality_checks, gate_id="default-gate"):
        status = (
            "PASSED"
            if all(check.status == "PASSED" for check in quality_checks)
            else "FAILED"
        )

        return QualityGate(
            id=gate_id,
            name="Quality Gate",
            status=status,
            required_check_ids=[
                check.id for check in quality_checks
            ],
        )