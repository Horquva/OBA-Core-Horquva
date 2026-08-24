from __future__ import annotations
import logging, uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

from ai_security_common import AuthorizationError

from .schemas import IsBlockedResponse, KillSwitchStatusResponse, ResetRequest, TripRequest
from .store import KillSwitchStore

logger = logging.getLogger("kill_switch_controller")
logging.basicConfig(level=logging.INFO)
SERVICE_NAME = "kill-switch-controller"

store = KillSwitchStore()


def _to_response(sw) -> KillSwitchStatusResponse:
    return KillSwitchStatusResponse(scope=sw.scope, state=sw.state, tripped_at=sw.tripped_at,
                                     tripped_by=sw.tripped_by, reason=sw.reason)


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


@app.post("/kill-switch/trip", response_model=KillSwitchStatusResponse)
async def trip(payload: TripRequest):
    sw = store.trip(scope=payload.scope, tripped_by=payload.tripped_by, reason=payload.reason)
    return _to_response(sw)


@app.post("/kill-switch/{scope}/reset", response_model=KillSwitchStatusResponse)
async def reset(scope: str, payload: ResetRequest):
    try:
        sw = store.reset(scope=scope, reset_by=payload.reset_by)
    except AuthorizationError as exc:
        raise HTTPException(status_code=403, detail=exc.message)
    return _to_response(sw)


@app.get("/kill-switch/{scope}/status", response_model=KillSwitchStatusResponse)
async def status(scope: str):
    return _to_response(store.status(scope))


@app.get("/kill-switch/{scope}/is-blocked", response_model=IsBlockedResponse)
async def is_blocked(scope: str):
    blocked, reason = store.is_blocked(scope)
    return IsBlockedResponse(scope=scope, blocked=blocked, reason=reason)
