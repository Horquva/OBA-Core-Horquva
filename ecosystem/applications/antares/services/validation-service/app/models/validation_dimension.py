"""
Validation Dimensions Model
Roadmap Reference: PART-2 — Validation Model

Each dimension defined here has: criteria, questions, evidence requirements,
scoring logic hook, reviewer notes, decision implications.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


class DimensionName(str, Enum):
    ORGANIZATIONAL_VALUE = "ORGANIZATIONAL_VALUE"
    ORGANIZATIONAL_IMPACT = "ORGANIZATIONAL_IMPACT"
    EVIDENCE_QUALITY = "EVIDENCE_QUALITY"
    EXPLAINABILITY = "EXPLAINABILITY"
    REUSABILITY = "REUSABILITY"
    ENTERPRISE_READINESS = "ENTERPRISE_READINESS"
    CONSTITUTIONAL_ALIGNMENT = "CONSTITUTIONAL_ALIGNMENT"
    OBA_COMPATIBILITY = "OBA_COMPATIBILITY"


@dataclass
class DimensionDefinition:
    """Static definition of what a dimension checks and how."""
    name: DimensionName
    criteria: list[str]
    questions: list[str]
    evidence_requirements: list[str]
    weight: float = 1.0          # relative weight in overall readiness
    min_passing_score: float = 0.6   # 0.0–1.0 scale


# The eight dimensions from PART-2, fully specified.
DIMENSION_REGISTRY: dict[DimensionName, DimensionDefinition] = {
    DimensionName.ORGANIZATIONAL_VALUE: DimensionDefinition(
        name=DimensionName.ORGANIZATIONAL_VALUE,
        criteria=[
            "Problem severity is clearly stated",
            "Value generated is specific and measurable where possible",
            "Strategic relevance to the target organization is explained",
        ],
        questions=[
            "What organizational problem does this capability solve?",
            "How severe is the problem if left unsolved?",
            "What measurable value does this capability generate?",
        ],
        evidence_requirements=["Problem statement", "Value justification"],
        weight=1.5,
    ),
    DimensionName.ORGANIZATIONAL_IMPACT: DimensionDefinition(
        name=DimensionName.ORGANIZATIONAL_IMPACT,
        criteria=[
            "Affected organizational functions are identified",
            "Impact on leadership/governance/workforce is described",
            "Expected improvement is plausible given the evidence",
        ],
        questions=[
            "Which organizational functions are affected?",
            "What is the expected improvement, and for whom?",
        ],
        evidence_requirements=["Impact analysis", "Affected function list"],
        weight=1.2,
    ),
    DimensionName.EVIDENCE_QUALITY: DimensionDefinition(
        name=DimensionName.EVIDENCE_QUALITY,
        criteria=[
            "Evidence sources are identified and traceable",
            "Evidence is relevant to the stated problem/value",
            "Evidence is sufficiently complete for a decision",
        ],
        questions=[
            "Where does each piece of evidence come from?",
            "Does the evidence directly support the claimed value?",
        ],
        evidence_requirements=["At least one traceable evidence reference"],
        weight=1.5,
    ),
    DimensionName.EXPLAINABILITY: DimensionDefinition(
        name=DimensionName.EXPLAINABILITY,
        criteria=[
            "The capability's mechanism can be explained in plain language",
            "Assumptions are stated explicitly",
        ],
        questions=["Can a non-specialist understand how this capability works?"],
        evidence_requirements=["Plain-language description"],
        weight=1.0,
    ),
    DimensionName.REUSABILITY: DimensionDefinition(
        name=DimensionName.REUSABILITY,
        criteria=[
            "Capability is not overly specific to one narrow case",
            "Dependencies are known and manageable",
        ],
        questions=["Could this capability apply beyond its original context?"],
        evidence_requirements=["Dependency list"],
        weight=0.8,
    ),
    DimensionName.ENTERPRISE_READINESS: DimensionDefinition(
        name=DimensionName.ENTERPRISE_READINESS,
        criteria=[
            "Known risks are documented",
            "Adoption barriers are identified",
        ],
        questions=["What would block enterprise adoption today?"],
        evidence_requirements=["Risk list"],
        weight=1.0,
    ),
    DimensionName.CONSTITUTIONAL_ALIGNMENT: DimensionDefinition(
        name=DimensionName.CONSTITUTIONAL_ALIGNMENT,
        criteria=[
            "No known conflict with locked Antares constitutional boundaries",
        ],
        questions=["Does this capability conflict with any constitutional rule?"],
        evidence_requirements=["Constitutional notes (may be 'no conflict found')"],
        weight=1.3,
        min_passing_score=0.8,
    ),
    DimensionName.OBA_COMPATIBILITY: DimensionDefinition(
        name=DimensionName.OBA_COMPATIBILITY,
        criteria=[
            "No known incompatibility with future OBA integration boundaries",
        ],
        questions=["Is anything about this capability known to be OBA-incompatible?"],
        evidence_requirements=["OBA compatibility notes"],
        weight=0.7,
    ),
}
