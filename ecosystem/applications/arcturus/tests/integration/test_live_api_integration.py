import os
import sqlite3
from uuid import uuid4

import pytest

from ecosystem.applications.arcturus.api.config import Settings
from ecosystem.applications.arcturus.api.services.intelligence_service import IntelligenceService
from ecosystem.applications.arcturus.tests.intelligence.conftest import seed_run

# Attempt to load the .env file so that the API key is present for skipif evaluation
try:
    from dotenv import load_dotenv
    load_dotenv(r"C:\data\Horquva\OBA-Core-Horquva\ecosystem\applications\arcturus\.env")
except ImportError:
    pass

# Skip this test if the live API key is not present in the environment
pytestmark = pytest.mark.skipif(
    not os.environ.get("ARCTURUS_GEMINI_API_KEY"),
    reason="ARCTURUS_GEMINI_API_KEY not set. Skipping live API integration test."
)


def test_live_gemini_api_call_succeeds(tmp_path):
    # 1. Setup an isolated test database
    db_path = tmp_path / "live_test.db"
    conn = sqlite3.connect(str(db_path))
    conn.executescript("""
        CREATE TABLE experiments (id TEXT PRIMARY KEY, seed INTEGER NOT NULL, config JSON, status TEXT);
        CREATE TABLE simulation_runs (
            run_id TEXT PRIMARY KEY,
            experiment_id TEXT NOT NULL,
            trace_id TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'COMPLETED',
            started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ended_at TIMESTAMP
        );
        CREATE TABLE validation_results (
            run_id TEXT PRIMARY KEY, passed_rules JSON, failed_rules JSON,
            flagged_rules JSON, final_status TEXT NOT NULL, reason TEXT
        );
        CREATE TABLE synthetic_artifacts (
            artifact_id TEXT PRIMARY KEY, run_id TEXT NOT NULL, artifact_type TEXT NOT NULL, content JSON
        );
        CREATE TABLE intelligence_assessments (
            run_id TEXT PRIMARY KEY, assessment_json JSON NOT NULL, created_at TIMESTAMP
        );
    """)
    conn.commit()
    conn.close()

    run_id = str(uuid4())
    # 2. Seed a valid simulation run with an artifact that Gemini can read
    seed_run(
        db_path=db_path,
        run_id=run_id,
        artifacts=[("ART-LIVE-TEST", {"content": "The system successfully processed 500 requests per second with 0 downtime."})]
    )

    # 3. Instantiate the service WITH the real Settings and NO mock model
    settings = Settings(db_path=db_path)
    # The IntelligenceService will automatically initialize the Google GenAI client
    # using the ARCTURUS_GEMINI_API_KEY from the environment.
    service = IntelligenceService(settings=settings)

    # 4. Trigger the live generation
    assessment = service.generate_assessment(run_id=run_id)

    # 5. Assert the real Gemini model returned a structurally valid assessment
    assert assessment is not None, "Live Gemini assessment returned None"
    assert hasattr(assessment, "assessment_summary")
    assert isinstance(assessment.assessment_summary, str)
    assert len(assessment.assessment_summary) > 10
    
    # Assert that it actually cited our dummy artifact
    assert "ART-LIVE-TEST" in assessment.evidence_citations
