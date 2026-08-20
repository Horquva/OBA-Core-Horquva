from modules.quality_models import EngineeringArtifact, Finding, Severity
from modules.ai_quality_analysis import AIQualityAnalyzer
from modules.ai_quality_analysis import (
    AIQualityAnalyzer,
    AIEvaluationFramework,
)

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
evaluator = AIEvaluationFramework()

expected = [
    "QUALITY_ISSUE",
    "QUALITY_ISSUE",
    "OTHER",
    "QUALITY_ISSUE",
]

predicted = [
    "QUALITY_ISSUE",
    "QUALITY_ISSUE",
    "OTHER",
    "OTHER",
]

metrics = evaluator.evaluate_classification(
    expected,
    predicted,
)

assert len(metrics) == 4

metric_names = {metric.name for metric in metrics}

assert "AI Classification Accuracy" in metric_names
assert "AI Classification Precision" in metric_names
assert "AI Classification Recall" in metric_names
assert "AI Classification F1 Score" in metric_names

for metric in metrics:
    assert 0.0 <= metric.value <= 1.0
    assert metric.unit == "ratio"

print("AI evaluation framework test passed successfully")
try:
    evaluator.evaluate_classification(
        ["QUALITY_ISSUE"],
        [],
    )
    raise AssertionError("Expected ValueError for mismatched input lengths")
except ValueError:
    pass

try:
    evaluator.evaluate_classification(
        [],
        [],
    )
    raise AssertionError("Expected ValueError for empty evaluation data")
except ValueError:
    pass

print("AI evaluation edge case test passed successfully")
duplicate_findings = analyzer.detect_duplicate_findings(
    [finding, finding]
)

assert duplicate_findings == [
    (finding.id, finding.id)
]

print("Duplicate finding detection test passed successfully")
summary = analyzer.generate_quality_summary([finding])

assert summary["total_findings"] == 1
assert summary["high"] == 0
assert summary["medium"] == 1
assert summary["low"] == 0
assert summary["requires_attention"] is True

print("Quality summary test passed successfully")
from modules.quality_models import ComplianceRequirement

requirement = ComplianceRequirement(
    id="README-001",
    name="README Required Sections",
    description="README must contain required sections.",
    mandatory=True,
)

compliance_gaps = analyzer.identify_compliance_gaps(
    [finding],
    [requirement],
)

assert len(compliance_gaps) == 1
assert compliance_gaps[0]["requirement_id"] == "README-001"
assert compliance_gaps[0]["status"] == "POTENTIAL_GAP"
assert compliance_gaps[0]["requires_human_review"] is True
assert finding.id in compliance_gaps[0]["finding_ids"]

print("Compliance gap identification test passed successfully")
evaluation_framework = AIEvaluationFramework()

error_metrics = evaluation_framework.evaluate_error_rates(
    ["QUALITY_ISSUE", "COMPLIANT", "QUALITY_ISSUE", "COMPLIANT"],
    ["QUALITY_ISSUE", "QUALITY_ISSUE", "COMPLIANT", "COMPLIANT"],
)

assert len(error_metrics) == 2

false_positive_rate = next(
    metric for metric in error_metrics
    if metric.id == "AI-EVAL-FALSE-POSITIVE-RATE"
)

false_negative_rate = next(
    metric for metric in error_metrics
    if metric.id == "AI-EVAL-FALSE-NEGATIVE-RATE"
)

assert false_positive_rate.value == 0.25
assert false_negative_rate.value == 0.25

print("AI error rate evaluation test passed successfully")
evaluation_framework = AIEvaluationFramework()

consistency_metric = evaluation_framework.evaluate_consistency(
    [
        ["QUALITY_ISSUE", "COMPLIANT", "QUALITY_ISSUE"],
        ["QUALITY_ISSUE", "COMPLIANT", "QUALITY_ISSUE"],
        ["QUALITY_ISSUE", "QUALITY_ISSUE", "QUALITY_ISSUE"],
    ]
)

assert consistency_metric.id == "AI-EVAL-CONSISTENCY"
assert consistency_metric.value == 5 / 6
assert consistency_metric.unit == "ratio"

print("AI consistency evaluation test passed successfully")
explainability_recommendation = analyzer.analyze_finding(finding)

explainability_metric = evaluation_framework.evaluate_explainability(
    [explainability_recommendation]
)

assert explainability_metric.id == "AI-EVAL-EXPLAINABILITY"
assert explainability_metric.value == 1.0
assert explainability_metric.unit == "ratio"

print("AI explainability evaluation test passed successfully")
human_agreement_metric = evaluation_framework.evaluate_human_agreement(
    [
        "QUALITY_ISSUE",
        "COMPLIANT",
        "QUALITY_ISSUE",
        "QUALITY_ISSUE",
    ],
    [
        "QUALITY_ISSUE",
        "COMPLIANT",
        "QUALITY_ISSUE",
        "OTHER",
    ],
)

assert human_agreement_metric.id == "AI-EVAL-HUMAN-AGREEMENT"
assert human_agreement_metric.value == 0.75
assert human_agreement_metric.unit == "ratio"

print("AI human agreement evaluation test passed successfully")
regression_metric = evaluation_framework.evaluate_regression(
    [
        "QUALITY_ISSUE",
        "COMPLIANT",
        "QUALITY_ISSUE",
        "OTHER",
    ],
    [
        "QUALITY_ISSUE",
        "QUALITY_ISSUE",
        "QUALITY_ISSUE",
        "OTHER",
    ],
)

assert regression_metric.id == "AI-EVAL-REGRESSION"
assert regression_metric.value == 0.25
assert regression_metric.unit == "ratio"

print("AI regression evaluation test passed successfully")