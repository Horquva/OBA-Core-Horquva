from __future__ import annotations
import logging, uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

from ai_security_common import AuthorizationError

from .schemas import ApprovalResponse, CreateApprovalRequest, DecideApprovalRequest
from .store import ApprovalStore

logger = logging.getLogger("human_approval_service")
logging.basicConfig(level=logging.INFO)
SERVICE_NAME = "human-approval-service"

store = ApprovalStore()


def _to_response(req) -> ApprovalResponse:
    return ApprovalResponse(approval_id=req.approval_id, agent_id=req.agent_id, action=req.action,
                             risk=req.risk, state=req.state, decided_by=req.decided_by, reason=req.reason)


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


@app.post("/approvals", response_model=ApprovalResponse, status_code=201)
async def create(payload: CreateApprovalRequest):
    req = store.create(agent_id=payload.agent_id, action=payload.action, risk=payload.risk)
    return _to_response(req)


@app.get("/approvals/{approval_id}", response_model=ApprovalResponse)
async def get(approval_id: str):
    req = store.get(approval_id)
    if req is None:
        raise HTTPException(status_code=404, detail="unknown approval_id")
    return _to_response(req)


@app.post("/approvals/{approval_id}/decide", response_model=ApprovalResponse)
async def decide(approval_id: str, payload: DecideApprovalRequest):
    try:
        req = store.decide(approval_id, decided_by=payload.decided_by,
                            approve=payload.approve, reason=payload.reason)
    except KeyError:
        raise HTTPException(status_code=404, detail="unknown approval_id")
    except AuthorizationError as exc:
        raise HTTPException(status_code=403, detail=exc.message)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    return _to_response(req)
