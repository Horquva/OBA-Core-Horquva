"""
guardrail-engine — FastAPI service entrypoint.

Run locally:
    uvicorn horquva_security_py.guardrail_engine.main:app --reload --port 8101

This service is meant to sit behind ai-security-api-gateway (not yet
built) — it does not do its own authn/authz. It trusts the caller
identity fields it's given (agent_id/session_id) and returns a
decision; the gateway is responsible for making sure the caller is
who it says it is. Do not expose this service directly to untrusted
callers.
"""

from __future__ import annotations

import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from .engine import evaluate_input, evaluate_output
from .schemas import GuardrailDecision, InputEvaluationRequest, OutputEvaluationRequest

logger = logging.getLogger("guardrail_engine")
logging.basicConfig(level=logging.INFO)

SERVICE_NAME = "guardrail-engine"
SERVICE_VERSION = "0.1.0"


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("%s v%s starting up", SERVICE_NAME, SERVICE_VERSION)
    yield
    logger.info("%s shutting down", SERVICE_NAME)


app = FastAPI(title=SERVICE_NAME, version=SERVICE_VERSION, lifespan=lifespan)


# ---------------------------------------------------------------------------
# Logging / audit hook — every request gets a correlation id and a
# structured log line. This is a placeholder for real audit integration
# (Security Events service isn't built yet — TODO wire that in there).
# ---------------------------------------------------------------------------
@app.middleware("http")
async def correlation_and_audit_middleware(request: Request, call_next):
    correlation_id = request.headers.get("x-correlation-id", str(uuid.uuid4()))
    start = time.monotonic()
    request.state.correlation_id = correlation_id
    response = await call_next(request)
    duration_ms = (time.monotonic() - start) * 1000
    response.headers["x-correlation-id"] = correlation_id
    logger.info(
        "request path=%s method=%s status=%s duration_ms=%.2f correlation_id=%s",
        request.url.path,
        request.method,
        response.status_code,
        duration_ms,
        correlation_id,
    )
    return response


# ---------------------------------------------------------------------------
# Error contract — normalize errors to a single machine-readable shape.
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    correlation_id = getattr(request.state, "correlation_id", None) or str(uuid.uuid4())
    logger.exception("unhandled error correlation_id=%s", correlation_id)
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "internal_error",
                "message": "guardrail-engine failed to evaluate the request",
                "correlation_id": correlation_id,
            }
        },
    )


# ---------------------------------------------------------------------------
# Health / readiness.
# ---------------------------------------------------------------------------
@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": SERVICE_NAME, "version": SERVICE_VERSION}


@app.get("/ready")
async def ready() -> dict:
    # No external dependencies are wired up yet (policy engine is a
    # stub), so readiness is currently equivalent to liveness. Extend
    # this once guardrail-engine depends on other running services.
    return {"status": "ready", "service": SERVICE_NAME}


# ---------------------------------------------------------------------------
# Core evaluation endpoints.
# ---------------------------------------------------------------------------
@app.post("/guardrail/evaluate-input", response_model=GuardrailDecision)
async def evaluate_input_endpoint(
    payload: InputEvaluationRequest, request: Request
) -> GuardrailDecision:
    correlation_id = getattr(request.state, "correlation_id", None)
    return evaluate_input(payload, correlation_id=correlation_id)


@app.post("/guardrail/evaluate-output", response_model=GuardrailDecision)
async def evaluate_output_endpoint(
    payload: OutputEvaluationRequest, request: Request
) -> GuardrailDecision:
    correlation_id = getattr(request.state, "correlation_id", None)
    return evaluate_output(payload, correlation_id=correlation_id)
