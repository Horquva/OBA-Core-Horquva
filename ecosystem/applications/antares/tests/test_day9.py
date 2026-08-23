import os
import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("TESTING", "1")
from app.main import app  # noqa: E402


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_dashboard_returns_html(client):
    response = client.get("/dashboard")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]


def test_dashboard_references_real_api_endpoints(client):
    """
    Not a full browser test (no JS engine here), but confirms the
    page's JS is actually wired to call the real endpoints built in
    Days 4-8, not placeholder/fake ones.
    """
    html = client.get("/dashboard").text
    for endpoint in ["/signals", "/patterns", "/models", "/candidate-capabilities",
                      "/patterns/detect", "/models/build", "/capabilities/build",
                      "/intelligence/trace/"]:
        assert endpoint in html
