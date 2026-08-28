from uuid import uuid4
import pytest
from ecosystem.applications.arcturus.api.services.intelligence_service import IntelligenceService, IntelligenceUnavailable
from .conftest import FakeSettings, FakeGeminiModel, seed_run


def test_valid_response_produces_structured_assessment(db_path):
    run_id = str(uuid4())
    seed_run(db_path, run_id, artifacts=[("ART-001", {"title": "doc"})])
    model = FakeGeminiModel(response_payload={
        "assessment_summary": "Workload pressure detected.", "confidence_score": 0.75,
        "risk_factors": ["overtime"], "recommendations": ["hire more staff"],
        "evidence_citations": ["ART-001"],
    })
    assessment = IntelligenceService(settings=FakeSettings(db_path), model=model).generate_assessment(run_id=run_id)
    assert assessment is not None
    assert assessment.evidence_citations == ["ART-001"]
    assert assessment.confidence_score == 0.75


def test_gemini_failure_raises_unavailable_not_fake_result(db_path):
    run_id = str(uuid4())
    seed_run(db_path, run_id, artifacts=[("ART-001", {"title": "doc"})])
    service = IntelligenceService(settings=FakeSettings(db_path), model=FakeGeminiModel(raise_error=True))
    with pytest.raises(IntelligenceUnavailable):
        service.generate_assessment(run_id=run_id)