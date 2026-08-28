from uuid import uuid4
from ecosystem.applications.arcturus.api.services.intelligence_service import IntelligenceService
from .conftest import FakeSettings, FakeGeminiModel, seed_run


def test_no_validation_row_produces_no_assessment(db_path):
    run_id = str(uuid4())
    seed_run(db_path, run_id, final_status=None, artifacts=[("ART-001", {})])
    assert IntelligenceService(settings=FakeSettings(db_path), model=FakeGeminiModel()).generate_assessment(run_id) is None


def test_rejected_validation_produces_no_assessment(db_path):
    run_id = str(uuid4())
    seed_run(db_path, run_id, final_status="REJECTED", artifacts=[("ART-001", {})])
    assert IntelligenceService(settings=FakeSettings(db_path), model=FakeGeminiModel()).generate_assessment(run_id) is None


def test_validated_but_no_evidence_produces_no_assessment(db_path):
    run_id = str(uuid4())
    seed_run(db_path, run_id, final_status="VALIDATED", artifacts=[])
    assert IntelligenceService(settings=FakeSettings(db_path), model=FakeGeminiModel()).generate_assessment(run_id) is None


def test_all_citations_unrecognized_produces_no_assessment(db_path):
    run_id = str(uuid4())
    seed_run(db_path, run_id, artifacts=[("ART-001", {})])
    model = FakeGeminiModel(response_payload={"assessment_summary": "x", "confidence_score": 0.5,
                             "risk_factors": [], "recommendations": [], "evidence_citations": ["ART-FAKE"]})
    assert IntelligenceService(settings=FakeSettings(db_path), model=model).generate_assessment(run_id) is None


def test_mixed_real_and_fake_citations_keeps_only_real(db_path):
    run_id = str(uuid4())
    seed_run(db_path, run_id, artifacts=[("ART-001", {}), ("ART-002", {})])
    model = FakeGeminiModel(response_payload={"assessment_summary": "x", "confidence_score": 0.5,
                             "risk_factors": [], "recommendations": [], "evidence_citations": ["ART-001", "ART-FAKE"]})
    assessment = IntelligenceService(settings=FakeSettings(db_path), model=model).generate_assessment(run_id)
    assert assessment.evidence_citations == ["ART-001"]


def test_nonexistent_run_produces_no_assessment(db_path):
    assert IntelligenceService(settings=FakeSettings(db_path), model=FakeGeminiModel()).generate_assessment("RUN-GHOST") is None


def test_lowercase_validated_status_is_still_accepted(db_path):
    run_id = str(uuid4())
    seed_run(db_path, run_id, final_status="validated", artifacts=[("ART-001", {})])
    model = FakeGeminiModel(response_payload={"assessment_summary": "x", "confidence_score": 0.5,
                             "risk_factors": [], "recommendations": [], "evidence_citations": ["ART-001"]})
    assessment = IntelligenceService(settings=FakeSettings(db_path), model=model).generate_assessment(run_id)
    assert assessment is not None    