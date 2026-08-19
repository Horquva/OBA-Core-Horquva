from modules.quality_models import EngineeringArtifact, Finding, Severity
from modules.ai_quality_analysis import AIQualityAnalyzer


artifact = EngineeringArtifact(
    id="readme-001",
    name="README.md",
    artifact_type="documentation",
    source="test",
)

finding = Finding(
    id="readme-001-purpose-missing",
    artifact_id=artifact.id,
    title="README Purpose section missing",
    description="The README does not contain the required Purpose section.",
    severity=Severity.MEDIUM,
    rule_id="README-001",
)

analyzer = AIQualityAnalyzer()
recommendation = analyzer.analyze_finding(finding)

assert recommendation.finding_id == finding.id
assert recommendation.classification == "QUALITY_ISSUE"
assert recommendation.risk_level == "MEDIUM"
assert recommendation.confidence == 0.80
assert recommendation.requires_human_review is True
assert recommendation.recommendation
assert recommendation.reasons
review = analyzer.create_human_review(
    finding,
    reviewer="quality-reviewer",
    status="PENDING",
)

assert review.id == f"{finding.id}-review"
assert review.artifact_id == finding.artifact_id
assert review.reviewer == "quality-reviewer"
assert review.status == "PENDING"

accepted_review = analyzer.create_human_review(
    finding,
    reviewer="quality-reviewer",
    status="ACCEPTED",
)

assert accepted_review.status == "ACCEPTED"

rejected_review = analyzer.create_human_review(
    finding,
    reviewer="quality-reviewer",
    status="REJECTED",
)

assert rejected_review.status == "REJECTED"
modified_review = analyzer.modify_recommendation(
    finding,
    reviewer="quality-reviewer",
    modified_recommendation="Update the README Purpose section and request another review.",
)

assert modified_review.id == f"{finding.id}-review"
assert modified_review.artifact_id == finding.artifact_id
assert modified_review.reviewer == "quality-reviewer"
assert modified_review.status == "MODIFIED"

print("Human modified recommendation test passed successfully")
review_evidence = analyzer.create_review_evidence(
    finding,
    modified_review,
)

assert review_evidence.id == f"{modified_review.id}-evidence"
assert review_evidence.artifact_id == finding.artifact_id
assert review_evidence.evidence_type == "HUMAN_REVIEW_DECISION"
assert review_evidence.source == "AI_QUALITY_ANALYSIS"
assert "MODIFIED" in review_evidence.description
assert "quality-reviewer" in review_evidence.description

print("Human review evidence test passed successfully")

print("Human review lifecycle test passed successfully")

print("AI quality analysis test passed successfully")