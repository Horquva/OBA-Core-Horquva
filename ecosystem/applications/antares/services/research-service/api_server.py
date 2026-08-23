from fastapi import FastAPI, HTTPException, Header, Depends, Security
from fastapi.security import APIKeyHeader
from pydantic import BaseModel
import uuid
import logging
import os
from dotenv import load_dotenv
from llm_client import GeminiClient
from intelligence_registry import IntelligenceRegistry
from discovery_pipeline import DiscoveryPipeline
from maturity_engine import MaturityEngine
from retrieval_api import TechnologyIntelligenceAPI

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(name)s | %(levelname)s | %(message)s")
logger = logging.getLogger("antares.api")

app = FastAPI(title="Antares Technology Intelligence API (AI-Native)")

API_KEY = os.getenv("ANTARES_API_KEY", "mocked-test-key-for-ci")
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

def verify_api_key(api_key: str = Security(api_key_header)):
    if api_key != API_KEY:
        logger.warning(f"Unauthorized access attempt.")
        raise HTTPException(status_code=401, detail="Invalid or missing API Key")

llm = GeminiClient()
registry = IntelligenceRegistry()
pipeline = DiscoveryPipeline(llm_client=llm, registry=registry)
maturity_engine = MaturityEngine()

class IngestRequest(BaseModel):
    raw_text: str
    source_url: str

@app.post("/v1/ingest", dependencies=[Depends(verify_api_key)])
def ingest_source(request: IngestRequest, x_correlation_id: str = Header(default_factory=lambda: str(uuid.uuid4()))):
    logger.info(f"[{x_correlation_id}] Ingesting source: {request.source_url}")
    records = pipeline.process_source(request.raw_text, request.source_url)
    for r in records: registry.upsert_technology(r)
    maturity_engine.evaluate_maturity(registry)
    return {"status": "success", "correlation_id": x_correlation_id, "discovered": [r.name for r in records]}

@app.get("/v1/intelligence/{tech_name}", dependencies=[Depends(verify_api_key)])
def get_intelligence(tech_name: str, x_correlation_id: str = Header(default_factory=lambda: str(uuid.uuid4()))):
    logger.info(f"[{x_correlation_id}] Querying intelligence for: {tech_name}")
    api = TechnologyIntelligenceAPI(registry, llm)
    report = api.get_full_intelligence_report(tech_name)
    if "error" in report: raise HTTPException(status_code=404, detail=report["error"])
    return report
