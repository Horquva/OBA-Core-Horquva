"""
context-memory-isolation-service

Enforces tenant/session/context/memory ownership boundaries: read/write
boundaries, expiration, deletion, and rejection of unauthorized access.
"No cross-tenant or cross-session memory leakage" is the hard rule this
service exists to guarantee.
"""
