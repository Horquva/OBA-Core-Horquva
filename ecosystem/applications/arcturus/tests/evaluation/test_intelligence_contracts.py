from datetime import datetime, timezone
from uuid import UUID

import pytest
from pydantic import ValidationError

from ecosystem.applications.arcturus.contracts.shared.base_models import (
    SimulationContext,
)
from ecosystem.applications.arcturus.contracts.evaluation.intelligence_models import (
    GEMINI_SYSTEM_PROMPT,
    StructuredAssessment,
)


FIXED_RUN_ID = UUID("00000000-0000-0000-0000-000000000001")
FIXED_TRACE_ID = UUID("00000000-0000-0000-0000-000000000002")
FIXED_CREATED_AT = datetime(2026, 8, 22, 12, 0, 0, tzinfo=timezone.utc)


def build_context() -> SimulationContext:
    return SimulationContext(
        run_id=FIXED_RUN_ID,
        trace_id=FIXED_TRACE_ID,
        experiment_id="EXP-001",
        global_seed=42,
        created_at=FIXED_CREATED_AT,
    )


def build_assessment(**overrides) -> StructuredAssessment:
    defaults = dict(
        context=build_context(),
        assessment_summary="Workload pressure detected in Engineering.",
        confidence_score=0.82,
        risk_factors=["sustained overtime in Engineering"],
        recommendations=["increase headcount in Engineering"],
        evidence_citations=["ART-0001", "ART-0002"],
    )
    defaults.update(overrides)
    return StructuredAssessment(**defaults)


def test_valid_assessment_is_accepted() -> None:
    assessment = build_assessment()

    assert assessment.confidence_score == 0.82
    assert assessment.evidence_citations == ["ART-0001", "ART-0002"]


def test_empty_evidence_citations_is_rejected() -> None:
    with pytest.raises(ValidationError):
        build_assessment(evidence_citations=[])


def test_confidence_score_above_one_is_rejected() -> None:
    with pytest.raises(ValidationError):
        build_assessment(confidence_score=1.5)


def test_confidence_score_below_zero_is_rejected() -> None:
    with pytest.raises(ValidationError):
        build_assessment(confidence_score=-0.1)


def test_empty_assessment_summary_is_rejected() -> None:
    with pytest.raises(ValidationError):
        build_assessment(assessment_summary="")


def test_unknown_field_is_rejected() -> None:
    with pytest.raises(ValidationError):
        build_assessment(unexpected_field="not-allowed")


def test_gemini_prompt_enforces_citation_and_no_hallucination_rules() -> None:
    assert "cite specific artifact_ids" in GEMINI_SYSTEM_PROMPT
    assert "Do not hallucinate data" in GEMINI_SYSTEM_PROMPT
    assert "VALIDATED" in GEMINI_SYSTEM_PROMPT