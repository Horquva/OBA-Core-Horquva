import pytest
import os
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from discovery_pipeline import DiscoveryPipeline
from intelligence_registry import IntelligenceRegistry, STATE_FILE
from maturity_engine import MaturityEngine
from relationship_engine import RelationshipEngine
from models import MaturityState
from llm_client import GeminiClient
from api_server import app 

@pytest.fixture(autouse=True)
def clean_registry_state():
    if os.path.exists(STATE_FILE): os.remove(STATE_FILE)
    yield
    if os.path.exists(STATE_FILE): os.remove(STATE_FILE)

def get_mocked_pipeline():
    mock_llm = MagicMock(spec=GeminiClient)
    def mock_extract(prompt):
        if "Vector Database" in prompt: return {"technologies": ["RAG", "Vector Database"]}
        if "RAG" in prompt: return {"technologies": ["RAG"]}
        if "Agentic AI" in prompt: return {"technologies": ["Agentic AI"]}
        return {"technologies": []}
    mock_llm.generate_json.side_effect = mock_extract
    def mock_embed(texts):
        return [[0.1, 0.2, 0.3, 0.4] if "RAG" in t else [0.15, 0.25, 0.35, 0.45] for t in texts]
    mock_llm.embed.side_effect = mock_embed
    def mock_cosine(a, b):
        if a == b: return 1.0
        return 0.60 if (0.1 in a and 0.15 in b) or (0.15 in a and 0.1 in b) else 0.50
    mock_llm.cosine_similarity.side_effect = mock_cosine
    registry = IntelligenceRegistry()
    return DiscoveryPipeline(llm_client=mock_llm, registry=registry), registry, mock_llm

def test_deterministic_entity_resolution():
    pipeline, registry, mock_llm = get_mocked_pipeline()
    for r in pipeline.process_source("RAG is great.", "s1"): registry.upsert_technology(r)
    for r in pipeline.process_source("RAG reduces hallucinations.", "s2"): registry.upsert_technology(r)
    assert len(registry.technologies) == 1
    profile = list(registry.technologies.values())[0]
    assert profile.name == "RAG"
    assert len(profile.evidence) == 2

def test_adversarial_malformed_input():
    pipeline, registry, mock_llm = get_mocked_pipeline()
    assert len(pipeline.process_source("   ", "bad_src")) == 0

def test_maturity_and_relationships():
    pipeline, registry, mock_llm = get_mocked_pipeline()
    for r in pipeline.process_source("RAG and Vector Database.", "s1"): registry.upsert_technology(r)
    MaturityEngine().evaluate_maturity(registry)
    rag_profile = [p for p in registry.technologies.values() if p.name == "RAG"][0]
    assert rag_profile.maturity_state == MaturityState.EMERGING
    rels = RelationshipEngine(registry, mock_llm).analyze_co_occurrence()
    assert "Vector Database" in rels["RAG"]

def test_confidence_calibration():
    pipeline, registry, mock_llm = get_mocked_pipeline()
    for r in pipeline.process_source("RAG is emerging.", "s1"): registry.upsert_technology(r)
    for r in pipeline.process_source("RAG is standard.", "s2"): registry.upsert_technology(r)
    updated_profile = list(registry.technologies.values())[0]
    assert len(updated_profile.evidence) == 2

@pytest.fixture
def client():
    with patch('api_server.pipeline.llm') as mock_llm:
        mock_llm.generate_json.return_value = {"technologies": ["Agentic AI"]}
        mock_llm.embed.return_value = [[0.1, 0.2, 0.3, 0.4]]
        mock_llm.cosine_similarity.return_value = 0.5
        # Pass valid API key in headers
        yield TestClient(app, headers={"X-API-Key": "mocked-test-key-for-ci"})

def test_api_ingest_and_retrieve(client):
    payload = {"raw_text": "Agentic AI is the future.", "source_url": "test_url_99"}
    response = client.post("/v1/ingest", json=payload)
    assert response.status_code == 200
    assert any("agentic ai" in d.lower() for d in response.json()["discovered"])

def test_api_404_handling(client):
    assert client.get("/v1/intelligence/NonExistent%20Tech").status_code == 404

def test_api_unauthorized_access():
    """Part 6 QA Fix: Prove that missing/wrong API key returns 401 Unauthorized."""
    bad_client = TestClient(app, headers={"X-API-Key": "wrong-key"})
    response = bad_client.post("/v1/ingest", json={"raw_text": "test", "source_url": "test"})
    assert response.status_code == 401
