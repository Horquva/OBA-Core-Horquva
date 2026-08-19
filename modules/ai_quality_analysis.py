from __future__ import annotations

from dataclasses import dataclass, field

from modules.quality_models import Finding, Severity


@dataclass
class AIQualityRecommendation:
    finding_id: str
    classification: str
    risk_level: str
    recommendation: str
    confidence: float
    requires_human_review: bool = True
    reasons: list[str] = field(default_factory=list)


class AIQualityAnalyzer:
    def analyze_finding(
        self,
        finding: Finding,
    ) -> AIQualityRecommendation:
        if finding.severity == Severity.HIGH:
            risk_level = "HIGH"
        elif finding.severity == Severity.MEDIUM:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        classification = "QUALITY_ISSUE"

        recommendation = (
            "Review the finding and apply the documented remediation."
        )

        reasons = [
            f"Finding severity is {finding.severity.value}",
            "Final governance decision requires human review",
        ]

        return AIQualityRecommendation(
            finding_id=finding.id,
            classification=classification,
            risk_level=risk_level,
            recommendation=recommendation,
            confidence=0.80,
            requires_human_review=True,
            reasons=reasons,
        )
    def create_human_review(
        self,
        finding: Finding,
        reviewer: str,
        status: str = "PENDING",
    ):
        from modules.quality_models import Review

        return Review(
            id=f"{finding.id}-review",
            artifact_id=finding.artifact_id,
            reviewer=reviewer,
            status=status,
        )
    def modify_recommendation(
        self,
        finding: Finding,
        reviewer: str,
        modified_recommendation: str,
    ):
        from modules.quality_models import Review

        return Review(
            id=f"{finding.id}-review",
            artifact_id=finding.artifact_id,
            reviewer=reviewer,
            status="MODIFIED",
        )
    def create_review_evidence(
        self,
        finding: Finding,
        review,
    ):
        from modules.quality_models import Evidence

        return Evidence(
            id=f"{review.id}-evidence",
            artifact_id=finding.artifact_id,
            evidence_type="HUMAN_REVIEW_DECISION",
            source="AI_QUALITY_ANALYSIS",
            description=(
                f"Human reviewer '{review.reviewer}' "
                f"recorded decision '{review.status}' "
                f"for finding '{finding.id}'."
            ),
        )