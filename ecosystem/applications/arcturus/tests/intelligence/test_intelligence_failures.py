"""
Day 6 — failure engineering, Simulation Intelligence platform, router level.
"""

import sqlite3
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from ecosystem.applications.arcturus.api.routers.intelligence import router, get_db, get_intelligence_service
from ecosystem.applications.arcturus.api.services.intelligence_service import (
    IntelligenceService, IntelligenceUnavailable,
)
from .conftest import FakeSettings, FakeGeminiModel, seed_run


def build_client(db_path, model) -> TestClient:
    app = FastAPI()
    app.include_router(router)

    def _get_db():
        conn = sqlite3.connect(str(db_path))
        try:
            yield conn
        finally:
            conn.close()

    app.dependency_overrides[get_db] = _get_db
    app.dependency_overrides[get_intelligence_service] = lambda: IntelligenceService(
        settings=FakeSettings(db_path), model=model
    )
    return TestClient(app)


def test_gemini_timeout_returns_unavailable_via_router(db_path) -> None:
    run_id = str(uuid4())
    seed_run(db_path, run_id, artifacts=[("ART-001", {})])
    client = build_client(db_path, FakeGeminiModel(raise_error=True))

    response = client.get(f"/api/v1/intelligence/{run_id}/assessment")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "UNAVAILABLE"
    assert body["assessment"] is None
    assert body["reason"]


def test_zero_validated_evidence_returns_no_trusted_evidence_via_router(db_path) -> None:
    run_id = str(uuid4())
    seed_run(db_path, run_id, final_status="VALIDATED", artifacts=[])
    client = build_client(db_path, FakeGeminiModel())

    response = client.get(f"/api/v1/intelligence/{run_id}/assessment")

    assert response.status_code == 200
    assert response.json()["status"] == "NO_TRUSTED_EVIDENCE"


def test_nonexistent_run_returns_404_via_router(db_path) -> None:
    client = build_client(db_path, FakeGeminiModel())
    response = client.get("/api/v1/intelligence/RUN-GHOST/assessment")
    assert response.status_code == 404


def test_malformed_gemini_json_raises_unavailable_not_fake_assessment(db_path) -> None:
    run_id = str(uuid4())
    seed_run(db_path, run_id, artifacts=[("ART-001", {})])

    class BrokenJSONModel:
        def generate_content(self, prompt, generation_config=None):
            class _Resp:
                text = "not valid json {{{"
            return _Resp()

    service = IntelligenceService(settings=FakeSettings(db_path), model=BrokenJSONModel())
    with pytest.raises(IntelligenceUnavailable):
        service.generate_assessment(run_id=run_id)