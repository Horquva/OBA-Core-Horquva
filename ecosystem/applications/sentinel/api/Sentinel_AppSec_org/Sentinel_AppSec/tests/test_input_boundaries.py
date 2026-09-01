# tests/test_input_boundaries.py
import pytest
import json
from fastapi import FastAPI, Request, HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError

from sentinel.validation import SecurePayloadRequest
from sentinel.threats import ThreatDetector
from sentinel.context import SentinelSecurityException

# --- 1. UNIFIED PIPELINE SETUP ---
app = FastAPI()

@app.post("/api/v1/data")
async def submit_data(request: Request):
    # Boundary 1: Content-Type verification
    if request.headers.get("content-type") != "application/json":
        raise HTTPException(status_code=415, detail="Unsupported Media Type")
    
    # Boundary 2: Encoding & JSON Parsing
    try:
        raw_body = await request.body()
        payload = json.loads(raw_body.decode("utf-8"))
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Invalid Encoding")
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Malformed JSON")

    # Boundary 3: Threat Detection Engine (Layer 2)
    try:
        # Threat engine scans the raw dictionary representation
        ThreatDetector.scan_payload(payload)
    except SentinelSecurityException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)

    # Boundary 4: Schema Validation Engine (Layer 1)
    try:
        # FIX: Use Pydantic's native JSON parser to handle string-to-Enum coercion properly!
        validated_data = SecurePayloadRequest.model_validate_json(raw_body)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
        
    return {"status": "ALLOW"}

client = TestClient(app)

# --- 2. BASE BENIGN PAYLOAD ---
def get_benign_payload():
    return {
        "username": "valid_user_123", 
        "age": 30,
        "classification": "public",  # FIX: Reverted to lowercase value for the Enum
        "resources": [{"id": 101, "tags": ["safe"]}]
    }

# --- 3. TEST VECTORS ---
@pytest.mark.parametrize("scenario, payload_override, expected_status", [
    # --- BENIGN INPUT ---
    ("Valid baseline", {}, 200),
    ("Benign lookalike (no spaces, regex passes, threat passes)", {"username": "select_user"}, 200),
    
    # --- SCHEMA & STRUCTURE BOUNDARIES (Layer 1) ---
    ("Missing fields", {"username": None}, 422), 
    ("Wrong types", {"age": "thirty"}, 422),
    ("Invalid enum", {"classification": "super-secret"}, 422),
    ("Malformed nested object", {"resources": [{"id": "not-an-int", "tags": []}]}, 422),
    ("Malformed array", {"resources": "just_a_string"}, 422),
    ("Unexpected field (Mass Assignment)", {"is_admin": True}, 422),
    ("Oversized field", {"username": "a" * 100}, 422),
    ("Schema mismatch", {"username": "valid_user_123", "age": 30}, 422), # Missing required fields
    
    # --- THREAT BOUNDARIES (Layer 2) ---
    ("SQL Injection payload", {"resources": [{"id": 101, "tags": ["prod'; DROP TABLE users; --"]}]}, 403),
    ("XSS payload", {"resources": [{"id": 101, "tags": ["<script>alert(1)</script>"]}]}, 403),
    ("Path traversal payload", {"resources": [{"id": 101, "tags": ["../../../etc/passwd"]}]}, 403),
    ("Case variation attack (XSS)", {"resources": [{"id": 101, "tags": ["<ScRiPt>alert(1)</sCrIpT>"]}]}, 403),
    ("Command injection variant", {"resources": [{"id": 101, "tags": ["&& /bin/bash -c 'ls'"]}]}, 403),
    
    # --- PARSER ABUSE BOUNDARIES ---
    ("Deeply nested abuse", {"resources": [{"id": 101, "tags":[[[[[[[[[[[[[["deep"]]]]]]]]]]]]]]}]}, 400),
])
def test_input_security_boundaries(scenario, payload_override, expected_status):
    payload = get_benign_payload()
    if payload_override:
        if "username" in payload_override and payload_override["username"] is None:
            del payload["username"]
        elif "username" in payload_override and "age" in payload_override and len(payload_override) == 2:
            payload = payload_override 
        else:
            payload.update(payload_override)
            
    response = client.post("/api/v1/data", json=payload, headers={"Content-Type": "application/json"})
    assert response.status_code == expected_status, f"Failed on scenario: '{scenario}'. Server said: {response.text}"

# --- HTTP / RAW PARSER BOUNDARIES ---

def test_wrong_content_type():
    response = client.post("/api/v1/data", data=json.dumps(get_benign_payload()), headers={"Content-Type": "text/plain"})
    assert response.status_code == 415

def test_malformed_json():
    response = client.post("/api/v1/data", data="{broken: json,,,}", headers={"Content-Type": "application/json"})
    assert response.status_code == 400

def test_invalid_encoding():
    bad_bytes = b'\xff\xfe\x00\x00'
    response = client.post("/api/v1/data", content=bad_bytes, headers={"Content-Type": "application/json"})
    assert response.status_code == 400