"""
API-key based agent authentication + per-agent token-bucket rate
limiting. This is the gateway's own lightweight check — real identity
verification still lives in agent-identity-service; the gateway keeps
a local key registry so it can reject unauthenticated calls without a
network round trip on every single request.
"""
from __future__ import annotations
import secrets
import time
from ai_security_common import AuthorizationError


class ApiKeyRegistry:
    def __init__(self) -> None:
        self._keys: dict[str, str] = {}  # api_key -> agent_id

    def issue(self, agent_id: str) -> str:
        key = secrets.token_urlsafe(24)
        self._keys[key] = agent_id
        return key

    def resolve(self, api_key: str) -> str | None:
        return self._keys.get(api_key)

    def revoke(self, api_key: str) -> None:
        self._keys.pop(api_key, None)


class TokenBucketRateLimiter:
    def __init__(self, *, capacity: int = 20, refill_per_second: float = 5.0) -> None:
        self.capacity = capacity
        self.refill_per_second = refill_per_second
        self._buckets: dict[str, tuple[float, float]] = {}  # agent_id -> (tokens, last_refill_ts)

    def allow(self, agent_id: str) -> bool:
        now = time.monotonic()
        tokens, last = self._buckets.get(agent_id, (self.capacity, now))
        tokens = min(self.capacity, tokens + (now - last) * self.refill_per_second)
        if tokens < 1:
            self._buckets[agent_id] = (tokens, now)
            return False
        self._buckets[agent_id] = (tokens - 1, now)
        return True


def require_agent(api_key: str | None, registry: ApiKeyRegistry) -> str:
    if not api_key:
        raise AuthorizationError("missing API key")
    agent_id = registry.resolve(api_key)
    if agent_id is None:
        raise AuthorizationError("invalid API key")
    return agent_id
