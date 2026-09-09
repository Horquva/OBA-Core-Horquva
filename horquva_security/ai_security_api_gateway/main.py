from __future__ import annotations
import logging, uuid
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import JSONResponse

from ai_security_common import AuthorizationError

from .auth import ApiKeyRegistry, TokenBucketRateLimiter, require_agent
from .config import ROUTES, service_base_url

logger = logging.getLogger("ai_security_api_gateway")
logging.basicConfig(level=logging.INFO)
SERVICE_NAME = "ai-security-api-gateway"

key_registry = ApiKeyRegistry()
rate_limiter = TokenBucketRateLimiter()

# Kept as a module-level attribute (not a constant) so tests can swap in
# an httpx.AsyncClient bound to an in-process ASGITransport instead of
# making real network calls.
http_client: httpx.AsyncClient = httpx.AsyncClient(timeout=10.0)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("%s starting up", SERVICE_NAME)
    yield
    await http_client.aclose()


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


# --- key issuance -----------------------------------------------------
# In real deployment this endpoint itself would be locked down to
# operators only / driven by agent-identity-service registration. Kept
# open here since W3 doesn't include an operator-auth service.
@app.post("/gateway/issue-key")
async def issue_key(agent_id: str):
    key = key_registry.issue(agent_id)
    return {"agent_id": agent_id, "api_key": key}


# --- kill-switch check helper ------------------------------------------
async def _is_killed(agent_id: str) -> tuple[bool, str]:
    base = service_base_url("kill-switch-controller")
    try:
        resp = await http_client.get(f"{base}/kill-switch/{agent_id}/is-blocked")
        resp.raise_for_status()
        body = resp.json()
        return body["blocked"], body["reason"]
    except httpx.HTTPError:
        # Fail CLOSED: if we can't confirm the agent isn't killed, don't forward.
        return True, "kill-switch-controller unreachable — failing closed"


# --- generic reverse proxy ---------------------------------------------
@app.api_route("/{prefix}/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy(prefix: str, path: str, request: Request):
    cid = getattr(request.state, "correlation_id", str(uuid.uuid4()))

    service_name = ROUTES.get(prefix)
    if service_name is None:
        raise HTTPException(status_code=404, detail=f"no route registered for prefix '{prefix}'")

    api_key = request.headers.get("x-api-key")
    try:
        agent_id = require_agent(api_key, key_registry)
    except AuthorizationError as exc:
        raise HTTPException(status_code=401, detail=exc.message)

    if not rate_limiter.allow(agent_id):
        raise HTTPException(status_code=429, detail="rate limit exceeded")

    killed, reason = await _is_killed(agent_id)
    if killed:
        raise HTTPException(status_code=423, detail=f"agent is blocked by kill-switch: {reason}")

    base = service_base_url(service_name)
    body = await request.body()
    upstream_resp = await http_client.request(
        request.method,
        f"{base}/{prefix}/{path}",
        content=body,
        params=request.query_params,
        headers={"x-correlation-id": cid, "content-type": request.headers.get("content-type", "application/json")},
    )
    return Response(
        content=upstream_resp.content,
        status_code=upstream_resp.status_code,
        headers={"x-correlation-id": cid, "content-type": upstream_resp.headers.get("content-type", "application/json")},
    )
