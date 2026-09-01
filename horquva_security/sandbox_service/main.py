from __future__ import annotations
import logging, uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

from .schemas import CreateSandboxRequest, RecordCallRequest, RecordCallResult, SandboxSession
from .store import SandboxStore

logger = logging.getLogger("sandbox_service")
logging.basicConfig(level=logging.INFO)
SERVICE_NAME = "sandbox-service"

store = SandboxStore()


def _to_response(s) -> SandboxSession:
    return SandboxSession(session_id=s.session_id, agent_id=s.agent_id,
                           allowed_capabilities=sorted(s.allowed_capabilities), max_calls=s.max_calls,
                           calls_made=s.calls_made, active=s.active, created_at=s.created_at,
                           destroyed_at=s.destroyed_at)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("%s starting up", SERVICE_NAME)
    yield


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


@app.post("/sandbox/sessions", response_model=SandboxSession, status_code=201)
async def create(payload: CreateSandboxRequest):
    session = store.create(agent_id=payload.agent_id, allowed_capabilities=payload.allowed_capabilities,
                            max_calls=payload.max_calls)
    return _to_response(session)


@app.get("/sandbox/sessions/{session_id}", response_model=SandboxSession)
async def get(session_id: str):
    session = store.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="unknown session_id")
    return _to_response(session)


@app.post("/sandbox/sessions/{session_id}/call", response_model=RecordCallResult)
async def record_call(session_id: str, payload: RecordCallRequest):
    ok, reason, session = store.record_call(session_id, capability=payload.capability, params=payload.params)
    if session is None:
        raise HTTPException(status_code=404, detail="unknown session_id")
    return RecordCallResult(allowed=ok, reason=reason, session=_to_response(session))


@app.post("/sandbox/sessions/{session_id}/destroy", response_model=SandboxSession)
async def destroy(session_id: str):
    session = store.destroy(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="unknown session_id")
    return _to_response(session)
