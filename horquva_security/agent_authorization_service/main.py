from __future__ import annotations
import logging, uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

from .engine import check_authorization
from .schemas import (
    AuthorizationCheckRequest, AuthorizationDecision,
    GrantRoleRequest, GrantScopedPermissionRequest,
)
from .store import AuthorizationStore

logger = logging.getLogger("agent_authorization_service")
logging.basicConfig(level=logging.INFO)
SERVICE_NAME = "agent-authorization-service"

store = AuthorizationStore()


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


@app.post("/authz/roles/grant", status_code=204)
async def grant_role(payload: GrantRoleRequest):
    try:
        store.grant_role(payload.agent_id, payload.role)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/authz/permissions/grant", status_code=201)
async def grant_permission(payload: GrantScopedPermissionRequest):
    grant = store.grant_scoped_permission(
        agent_id=payload.agent_id, resource=payload.resource, scope=payload.scope,
        temporary=payload.temporary, ttl_seconds=payload.ttl_seconds,
    )
    return {"grant_id": grant.grant_id, "expires_at": grant.expires_at}


@app.post("/authz/check", response_model=AuthorizationDecision)
async def check(payload: AuthorizationCheckRequest, request: Request):
    return check_authorization(payload, store, correlation_id=getattr(request.state, "correlation_id", None))
