from __future__ import annotations
import logging, uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from .schemas import DeleteMemoryRequest, MemoryAccessResult, ReadMemoryRequest, WriteMemoryRequest
from .store import MemoryStore

logger = logging.getLogger("context_memory_isolation_service")
logging.basicConfig(level=logging.INFO)
SERVICE_NAME = "context-memory-isolation-service"

store = MemoryStore()


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


@app.post("/memory/write", status_code=204)
async def write(payload: WriteMemoryRequest):
    store.write(
        tenant_id=payload.tenant_id, session_id=payload.session_id,
        owner_agent_id=payload.owner_agent_id, key=payload.key,
        value=payload.value, ttl_seconds=payload.ttl_seconds,
    )


@app.post("/memory/read", response_model=MemoryAccessResult)
async def read(payload: ReadMemoryRequest, request: Request):
    cid = getattr(request.state, "correlation_id", None) or str(uuid.uuid4())
    ok, reason, value = store.read(
        tenant_id=payload.tenant_id, session_id=payload.session_id,
        requesting_agent_id=payload.requesting_agent_id, key=payload.key,
    )
    return MemoryAccessResult(correlation_id=cid, allowed=ok, reason=reason, value=value)


@app.post("/memory/delete", response_model=MemoryAccessResult)
async def delete(payload: DeleteMemoryRequest, request: Request):
    cid = getattr(request.state, "correlation_id", None) or str(uuid.uuid4())
    ok, reason = store.delete(
        tenant_id=payload.tenant_id, session_id=payload.session_id,
        requesting_agent_id=payload.requesting_agent_id, key=payload.key,
    )
    return MemoryAccessResult(correlation_id=cid, allowed=ok, reason=reason, value=None)
