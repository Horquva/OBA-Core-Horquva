import pytest
import jwt
import time
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient

from sentinel.app import app
from sentinel.identity import SENTINEL_JWT_SECRET, SENTINEL_JWT_ALGORITHM, SENTINEL_ISSUER, SENTINEL_AUDIENCE

client = TestClient(app)


def generate_test_token(sub="user123", roles=None, exp_delta=3600, issuer=SENTINEL_ISSUER, audience=SENTINEL_AUDIENCE, secret=SENTINEL_JWT_SECRET):
    if roles is None:
        roles = ["user"]
    now = datetime.now(timezone.utc)
    payload = {
        "sub": sub,
        "roles": roles,
        "iss": issuer,
        "aud": audience,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=exp_delta)).timestamp())
    }
    return jwt.encode(payload, secret, algorithm=SENTINEL_JWT_ALGORITHM)


# --- 1. HEALTH CHECK TEST ---
def test_exempt_route_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert "X-Content-Type-Options" in res.headers


# --- 2. IDENTITY NEGATIVE TESTING ---
def test_missing_authentication_token():
    res = client.get("/api/v1/profile")
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "AUTH_MISSING"


def test_expired_token():
    token = generate_test_token(exp_delta=-3600)  # Expired 1 hour ago
    res = client.get("/api/v1/profile", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "AUTH_EXPIRED"


def test_tampered_token_signature():
    token = generate_test_token(secret="wrong-attacker-secret-key-signature")
    res = client.get("/api/v1/profile", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "AUTH_INVALID"


# --- 3. AUTHORIZATION NEGATIVE TESTING ---
def test_authenticated_unauthorized_access():
    # User role attempting to access analyst endpoint
    token = generate_test_token(roles=["user"])
    res = client.get("/api/v1/data", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "AUTHZ_FORBIDDEN"


def test_authorized_access():
    token = generate_test_token(roles=["analyst"])
    res = client.get("/api/v1/data", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["data_lake_records"] == 42000


# --- 4. OWASP THREAT INJECTION TESTS ---
def test_sql_injection_in_json_payload():
    token = generate_test_token(roles=["user"])
    payload = {"display_name": "admin' OR '1'='1", "email": "valid@domain.com"}
    res = client.post("/api/v1/profile", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "THREAT_DETECTED"


def test_xss_in_query_parameters():
    token = generate_test_token(roles=["user"])
    res = client.get("/api/v1/profile?search=<script>alert(1)</script>", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "THREAT_DETECTED"


def test_path_traversal_in_json_payload():
    token = generate_test_token(roles=["user"])
    payload = {"display_name": "../../etc/passwd", "email": "valid@domain.com"}
    res = client.post("/api/v1/profile", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "THREAT_DETECTED"


# --- 5. OUTPUT PROTECTION & DATA MASKING ---
def test_sensitive_data_masking_and_headers():
    token = generate_test_token(roles=["user"])
    res = client.get("/api/v1/profile", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    body = res.json()

    # Verify PII masking
    assert body["ssn"] == "***-**-****"
    assert "syed.abdur.rehman***@" in body["email"]
    # Verify sensitive token redaction
    assert body["api_key"] == "[REDACTED_BY_SENTINEL]"
    # Verify security headers
    assert res.headers["X-Frame-Options"] == "DENY"
    assert res.headers["Cache-Control"] == "no-store, no-cache, must-revalidate, max-age=0"
    assert "X-Correlation-ID" in res.headers