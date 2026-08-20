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
    def detect_duplicate_findings(
        self,
        findings: list[Finding],
    ) -> list[tuple[str, str]]:
        duplicates = []

        for index, finding in enumerate(findings):
            for other in findings[index + 1:]:
                same_artifact = (
                    finding.artifact_id == other.artifact_id
                )

                same_rule = (
                    finding.rule_id == other.rule_id
                )

                if same_artifact and same_rule:
                    duplicates.append(
                        (finding.id, other.id)
                    )

        return duplicates
    def identify_compliance_gaps(
        self,
        findings: list[Finding],
        requirements: list,
    ) -> list[dict]:
        gaps = []

        for requirement in requirements:
            if not requirement.mandatory:
                continue

            related_findings = [
                finding
                for finding in findings
                if finding.rule_id == requirement.id
            ]

            if related_findings:
                gaps.append(
                    {
                        "requirement_id": requirement.id,
                        "requirement_name": requirement.name,
                        "status": "POTENTIAL_GAP",
                        "finding_ids": [
                            finding.id
                            for finding in related_findings
                        ],
                        "requires_human_review": True,
                    }
                )

        return gaps
    def generate_quality_summary(
        self,
        findings: list[Finding],
    ) -> dict:
        severity_counts = {
            "HIGH": 0,
            "MEDIUM": 0,
            "LOW": 0,
        }

        for finding in findings:
            severity = finding.severity.value
            if severity in severity_counts:
                severity_counts[severity] += 1

        return {
            "total_findings": len(findings),
            "high": severity_counts["HIGH"],
            "medium": severity_counts["MEDIUM"],
            "low": severity_counts["LOW"],
            "requires_attention": (
                severity_counts["HIGH"] > 0
                or severity_counts["MEDIUM"] > 0
            ),
        }
