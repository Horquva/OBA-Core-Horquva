import pytest
import asyncio
from fastapi.testclient import TestClient
from uuid import uuid4

from ecosystem.applications.arcturus.api.main import app

def test_websocket_connection_handshake():
    experiment_id = str(uuid4())
    client = TestClient(app)
    
    with client.websocket_connect(f"/ws/experiments/{experiment_id}/stream") as websocket:
        data = websocket.receive_json()
        assert data["type"] == "CONNECTED"
        assert data["experiment_id"] == experiment_id

def test_websocket_receives_tick_events():
    experiment_id = str(uuid4())
    client = TestClient(app)
    
    # We use the test client as a context manager to open the connection
    with client.websocket_connect(f"/ws/experiments/{experiment_id}/stream") as websocket:
        # First message is the handshake
        data = websocket.receive_json()
        assert data["type"] == "CONNECTED"
        
        # Now publish a mock event directly to the EventBus
        bus = app.state.event_bus
        asyncio.run(bus.publish(experiment_id, "TICK", {"tick": 1}))
        
        # Verify the client received it
        data = websocket.receive_json()
        assert data["type"] == "TICK"
        assert data["payload"]["tick"] == 1
