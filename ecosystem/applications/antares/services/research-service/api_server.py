from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from discovery_pipeline import DiscoveryPipeline
from intelligence_registry import IntelligenceRegistry
from maturity_engine import MaturityEngine
from retrieval_api import TechnologyIntelligenceAPI

app = FastAPI(title="Antares Technology Intelligence API (Live)")

registry = IntelligenceRegistry()
pipeline = DiscoveryPipeline()
maturity_engine = MaturityEngine()

# Seed initial data on startup
for text, src in [("RAG and Vector DBs are key.", "seed_1"), ("Agentic AI uses LLMs.", "seed_2")]:
    for r in pipeline.process_source(text, src): registry.upsert_technology(r)
maturity_engine.evaluate_maturity(registry)

class IngestRequest(BaseModel):
    raw_text: str
    source_url: str

@app.post("/ingest")
def ingest_source(request: IngestRequest):
    records = pipeline.process_source(request.raw_text, request.source_url)
    for r in records: registry.upsert_technology(r)
    maturity_engine.evaluate_maturity(registry)
    return {"status": "success", "discovered": [r.name for r in records]}

@app.get("/intelligence/{tech_name}")
def get_intelligence(tech_name: str):
    api = TechnologyIntelligenceAPI(registry)
    report = api.get_full_intelligence_report(tech_name)
    if "error" in report: raise HTTPException(status_code=404, detail=report["error"])
    return report
