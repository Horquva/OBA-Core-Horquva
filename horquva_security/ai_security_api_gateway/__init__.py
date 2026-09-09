"""
ai-security-api-gateway

The single entry point every agent action goes through. Owns:
  - agent authentication (API-key based, backed by agent-identity-service
    conceptually — here it checks a local registry of issued keys)
  - rate limiting (per-agent token bucket)
  - kill-switch enforcement (checked before every forwarded request)
  - routing to the correct downstream service
  - correlation id propagation
  - a single normalized error contract for the whole platform

Downstream services are NOT reimplemented here — this proxies to them
over HTTP using configurable base URLs (see config.py).
"""
