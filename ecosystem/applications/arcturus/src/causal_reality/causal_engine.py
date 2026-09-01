"""
Day 5 first slice. Classification: 🔵 FOUNDATION-FUTURE (per the 7-Part
roadmap scheme). Surfaces CORRELATIONS between risk_factors and validated
metrics — makes no causal claims. Labeling naive keyword overlap as
"causal" before real methodology exists would itself be fabrication.
"""

from __future__ import annotations
from typing import Any

from ecosystem.applications.arcturus.contracts.evaluation.intelligence_models import StructuredAssessment


class CausalObservation(dict):
    """{"risk_factor": str, "related_metric": str, "metric_value": Any}"""


class CausalEngine:
    def correlate_risk_factors_with_metrics(
        self, assessment: StructuredAssessment, validated_metrics: dict[str, Any],
    ) -> list[CausalObservation]:
        observations: list[CausalObservation] = []
        for risk_factor in assessment.risk_factors:
            lowered = risk_factor.lower()
            for key, value in validated_metrics.items():
                if key.lower().replace("_", " ") in lowered:
                    observations.append(CausalObservation(risk_factor=risk_factor, related_metric=key, metric_value=value))
        return observations


__all__ = ["CausalEngine", "CausalObservation"]