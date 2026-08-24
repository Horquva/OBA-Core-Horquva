import pytest
from uuid import uuid4
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch

from ecosystem.applications.arcturus.api.main import app
from ecosystem.applications.arcturus.api.database import get_db_connection
from ecosystem.applications.arcturus.api.config import Settings
from ecosystem.applications.arcturus.contracts.experiment.base_models import ExperimentConfig

settings = Settings()

@pytest.fixture
def test_db():
    # Setup test experiment
    experiment_id = str(uuid4())
    config = ExperimentConfig().model_dump_json()
    with get_db_connection(settings.db_path) as db:
        db.execute(
            "INSERT INTO experiments (id, name, seed, config, status) VALUES (?, ?, ?, ?, ?)",
            (experiment_id, "Test Exp", 42, config, "CREATED")
        )
        db.commit()
    
    yield experiment_id
    
    # Teardown
    with get_db_connection(settings.db_path) as db:
        db.execute("DELETE FROM experiments WHERE id = ?", (experiment_id,))
        db.commit()

@pytest.fixture
def client():
    with TestClient(app) as client:
        yield client

def test_start_simulation_returns_202(client, test_db):
    with patch("ecosystem.applications.arcturus.api.routers.runtime.asyncio.create_task") as mock_task:
        response = client.post(f"/api/v1/runtime/experiments/{test_db}/start", json={
            "global_seed": 42,
            "duration_ticks": 5,
            "tick_delay_seconds": 0.1
        })
        
        assert response.status_code == 202
        data = response.json()
        assert data["status"] == "ACCEPTED"
        assert "run_id" in data
        assert data["experiment_id"] == test_db
        mock_task.assert_called_once()

def test_pause_and_resume_running_simulation(client, test_db):
    # First start it
    with patch("ecosystem.applications.arcturus.api.routers.runtime.asyncio.create_task"):
        client.post(f"/api/v1/runtime/experiments/{test_db}/start", json={
            "global_seed": 42,
            "duration_ticks": 5,
            "tick_delay_seconds": 0.1
        })
        
    # Pause it
    pause_response = client.post(f"/api/v1/runtime/experiments/{test_db}/pause")
    assert pause_response.status_code == 200
    assert pause_response.json()["status"] == "PAUSED"
    
    # Check status
    status_response = client.get(f"/api/v1/runtime/experiments/{test_db}/status")
    assert status_response.json()["status"].lower() == "paused"
    
    # Resume it
    resume_response = client.post(f"/api/v1/runtime/experiments/{test_db}/resume")
    assert resume_response.status_code == 200
    assert resume_response.json()["status"] == "RUNNING"
    
def test_start_nonexistent_experiment_returns_404(client):
    response = client.post("/api/v1/runtime/experiments/invalid-id/start", json={})
    assert response.status_code == 404
    
def test_double_start_returns_409(client, test_db):
    with patch("ecosystem.applications.arcturus.api.routers.runtime.asyncio.create_task"):
        client.post(f"/api/v1/runtime/experiments/{test_db}/start", json={
            "global_seed": 42,
            "duration_ticks": 5,
            "tick_delay_seconds": 0.1
        })
        
        # Second start should fail
        response = client.post(f"/api/v1/runtime/experiments/{test_db}/start", json={
            "global_seed": 42,
            "duration_ticks": 5,
            "tick_delay_seconds": 0.1
        })
        assert response.status_code == 409
