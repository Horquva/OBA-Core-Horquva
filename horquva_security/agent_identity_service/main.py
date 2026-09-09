from __future__ import annotations
import logging, uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

from .schemas import (
    AgentStatusResponse, RegisterAgentRequest, RegisterAgentResponse,
    VerifyCredentialRequest, VerifyCredentialResponse,
)
from .store import AgentIdentityStore

logger = logging.getLogger("agent_identity_service")
logging.basicConfig(level=logging.INFO)
SERVICE_NAME = "agent-identity-service"

store = AgentIdentityStore()


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


@app.post("/agents/register", response_model=RegisterAgentResponse, status_code=201)
async def register(payload: RegisterAgentRequest):
    try:
        _, credential = store.register(
            agent_id=payload.agent_id, display_name=payload.display_name,
            owner=payload.owner, trust_level=payload.trust_level,
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    return RegisterAgentResponse(agent_id=payload.agent_id, credential=credential)


@app.post("/agents/rotate-credential/{agent_id}", response_model=RegisterAgentResponse)
async def rotate(agent_id: str):
    try:
        credential = store.rotate_credential(agent_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="unknown agent_id")
    return RegisterAgentResponse(agent_id=agent_id, credential=credential)


@app.post("/agents/verify", response_model=VerifyCredentialResponse)
async def verify(payload: VerifyCredentialRequest):
    agent = store.get(payload.agent_id)
    if agent is None:
        raise HTTPException(status_code=404, detail="unknown agent_id")
    ok = store.verify_credential(payload.agent_id, payload.credential)
    if ok:
        store.mark_verified(payload.agent_id)
    return VerifyCredentialResponse(
        agent_id=payload.agent_id, verified=ok,
        needs_reverification=store.needs_reverification(payload.agent_id),
    )


@app.get("/agents/{agent_id}", response_model=AgentStatusResponse)
async def status(agent_id: str):
    agent = store.get(agent_id)
    if agent is None:
        raise HTTPException(status_code=404, detail="unknown agent_id")
    return AgentStatusResponse(
        agent_id=agent.agent_id, display_name=agent.display_name, owner=agent.owner,
        trust_level=agent.trust_level, active=agent.active,
        last_verified_at=agent.last_verified_at.isoformat() if agent.last_verified_at else None,
    )


@app.post("/agents/{agent_id}/deactivate", response_model=AgentStatusResponse)
async def deactivate(agent_id: str):
    try:
        agent = store.deactivate(agent_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="unknown agent_id")
    return AgentStatusResponse(
        agent_id=agent.agent_id, display_name=agent.display_name, owner=agent.owner,
        trust_level=agent.trust_level, active=agent.active,
        last_verified_at=agent.last_verified_at.isoformat() if agent.last_verified_at else None,
    )
