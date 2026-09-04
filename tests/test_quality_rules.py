from modules.quality_models import EngineeringArtifact
from modules.quality_rules import check_readme, QualityRuleEngine, create_documentation_rule


artifact = EngineeringArtifact(
    id="readme-001",
    name="README.md",
    artifact_type="documentation",
    source="test",
)


# Test 1: Both required sections present
readme_complete = """# Project

## Purpose
This project provides a quality platform.

## Installation
Install the required dependencies.
"""

findings, evidence, remediations = check_readme(
    readme_complete,
    artifact,
    "README-001",
)

assert len(findings) == 0
assert len(evidence) == 0
assert len(remediations) == 0


# Test 2: Purpose missing
readme_missing_purpose = """# Project

## Installation
Install the required dependencies.
"""

findings, evidence, remediations = check_readme(
    readme_missing_purpose,
    artifact,
    "README-001",
)

assert len(findings) == 1
assert findings[0].title == "README Purpose section missing"


# Test 3: Both sections missing
readme_missing_both = """# Project

## Overview
Project information.
"""

findings, evidence, remediations = check_readme(
    readme_missing_both,
    artifact,
    "README-001",
)

assert len(findings) == 2

titles = {finding.title for finding in findings}

assert "README Purpose section missing" in titles
assert "README Setup section missing" in titles


# Test 4: Setup alternative and case-insensitivity
readme_variants = """# Project

## purpose
Project purpose.

## Setup
How to install and run.
"""

findings, evidence, remediations = check_readme(
    readme_variants,
    artifact,
    "README-001",
)

assert len(findings) == 0


# Test 5: H1 should NOT count as required H2
readme_wrong_heading_level = """# Purpose

## Installation
Install the project.
"""

findings, evidence, remediations = check_readme(
    readme_wrong_heading_level,
    artifact,
    "README-001",
)

assert len(findings) == 1
assert findings[0].title == "README Purpose section missing"


print("Quality rules tests passed successfully")

from modules.quality_rules import QualityRuleEngine


# Test 6: Generic QualityRuleEngine
engine = QualityRuleEngine()
engine.register_rule(check_readme)

quality_checks, findings, evidence, remediations = engine.run(
    artifact,
    readme_missing_both,
)
assert len(quality_checks) == 1
assert quality_checks[0].status == "FAILED"
assert quality_checks[0].message == "2 finding(s) detected"

assert len(findings) == 2
assert len(evidence) == 2
assert len(remediations) == 2

print("Quality rule engine test passed successfully")
gate = engine.evaluate_gate(quality_checks)

assert gate.status == "FAILED"
assert len(gate.required_check_ids) == 1

print("Quality gate test passed successfully")
assert all(finding.status == "OPEN" for finding in findings)
assert all(remediation.status == "OPEN" for remediation in remediations)

print("Finding lifecycle test passed successfully")
assert all(evidence.artifact_id == artifact.id for evidence in evidence)
assert all(
    remediation.finding_id in [finding.id for finding in findings]
    for remediation in remediations
)

print("Evidence and remediation test passed successfully")
standard, governance_rule = create_documentation_rule()

assert standard.id == "DOC-STD-001"
assert governance_rule.standard_id == standard.id
assert governance_rule.active is True

print("Documentation standard and governance rule test passed successfully")
def check_dummy_rule(content, artifact, rule_id):
    return [], [], []


engine = QualityRuleEngine()
engine.register_rule(check_readme)
engine.register_rule(check_dummy_rule)

quality_checks, findings, evidence, remediations = engine.run(
    artifact,
    readme_complete,
)

assert len(quality_checks) == 2
assert quality_checks[0].status == "PASSED"
assert quality_checks[1].status == "PASSED"

print("Multiple rules test passed successfully")
code_artifact = EngineeringArtifact(
    id="code-001",
    name="app.py",
    artifact_type="code",
    source="test",
)

code_checks, code_findings, code_evidence, code_remediations = engine.run(
    code_artifact,
    "some python code",
)

assert len(code_checks) == 0
assert len(code_findings) == 0
assert len(code_evidence) == 0
assert len(code_remediations) == 0

print("Artifact type filtering test passed successfully")

# End-to-end quality flow test

e2e_artifact = EngineeringArtifact(
    id="e2e-readme-001",
    name="README.md",
    artifact_type="documentation",
    source="test",
)

e2e_engine = QualityRuleEngine()
e2e_engine.register_rule(check_readme, "documentation")

e2e_content = """
# Project README

## Purpose
This project manages organizational quality.

## Setup
Install the required dependencies and run the application.
"""

quality_checks, findings, evidence, remediations = e2e_engine.run(
    e2e_artifact,
    e2e_content,
)

quality_gate = e2e_engine.evaluate_gate(quality_checks)

assert len(quality_checks) == 1
assert quality_checks[0].status == "PASSED"

assert len(findings) == 0
assert len(evidence) == 0
assert len(remediations) == 0

assert quality_gate.status == "PASSED"
assert quality_gate.required_check_ids == [
    quality_checks[0].id
]

print("End-to-end quality flow test passed successfully")
# End-to-end failed quality flow test

failed_artifact = EngineeringArtifact(
    id="e2e-readme-failed-001",
    name="README.md",
    artifact_type="documentation",
    source="test",
)

failed_engine = QualityRuleEngine()
failed_engine.register_rule(check_readme, "documentation")

failed_content = """
# Project README

This README has no required sections.
"""

quality_checks, findings, evidence, remediations = failed_engine.run(
    failed_artifact,
    failed_content,
)

quality_gate = failed_engine.evaluate_gate(quality_checks)

assert len(quality_checks) == 1
assert quality_checks[0].status == "FAILED"

assert len(findings) == 2
assert len(evidence) == 2
assert len(remediations) == 2

assert quality_gate.status == "FAILED"

print("End-to-end failed quality flow test passed successfully")