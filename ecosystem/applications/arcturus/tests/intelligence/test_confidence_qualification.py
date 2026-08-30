from uuid import uuid4
import pytest
from ecosystem.applications.arcturus.api.services.intelligence_service import IntelligenceService
from ecosystem.applications.arcturus.contracts.shared.base_models import ArcturusValidationError
from .conftest import FakeSettings, FakeGeminiModel, seed_run


def test_confidence_score_passed_through_from_gemini(db_path):
    run_id = str(uuid4())
    seed_run(db_path, run_id, artifacts=[("ART-001", {})])
    model = FakeGeminiModel(response_payload={"assessment_summary": "x", "confidence_score": 0.83,
                             "risk_factors": [], "recommendations": [], "evidence_citations": ["ART-001"]})
    assessment = IntelligenceService(settings=FakeSettings(db_path), model=model).generate_assessment(run_id)
    assert assessment.confidence_score == 0.83


def test_missing_confidence_score_defaults_to_zero(db_path):
    run_id = str(uuid4())
    seed_run(db_path, run_id, artifacts=[("ART-001", {})])
    model = FakeGeminiModel(response_payload={"assessment_summary": "x",
                             "risk_factors": [], "recommendations": [], "evidence_citations": ["ART-001"]})
    assessment = IntelligenceService(settings=FakeSettings(db_path), model=model).generate_assessment(run_id)
    assert assessment.confidence_score == 0.0


def test_confidence_above_one_raises_instead_of_silently_clamping(db_path):
    run_id = str(uuid4())
    seed_run(db_path, run_id, artifacts=[("ART-001", {})])
    model = FakeGeminiModel(response_payload={"assessment_summary": "x", "confidence_score": 1.5,
                             "risk_factors": [], "recommendations": [], "evidence_citations": ["ART-001"]})
    with pytest.raises(ArcturusValidationError):
        IntelligenceService(settings=FakeSettings(db_path), model=model).generate_assessment(run_id)


def test_confidence_below_zero_raises_instead_of_silently_clamping(db_path):
    run_id = str(uuid4())
    seed_run(db_path, run_id, artifacts=[("ART-001", {})])
    model = FakeGeminiModel(response_payload={"assessment_summary": "x", "confidence_score": -0.2,
                             "risk_factors": [], "recommendations": [], "evidence_citations": ["ART-001"]})
    with pytest.raises(ArcturusValidationError):
        IntelligenceService(settings=FakeSettings(db_path), model=model).generate_assessment(run_id)