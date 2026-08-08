from __future__ import annotations
import logging, uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from .engine import evaluate_prompt
from .schemas import PromptSecurityRequest, PromptSecurityResult

logger = logging.getLogger("prompt_security_service")
logging.basicConfig(level=logging.INFO)
SERVICE_NAME = "prompt-security-service"


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("%s starting up", SERVICE_NAME)
    yield
    logger.info("%s shutting down", SERVICE_NAME)


app = FastAPI(title=SERVICE_NAME, lifespan=lifespan)


@app.middleware("http")
async def correlation_middleware(request: Request, call_next):
    cid = request.headers.get("x-correlation-id", str(uuid.uuid4()))
    request.state.correlation_id = cid
    response = await call_next(request)
    response.headers["x-correlation-id"] = cid
    return response


@app.exception_handler(Exception)
async def unhandled(request: Request, exc: Exception):
    cid = getattr(request.state, "correlation_id", str(uuid.uuid4()))
    logger.exception("unhandled error cid=%s", cid)
    return JSONResponse(status_code=500, content={"error": {"code": "internal_error", "correlation_id": cid}})


@app.get("/health")
async def health():
    return {"status": "ok", "service": SERVICE_NAME}


@app.get("/ready")
async def ready():
    return {"status": "ready", "service": SERVICE_NAME}


@app.post("/prompt-security/evaluate", response_model=PromptSecurityResult)
async def evaluate(payload: PromptSecurityRequest, request: Request):
    return evaluate_prompt(payload, correlation_id=getattr(request.state, "correlation_id", None))
