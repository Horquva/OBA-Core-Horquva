"""
In-memory context/memory store, partitioned by (tenant_id, session_id).
Every read/write/delete MUST supply the same partition key the entry
was written under, and only the owning agent (or same-session agents
if explicitly widened later) may access it. Swap for a persistent,
encrypted-at-rest store before production use.
"""
from __future__ import annotations
from datetime import datetime, timedelta, timezone
from typing import Any, Optional


class _Entry:
    def __init__(self, owner_agent_id: str, value: dict[str, Any], ttl_seconds: Optional[int]):
        self.owner_agent_id = owner_agent_id
        self.value = value
        self.written_at = datetime.now(timezone.utc)
        self.expires_at = self.written_at + timedelta(seconds=ttl_seconds) if ttl_seconds else None

    def is_expired(self) -> bool:
        return self.expires_at is not None and datetime.now(timezone.utc) >= self.expires_at


class MemoryStore:
    def __init__(self) -> None:
        # (tenant_id, session_id, key) -> _Entry
        self._data: dict[tuple[str, str, str], _Entry] = {}

    def write(self, *, tenant_id: str, session_id: str, owner_agent_id: str,
               key: str, value: dict[str, Any], ttl_seconds: Optional[int]) -> None:
        self._data[(tenant_id, session_id, key)] = _Entry(owner_agent_id, value, ttl_seconds)

    def read(self, *, tenant_id: str, session_id: str, requesting_agent_id: str,
              key: str) -> tuple[bool, str, Optional[dict[str, Any]]]:
        entry = self._data.get((tenant_id, session_id, key))
        if entry is None:
            return False, "no such key in this tenant/session partition", None
        if entry.is_expired():
            del self._data[(tenant_id, session_id, key)]
            return False, "entry expired", None
        if entry.owner_agent_id != requesting_agent_id:
            return False, "requesting agent does not own this memory entry", None
        return True, "ok", entry.value

    def delete(self, *, tenant_id: str, session_id: str, requesting_agent_id: str, key: str) -> tuple[bool, str]:
        entry = self._data.get((tenant_id, session_id, key))
        if entry is None:
            return False, "no such key in this tenant/session partition"
        if entry.owner_agent_id != requesting_agent_id:
            return False, "requesting agent does not own this memory entry"
        del self._data[(tenant_id, session_id, key)]
        return True, "deleted"

    def cross_partition_probe_would_leak(self, *, tenant_id: str, session_id: str, key: str) -> bool:
        """Used only by tests to assert isolation holds across tenants/sessions."""
        return (tenant_id, session_id, key) in self._data
