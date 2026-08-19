"""
Assessment & Decision Models
Roadmap Reference: PART-3 (Assessment Engine) and PART-4 (Decision Intelligence)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum

from app.models.validation_dimension import DimensionName


class ValidationState(str, Enum):
    """PART-4 Decision Model — exact states from the roadmap."""
    SUBMITTED = "SUBMITTED"
    INCOMPLETE = "INCOMPLETE"
    UNDER_REVIEW = "UNDER_REVIEW"
    REVISION_REQUIRED = "REVISION_REQUIRED"
    VALIDATION_READY = "VALIDATION_READY"
    VALIDATED = "VALIDATED"
    REJECTED = "REJECTED"


@dataclass
class DimensionFinding:
    """
    A single dimension's assessment result.
    Every field here exists so the outcome is explainable:
    Criterion -> Evidence -> Assessment -> Reasoning -> Result
    """
    dimension: DimensionName
    score: float                     # 0.0 - 1.0
    passed: bool
    reasoning: str                   # plain-language explanation of the score
    evidence_used: list[str] = field(default_factory=list)
    strengths: list[str] = field(default_factory=list)
    weaknesses: list[str] = field(default_factory=list)
    missing_information: list[str] = field(default_factory=list)


@dataclass
class ValidationResult:
    """
    Full explainable outcome for one capability assessment run.
    """
    capability_id: str
    assessed_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    findings: list[DimensionFinding] = field(default_factory=list)
    overall_score: float = 0.0
    state: ValidationState = ValidationState.SUBMITTED
    recommendation: str = ""
    risks: list[str] = field(default_factory=list)
    missing_information: list[str] = field(default_factory=list)
    reviewer_notes: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "capability_id": self.capability_id,
            "assessed_at": self.assessed_at.isoformat(),
            "overall_score": round(self.overall_score, 3),
            "state": self.state.value,
            "recommendation": self.recommendation,
            "risks": self.risks,
            "missing_information": self.missing_information,
            "reviewer_notes": self.reviewer_notes,
            "findings": [
                {
                    "dimension": f.dimension.value,
                    "score": round(f.score, 3),
                    "passed": f.passed,
                    "reasoning": f.reasoning,
                    "evidence_used": f.evidence_used,
                    "strengths": f.strengths,
                    "weaknesses": f.weaknesses,
                    "missing_information": f.missing_information,
                }
                for f in self.findings
            ],
        }
