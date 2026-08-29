from uuid import uuid4
from ecosystem.applications.arcturus.api.services.intelligence_service import IntelligenceService
from .conftest import FakeSettings, FakeGeminiModel, seed_run


def test_citations_match_real_evidence_when_valid(db_path):
    run_id = str(uuid4())
    seed_run(db_path, run_id, artifacts=[("ART-001", {}), ("ART-002", {})])
    model = FakeGeminiModel(response_payload={"assessment_summary": "x", "confidence_score": 0.6,
                             "risk_factors": [], "recommendations": [], "evidence_citations": ["ART-001", "ART-002"]})
    assessment = IntelligenceService(settings=FakeSettings(db_path), model=model).generate_assessment(run_id)
    assert set(assessment.evidence_citations) == {"ART-001", "ART-002"}


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


def test_citations_never_leak_across_runs(db_path):
    run_a, run_b = str(uuid4()), str(uuid4())
    seed_run(db_path, run_a, experiment_id="EXP-A", artifacts=[("ART-A1", {})])
    seed_run(db_path, run_b, experiment_id="EXP-B", artifacts=[("ART-B1", {})])
    model = FakeGeminiModel(response_payload={"assessment_summary": "x", "confidence_score": 0.5,
                             "risk_factors": [], "recommendations": [], "evidence_citations": ["ART-B1"]})
    assert IntelligenceService(settings=FakeSettings(db_path), model=model).generate_assessment(run_a) is None