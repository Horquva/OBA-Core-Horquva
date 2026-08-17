from modules.quality_models import EngineeringArtifact
from modules.quality_rules import check_readme


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

findings, evidence, remediations = engine.run(
    artifact,
    readme_missing_both,
)

assert len(findings) == 2
assert len(evidence) == 2
assert len(remediations) == 2

print("Quality rule engine test passed successfully")