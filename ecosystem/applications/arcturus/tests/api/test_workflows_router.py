import pytest
from fastapi.testclient import TestClient

from ecosystem.applications.arcturus.api.main import app

@pytest.fixture
def client():
    with TestClient(app) as client:
        yield client


def test_compile_workflow_endpoint_success(client):
    payload = {
        "experiment_id": "EXP-API-001",
        "global_seed": 42,
        "workflow_id": "WF-BHV-001",
        "name": "API Test Workflow",
        "description": "Testing workflow router",
        "activities": [
            {
                "context": {"experiment_id": "EXP-API-001", "global_seed": 42},
                "activity_id": "ACT-0001",
                "name": "Requirement Gathering",
                "status": "pending",
                "dependencies": []
            },
            {
                "context": {"experiment_id": "EXP-API-001", "global_seed": 42},
                "activity_id": "ACT-0002",
                "name": "Implementation",
                "status": "pending",
                "dependencies": ["ACT-0001"]
            }
        ],
        "organizational_context_ref": "ENT-INST-001",
        "agent_assignment_ref": "AGT-ASSIGN-001",
        "created_by": "javeria.rafhan"
    }

    response = client.post("/api/v1/workflows/compile", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["workflow_id"] == "WF-BHV-001"
    assert len(data["activities"]) == 2


def test_compile_workflow_endpoint_circular_dependency_rejected(client):
    payload = {
        "experiment_id": "EXP-API-001",
        "global_seed": 42,
        "workflow_id": "WF-BHV-001",
        "name": "Cycle Workflow",
        "activities": [
            {
                "context": {"experiment_id": "EXP-API-001", "global_seed": 42},
                "activity_id": "ACT-0001",
                "name": "A",
                "status": "pending",
                "dependencies": ["ACT-0002"]
            },
            {
                "context": {"experiment_id": "EXP-API-001", "global_seed": 42},
                "activity_id": "ACT-0002",
                "name": "B",
                "status": "pending",
                "dependencies": ["ACT-0001"]
            }
        ],
        "organizational_context_ref": "ENT-INST-001",
        "agent_assignment_ref": "AGT-ASSIGN-001"
    }

    response = client.post("/api/v1/workflows/compile", json=payload)
    assert response.status_code == 422
    assert "circular dependency detected" in response.json()["detail"]["error"]


def test_get_unblocked_activities_endpoint(client):
    workflow_payload = {
        "context": {"experiment_id": "EXP-API-001", "global_seed": 42},
        "workflow_id": "WF-BHV-001",
        "name": "Unblocked Test",
        "activities": [
            {
                "context": {"experiment_id": "EXP-API-001", "global_seed": 42},
                "activity_id": "ACT-0001",
                "name": "First Task",
                "status": "pending",
                "dependencies": []
            },
            {
                "context": {"experiment_id": "EXP-API-001", "global_seed": 42},
                "activity_id": "ACT-0002",
                "name": "Second Task",
                "status": "pending",
                "dependencies": ["ACT-0001"]
            }
        ],
        "organizational_context_ref": "ENT-INST-001",
        "agent_assignment_ref": "AGT-ASSIGN-001",
        "created_by": "javeria.rafhan"
    }

    response = client.post("/api/v1/workflows/unblocked", json=workflow_payload)
    assert response.status_code == 200
    unblocked = response.json()
    assert len(unblocked) == 1
    assert unblocked[0]["activity_id"] == "ACT-0001"


def test_advance_activity_endpoint(client):
    workflow_payload = {
        "context": {"experiment_id": "EXP-API-001", "global_seed": 42},
        "workflow_id": "WF-BHV-001",
        "name": "Advance Test",
        "activities": [
            {
                "context": {"experiment_id": "EXP-API-001", "global_seed": 42},
                "activity_id": "ACT-0001",
                "name": "First Task",
                "status": "pending",
                "dependencies": []
            }
        ],
        "organizational_context_ref": "ENT-INST-001",
        "agent_assignment_ref": "AGT-ASSIGN-001",
        "created_by": "javeria.rafhan"
    }

    advance_payload = {
        "workflow": workflow_payload,
        "activity_id": "ACT-0001",
        "target_status": "in_progress",
        "tick": 1
    }

    response = client.post("/api/v1/workflows/advance", json=advance_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["updated_activity"]["status"] == "in_progress"
    assert data["event"]["event_type"] == "WORKFLOW_ACTIVITY_STATUS_CHANGED"
