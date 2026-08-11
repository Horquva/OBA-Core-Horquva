import pytest
from fastapi.testclient import TestClient
from discovery_pipeline import DiscoveryPipeline
from intelligence_registry import IntelligenceRegistry
from maturity_engine import MaturityEngine
from relationship_engine import RelationshipEngine
from models import MaturityState
from api_server import app # FastAPI app import

# ==========================================
# UNIT & INTEGRATION TESTS (Core Logic)
# ==========================================

def test_deterministic_entity_resolution():
    """Part-3 & 7: Ensure multiple sources for the same tech merge correctly (Duplicate Handling)."""
    pipeline = DiscoveryPipeline()
    registry = IntelligenceRegistry()

    recs1 = pipeline.process_source("RAG is great for LLMs.", "src_1")
    recs2 = pipeline.process_source("Retrieval-Augmented Generation (RAG) reduces hallucinations.", "src_2")

    for r in recs1 + recs2:
        registry.upsert_technology(r)

    # Should only be 1 unique technology profile for RAG
    assert len(registry.technologies) == 1
    profile = list(registry.technologies.values())[0]
    assert profile.name == "Retrieval-Augmented Generation"
    # Should have merged evidence from both sources
    assert len(profile.evidence) == 2
    assert len(profile.sources) == 2

def test_adversarial_malformed_input():
    """Part-7: Adversarial testing - system shouldn't crash on bad/empty data."""
    pipeline = DiscoveryPipeline()
    
    # Empty string
    recs = pipeline.process_source("   ", "bad_src")
    assert len(recs) == 0

    # No known technologies
    recs2 = pipeline.process_source("This text has no known technologies at all.", "bad_src_2")
    assert len(recs2) == 0

def test_maturity_and_relationships():
    """Part-4 & 5: Maturity computation and relationship graph co-occurrence."""
    pipeline = DiscoveryPipeline()
    registry = IntelligenceRegistry()

    def ingest(t, s): 
        for r in pipeline.process_source(t, s): registry.upsert_technology(r)

    ingest("RAG and Vector Database are used together.", "s1")
    ingest("LangChain orchestrates RAG.", "s2")

    # Maturity Check
    MaturityEngine().evaluate_maturity(registry)
    rag_profile = [p for p in registry.technologies.values() if p.name == "Retrieval-Augmented Generation"][0]
    assert rag_profile.maturity_state in [MaturityState.DEVELOPING, MaturityState.MATURING, MaturityState.ESTABLISHED]

    # Relationship Check
    rel_engine = RelationshipEngine(registry)
    rels = rel_engine.analyze_co_occurrence()
    assert "Vector Database" in rels["Retrieval-Augmented Generation"]
    assert "Retrieval-Augmented Generation" in rels["Vector Database"]

# ==========================================
# API INTEGRATION TESTS (Live Endpoints)
# ==========================================

@pytest.fixture
def client():
    return TestClient(app)

def test_api_ingest_and_retrieve(client):
    """Part-6 & 7: Live API integration testing via HTTP."""
    # 1. Ingest new tech via POST API
    payload = {"raw_text": "Agentic AI is the future of autonomous workflows.", "source_url": "test_url_99"}
    response = client.post("/ingest", json=payload)
    assert response.status_code == 200
    assert "Agentic AI" in response.json()["discovered"]

    # 2. Retrieve via GET API (URL encoded space)
    response = client.get("/intelligence/Agentic%20AI")
    assert response.status_code == 200
    data = response.json()
    assert data["technology"] == "Agentic AI"
    assert data["evidence_count"] >= 1
    
def test_api_404_handling(client):
    """Part-7: API should gracefully handle requests for unknown technologies."""
    response = client.get("/intelligence/NonExistent%20Tech")
    assert response.status_code == 404