class AIEvaluationFramework:
    def evaluate_classification(
        self,
        expected: list[str],
        predicted: list[str],
    ):
        from modules.quality_models import QualityMetric

        if len(expected) != len(predicted):
            raise ValueError(
                "Expected and predicted lists must have the same length."
            )

        if not expected:
            raise ValueError("Evaluation data cannot be empty.")

        true_positive = sum(
            1
            for actual, prediction in zip(expected, predicted)
            if actual == "QUALITY_ISSUE"
            and prediction == "QUALITY_ISSUE"
        )

        actual_positive = sum(
            1 for actual in expected if actual == "QUALITY_ISSUE"
        )

        predicted_positive = sum(
            1
            for prediction in predicted
            if prediction == "QUALITY_ISSUE"
        )

        correct = sum(
            1
            for actual, prediction in zip(expected, predicted)
            if actual == prediction
        )

        accuracy = correct / len(expected)

        precision = (
            true_positive / predicted_positive
            if predicted_positive
            else 0.0
        )

        recall = (
            true_positive / actual_positive
            if actual_positive
            else 0.0
        )

        f1 = (
            2 * precision * recall / (precision + recall)
            if precision + recall
            else 0.0
        )

        return [
            QualityMetric(
                id="AI-EVAL-ACCURACY",
                name="AI Classification Accuracy",
                value=accuracy,
                unit="ratio",
            ),
            QualityMetric(
                id="AI-EVAL-PRECISION",
                name="AI Classification Precision",
                value=precision,
                unit="ratio",
            ),
            QualityMetric(
                id="AI-EVAL-RECALL",
                name="AI Classification Recall",
                value=recall,
                unit="ratio",
            ),
            QualityMetric(
                id="AI-EVAL-F1",
                name="AI Classification F1 Score",
                value=f1,
                unit="ratio",
            ),
        ]

    def evaluate_error_rates(
        self,
        expected: list[str],
        predicted: list[str],
    ):
        from modules.quality_models import QualityMetric

        if len(expected) != len(predicted):
            raise ValueError(
                "Expected and predicted lists must have the same length."
            )

        if not expected:
            raise ValueError("Evaluation data cannot be empty.")

        false_positive = sum(
            1
            for actual, prediction in zip(expected, predicted)
            if actual != "QUALITY_ISSUE"
            and prediction == "QUALITY_ISSUE"
        )

        false_negative = sum(
            1
            for actual, prediction in zip(expected, predicted)
            if actual == "QUALITY_ISSUE"
            and prediction != "QUALITY_ISSUE"
        )

        total = len(expected)

        return [
            QualityMetric(
                id="AI-EVAL-FALSE-POSITIVE-RATE",
                name="AI False Positive Rate",
                value=false_positive / total,
                unit="ratio",
            ),
            QualityMetric(
                id="AI-EVAL-FALSE-NEGATIVE-RATE",
                name="AI False Negative Rate",
                value=false_negative / total,
                unit="ratio",
            ),
        ]
    def evaluate_consistency(
        self,
        predictions: list[list[str]],
    ):
        from modules.quality_models import QualityMetric

        if not predictions:
            raise ValueError("Consistency evaluation data cannot be empty.")

        if any(not run for run in predictions):
            raise ValueError("Each prediction run must contain data.")

        baseline = predictions[0]
        total = len(baseline)

        if any(len(run) != total for run in predictions):
            raise ValueError(
                "All prediction runs must have the same length."
            )

        comparisons = 0
        consistent = 0

        for run in predictions[1:]:
            for expected_prediction, actual_prediction in zip(
                baseline,
                run,
            ):
                comparisons += 1
                if expected_prediction == actual_prediction:
                    consistent += 1

        consistency = (
            consistent / comparisons
            if comparisons
            else 1.0
        )

        return QualityMetric(
            id="AI-EVAL-CONSISTENCY",
            name="AI Classification Consistency",
            value=consistency,
            unit="ratio",
        )
    def evaluate_explainability(
        self,
        recommendations: list[AIQualityRecommendation],
    ):
        from modules.quality_models import QualityMetric

        if not recommendations:
            raise ValueError(
                "Explainability evaluation data cannot be empty."
            )

        explainable = sum(
            1
            for recommendation in recommendations
            if recommendation.reasons
            and all(
                isinstance(reason, str) and reason.strip()
                for reason in recommendation.reasons
            )
        )

        explainability = explainable / len(recommendations)

        return QualityMetric(
            id="AI-EVAL-EXPLAINABILITY",
            name="AI Recommendation Explainability",
            value=explainability,
            unit="ratio",
        )
    def evaluate_human_agreement(
        self,
        ai_predictions: list[str],
        human_decisions: list[str],
    ):
        from modules.quality_models import QualityMetric

        if len(ai_predictions) != len(human_decisions):
            raise ValueError(
                "AI predictions and human decisions must have the same length."
            )

        if not ai_predictions:
            raise ValueError(
                "Human agreement evaluation data cannot be empty."
            )

        agreements = sum(
            1
            for ai_prediction, human_decision in zip(
                ai_predictions,
                human_decisions,
            )
            if ai_prediction == human_decision
        )

        agreement = agreements / len(ai_predictions)

        return QualityMetric(
            id="AI-EVAL-HUMAN-AGREEMENT",
            name="AI Human Agreement",
            value=agreement,
            unit="ratio",
        )
    def evaluate_regression(
        self,
        previous_predictions: list[str],
        current_predictions: list[str],
    ):
        from modules.quality_models import QualityMetric

        if len(previous_predictions) != len(current_predictions):
            raise ValueError(
                "Previous and current prediction lists must have the same length."
            )

        if not previous_predictions:
            raise ValueError(
                "Regression evaluation data cannot be empty."
            )

        changed = sum(
            1
            for previous, current in zip(
                previous_predictions,
                current_predictions,
            )
            if previous != current
        )

        regression_rate = changed / len(previous_predictions)

        return QualityMetric(
            id="AI-EVAL-REGRESSION",
            name="AI Classification Regression Rate",
            value=regression_rate,
            unit="ratio",
        )