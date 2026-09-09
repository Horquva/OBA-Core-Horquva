"""
Gateway tests use an httpx.MockTransport standing in for all
downstream services, so these tests exercise the gateway's OWN logic
(auth, rate limiting, kill-switch enforcement, routing, error
contract) without needing every real service running on a real port.
"""
from __future__ import annotations
import json
import httpx
import pytest
from fastapi.testclient import TestClient

from horquva_security_py.ai_security_api_gateway import main as gateway_main

app = gateway_main.app
client = TestClient(app)


def _install_mock_transport(*, agent_blocked: bool = False):
    def handler(request: httpx.Request) -> httpx.Response:
        if "/kill-switch/" in str(request.url) and request.url.path.endswith("/is-blocked"):
            return httpx.Response(200, json={"scope": "x", "blocked": agent_blocked, "reason": "mock"})
        # Any other downstream call: pretend the service handled it fine.
        return httpx.Response(200, json={"ok": True, "path": str(request.url)})

    gateway_main.http_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))


def setup_function(_):
    _install_mock_transport(agent_blocked=False)


def test_health():
    assert client.get("/health").status_code == 200


def test_missing_api_key_rejected():
    resp = client.post("/guardrail/evaluate-input", json={})
    assert resp.status_code == 401


def test_invalid_api_key_rejected():
    resp = client.post("/guardrail/evaluate-input", json={}, headers={"x-api-key": "not-a-real-key"})
    assert resp.status_code == 401


def test_unknown_route_prefix_404():
    key = client.post("/gateway/issue-key", params={"agent_id": "a1"}).json()["api_key"]
    resp = client.post("/not-a-real-service/whatever", json={}, headers={"x-api-key": key})
    assert resp.status_code == 404


def test_valid_key_forwards_to_downstream():
    key = client.post("/gateway/issue-key", params={"agent_id": "a2"}).json()["api_key"]
    resp = client.post("/guardrail/evaluate-input", json={"content": "hi"}, headers={"x-api-key": key})
    assert resp.status_code == 200
    assert resp.json()["ok"] is True


def test_killed_agent_blocked():
    _install_mock_transport(agent_blocked=True)
    key = client.post("/gateway/issue-key", params={"agent_id": "a3"}).json()["api_key"]
    resp = client.post("/guardrail/evaluate-input", json={"content": "hi"}, headers={"x-api-key": key})
    assert resp.status_code == 423


def test_rate_limit_enforced():
    gateway_main.rate_limiter.capacity = 2
    gateway_main.rate_limiter._buckets.clear()
    key = client.post("/gateway/issue-key", params={"agent_id": "a4"}).json()["api_key"]
    r1 = client.post("/guardrail/evaluate-input", json={}, headers={"x-api-key": key})
    r2 = client.post("/guardrail/evaluate-input", json={}, headers={"x-api-key": key})
    r3 = client.post("/guardrail/evaluate-input", json={}, headers={"x-api-key": key})
    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r3.status_code == 429
    gateway_main.rate_limiter.capacity = 20
