"""
tests/api/test_synthetic_data_router.py — Day 4.
Overrides the router's own get_db (local to synthetic_data.py, not a
shared api/database.py dependency — confirmed against experiments.py's
same per-router pattern).
"""

from fastapi.testclient import TestClient

from ecosystem.applications.arcturus.api.main import app
from ecosystem.applications.arcturus.api.routers.synthetic_data import get_db


class _FakeRow(dict):
    """sqlite3.Row supports both index and key access; dict covers the key access this router uses."""


class _FakeDB:
    def __init__(self, rows: list[dict]):
        self._rows = rows

    def execute(self, *_args, **_kwargs):
        return self

    def fetchall(self):
        return [_FakeRow(row) for row in self._rows]


def _override(rows: list[dict]):
    app.dependency_overrides[get_db] = lambda: _FakeDB(rows)


def test_missing_run_returns_404() -> None:
    _override(rows=[])
    client = TestClient(app)

    response = client.get("/api/v1/synthetic-data/RUN-NOT-FOUND/corpus")

    assert response.status_code == 404
    app.dependency_overrides.clear()


def test_existing_run_returns_preview_with_accepted_artifacts() -> None:
    _override(rows=[{
        "artifact_id": "ART-001",
        "artifact_type": "document",
        "content": '{"title": "test"}',
        "metadata": '{"source": "synthetic_data"}',
        "lifecycle_state": "generated",
        "provenance": '{"global_seed": 7}',
        "created_at": "2026-08-27T12:00:00Z",
    }])
    client = TestClient(app)

    response = client.get("/api/v1/synthetic-data/RUN-001/corpus")

    assert response.status_code == 200
    body = response.json()
    assert body["run_id"] == "RUN-001"
    assert len(body["accepted_artifacts"]) == 1
    assert body["accepted_artifacts"][0]["artifact_id"] == "ART-001"
    assert body["lineage_available"] is False  # honest about the schema gap
    app.dependency_overrides.clear()


def test_null_content_and_metadata_default_to_empty_dict() -> None:
    _override(rows=[{
        "artifact_id": "ART-002",
        "artifact_type": "report",
        "content": None,
        "metadata": None,
        "lifecycle_state": "generated",
        "provenance": '{"global_seed": 7}',
        "created_at": "2026-08-27T12:00:00Z",
    }])
    client = TestClient(app)

    response = client.get("/api/v1/synthetic-data/RUN-002/corpus")

    assert response.status_code == 200
    artifact = response.json()["accepted_artifacts"][0]
    assert artifact["content"] == {}
    assert artifact["metadata"] == {}
    app.dependency_overrides.clear()