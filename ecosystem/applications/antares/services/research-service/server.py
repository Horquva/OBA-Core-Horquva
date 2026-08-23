"""
server.py — HTTP wrapper exposing the Technology Intelligence / Future-Signal
research output as JSON.

Note: the full discovery pipeline (api_server.py: /v1/ingest, /v1/intelligence)
calls an external LLM (Gemini) to discover new signals, which needs
ANTARES_API_KEY / GEMINI credentials this environment doesn't have. This
server instead serves the real signals/patterns/contradictions the research
team's pipeline already produced and committed to
apps/research-dashboard/dashboard/data.json — genuine pipeline output, just
not re-run live. Swap in api_server.py once a Gemini key is available.

Run: uvicorn server:app --port 4006
"""
import json
import os
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Antares Technology Intelligence (signals feed)")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

DATA_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "apps", "research-dashboard", "dashboard", "data.json"
)


class NewSignal(BaseModel):
    title: str
    orgs: list[str] = []
    state: str = "candidate"


@app.get("/api/signals")
def signals():
    with open(DATA_PATH) as f:
        data = json.load(f)
    return {
        "service": "research-service",
        "owner": "Aurangzeb Malik / Syed Hadeed Safdar",
        "counts": data.get("counts", {}),
        "signals": data.get("signals", []),
    }


@app.post("/api/signals", status_code=201)
def add_signal(signal: NewSignal):
    with open(DATA_PATH) as f:
        data = json.load(f)

    new_id = f"SIG-{uuid.uuid4().hex[:8].upper()}"
    record = {
        "id": new_id,
        "title": signal.title,
        "organizations": signal.orgs,
        "state": signal.state,
        "addedAt": datetime.now(timezone.utc).isoformat(),
        "addedManually": True,
    }
    data.setdefault("signals", []).append(record)
    data.setdefault("counts", {})["signals"] = len(data["signals"])

    with open(DATA_PATH, "w") as f:
        json.dump(data, f, indent=2)

    return {"ok": True, "signal": record}


@app.get("/health")
def health():
    return {"status": "ok", "service": "research-service"}
