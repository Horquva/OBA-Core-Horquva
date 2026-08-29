from ecosystem.applications.arcturus.contracts.shared.base_models import SimulationContext
from ecosystem.applications.arcturus.contracts.evaluation.intelligence_models import StructuredAssessment
from ecosystem.applications.arcturus.src.causal_reality.causal_engine import CausalEngine


def build_assessment(risk_factors: list[str]) -> StructuredAssessment:
    return StructuredAssessment(
        context=SimulationContext(experiment_id="EXP-001", global_seed=1),
        assessment_summary="test", confidence_score=0.5,
        risk_factors=risk_factors, recommendations=[], evidence_citations=["ART-001"],
    )


def test_correlates_matching_risk_factor_with_metric() -> None:
    obs = CausalEngine().correlate_risk_factors_with_metrics(
        assessment=build_assessment(["sustained workload pressure in Engineering"]),
        validated_metrics={"workload_pressure": 0.83},
    )
    assert len(obs) == 1
    assert obs[0]["related_metric"] == "workload_pressure"


def test_no_match_produces_no_observations() -> None:
    obs = CausalEngine().correlate_risk_factors_with_metrics(
        assessment=build_assessment(["unrelated risk"]), validated_metrics={"workload_pressure": 0.83},
    )
    assert obs == []


def test_empty_risk_factors_produces_no_observations() -> None:
    obs = CausalEngine().correlate_risk_factors_with_metrics(
        assessment=build_assessment([]), validated_metrics={"workload_pressure": 0.83},
    )
    assert obs == []