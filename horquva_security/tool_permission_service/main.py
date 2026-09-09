from __future__ import annotations
import logging, uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

from ai_security_common import ToolDescriptor

from .schemas import (
    AuthorizeToolCallRequest, BindAgentToolRequest, RegisterToolRequest, ToolCallDecision,
)
from .store import ToolPermissionStore

logger = logging.getLogger("tool_permission_service")
logging.basicConfig(level=logging.INFO)
SERVICE_NAME = "tool-permission-service"

store = ToolPermissionStore()


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


@app.post("/tools/register", status_code=201)
async def register_tool(payload: RegisterToolRequest):
    store.register_tool(ToolDescriptor(
        tool_id=payload.tool_id, name=payload.name,
        trust_tier=payload.trust_tier, allowed_capabilities=payload.allowed_capabilities,
    ))
    return {"tool_id": payload.tool_id}


@app.post("/tools/bind", status_code=204)
async def bind(payload: BindAgentToolRequest):
    try:
        store.bind(payload.agent_id, payload.tool_id, payload.capabilities)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/tools/authorize-call", response_model=ToolCallDecision)
async def authorize_call(payload: AuthorizeToolCallRequest, request: Request):
    cid = getattr(request.state, "correlation_id", None) or str(uuid.uuid4())
    tool = store.get_tool(payload.tool_id)

    if tool is None:
        return ToolCallDecision(correlation_id=cid, agent_id=payload.agent_id, tool_id=payload.tool_id,
                                 capability=payload.capability, allowed=False, reason="tool is not registered")

    bound = store.bound_capabilities(payload.agent_id, payload.tool_id)
    if payload.capability not in bound:
        return ToolCallDecision(correlation_id=cid, agent_id=payload.agent_id, tool_id=payload.tool_id,
                                 capability=payload.capability, allowed=False,
                                 reason=f"agent is not bound to capability '{payload.capability}' on this tool")

    return ToolCallDecision(correlation_id=cid, agent_id=payload.agent_id, tool_id=payload.tool_id,
                             capability=payload.capability, allowed=True,
                             reason="agent is bound to this capability on this tool")
