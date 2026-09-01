import pytest
import jwt
from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from fastapi.testclient import TestClient
from sentinel.app import app
from sentinel.identity import SENTINEL_JWT_SECRET, SENTINEL_JWT_ALGORITHM, SENTINEL_ISSUER, SENTINEL_AUDIENCE

client = TestClient(app)

def get_isolated_test_token(roles=["analyst"]):
    """Self-contained token generator to prevent cross-file import errors."""
    payload = {
        "sub": "test-user",
        "roles": roles,
        "iss": SENTINEL_ISSUER,
        "aud": SENTINEL_AUDIENCE,
        "iat": int(datetime.now(timezone.utc).timestamp()),
        "exp": int((datetime.now(timezone.utc) + timedelta(hours=1)).timestamp())
    }
    return jwt.encode(payload, SENTINEL_JWT_SECRET, algorithm=SENTINEL_JWT_ALGORITHM)

class TestOutputSecurity:
    """
    Task 16 - Execute the Output-Leakage Test.
    Trigger controlled application errors and verify safe external responses.
    """

    @patch("sentinel.threat_engine.ThreatDetectionEngine.scan")
    def test_stack_trace_suppression(self, mock_scan):
        # Simulate a fatal Python runtime error deep in the system
        mock_scan.side_effect = Exception("ZeroDivisionError: division by zero at line 42 in module X")
        
        token = get_isolated_test_token()
        response = client.get("/api/v1/data", headers={"Authorization": f"Bearer {token}"})
        
        # Verify the application fails closed without leaking the stack trace
        assert response.status_code == 500
        assert "ZeroDivisionError" not in response.text
        assert "line 42" not in response.text
        assert response.json()["error"]["code"] == "FAIL_CLOSED"

    @patch("sentinel.decision_engine.SecurityDecisionEngine.decide")
    def test_database_detail_suppression(self, mock_decide):
        # Simulate a database connection leak or internal service failure
        mock_decide.side_effect = Exception("psycopg2.OperationalError: FATAL: password authentication failed for user 'admin'")
        
        token = get_isolated_test_token()
        response = client.get("/api/v1/data", headers={"Authorization": f"Bearer {token}"})
        
        # Verify the application fails closed without leaking database credentials
        assert response.status_code == 500
        assert "psycopg2" not in response.text
        assert "password authentication failed" not in response.text
        assert response.json()["error"]["code"] == "FAIL_CLOSED"