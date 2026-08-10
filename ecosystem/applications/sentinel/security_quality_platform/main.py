from contextlib import asynccontextmanager

from fastapi import FastAPI

from security_quality_platform.api.routes import router
from security_quality_platform.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Sentinel Security Quality & Compliance Platform",
    version="0.1.0",
    description=(
        "Independent security verification, evidence, compliance, trust, "
        "regression and certification control plane for Sentinel."
    ),
    lifespan=lifespan,
)

app.include_router(router)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "sentinel-security-quality-compliance",
        "version": "0.1.0",
    }


@app.get("/api/v1/readiness")
def readiness():
    return {
        "ready": True,
        "modules": [
            "assessment",
            "test-management",
            "finding-management",
            "evidence",
            "compliance",
            "exceptions",
            "trust",
            "regression",
            "scorecard",
            "certification",
            "audit-ledger",
            "workflow-orchestration",
        ],
    }
