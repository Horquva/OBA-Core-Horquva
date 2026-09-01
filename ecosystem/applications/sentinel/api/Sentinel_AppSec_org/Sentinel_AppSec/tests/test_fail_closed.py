import pytest
import jwt
from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from fastapi.testclient import TestClient
from sentinel.app import app

client = TestClient(app)

def generate_valid_test_token():
    """Generates a cryptographically valid token to survive Step 1."""
    payload = {
        "sub": "test-user",
        "roles": ["user"],
        "iss": "sentinel-auth-service",
        "aud": "sentinel-api",
        "iat": int(datetime.now(timezone.utc).timestamp()),
        "exp": int((datetime.now(timezone.utc) + timedelta(hours=1)).timestamp())
    }
    secret = "sentinel-production-grade-hmac-sha256-secret-key-32b"
    return jwt.encode(payload, secret, algorithm="HS256")

def trigger_profile_request():
    """Sends a valid POST request that should pass all gates unless sabotaged."""
    token = generate_valid_test_token()
    return client.post(
        "/api/v1/profile", 
        json={"display_name": "Valid Name", "email": "valid@sentinel.io"},
        headers={"Authorization": f"Bearer {token}"}
    )


class TestFailClosedBehavior:
    """
    Task 4 - Demonstrable fail-closed behavior with evidence for each critical failure condition.
    """

    @patch("sentinel.identity.IdentityVerifier.verify")
    def test_identity_service_unavailable(self, mock_verify):
        mock_verify.side_effect = Exception("Connection Refused: Sentinel Identity Service Unavailable")
        response = trigger_profile_request()
        assert response.status_code == 500
        assert response.json()["error"]["code"] == "FAIL_CLOSED"

    @patch("sentinel.authz.PolicyEngine.evaluate")
    def test_authorization_service_unavailable(self, mock_evaluate):
        mock_evaluate.side_effect = Exception("Timeout: Sentinel Policy Engine Unreachable")
        response = trigger_profile_request()
        assert response.status_code == 500
        assert response.json()["error"]["code"] == "FAIL_CLOSED"

    @patch("sentinel.schema_validator.SchemaValidator.parse_and_validate_json")
    def test_validation_engine_unavailable(self, mock_validate):
        mock_validate.side_effect = Exception("MemoryError: Validation Engine crashed")
        response = trigger_profile_request()
        assert response.status_code == 500
        assert response.json()["error"]["code"] == "FAIL_CLOSED"

    @patch("sentinel.threat_engine.ThreatDetectionEngine.scan")
    def test_threat_engine_unavailable(self, mock_scan):
        mock_scan.side_effect = Exception("Corrupt Threat Rules Signature")
        response = trigger_profile_request()
        assert response.status_code == 500
        assert response.json()["error"]["code"] == "FAIL_CLOSED"
        
    @patch("sentinel.decision_engine.SecurityDecisionEngine.decide")
    def test_security_context_corrupted(self, mock_decide):
        mock_decide.side_effect = Exception("Contextual Integrity Check Failed")
        response = trigger_profile_request()
        assert response.status_code == 500
        assert response.json()["error"]["code"] == "FAIL_CLOSED"