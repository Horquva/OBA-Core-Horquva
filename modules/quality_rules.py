from __future__ import annotations

import re

from modules.quality_models import (
    EngineeringArtifact,
    Evidence,
    Finding,
    Remediation,
    Severity,
)


REQUIRED_SECTIONS = {
    "Purpose": ["Purpose"],
    "Setup": ["Installation", "Setup"],
}


def _has_h2_section(content: str, variants: list[str]) -> bool:
    headings = re.findall(r"^##\s+(.+?)\s*$", content, re.MULTILINE)

    normalized_headings = {
        heading.strip().lower()
        for heading in headings
    }

    return any(variant.lower() in normalized_headings for variant in variants)


def check_readme(
    readme_content: str,
    artifact: EngineeringArtifact,
    rule_id: str,
) -> tuple[list[Finding], list[Evidence], list[Remediation]]:
    findings: list[Finding] = []
    evidence: list[Evidence] = []
    remediations: list[Remediation] = []

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