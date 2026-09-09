from __future__ import annotations
import uuid
from datetime import datetime, timezone


class _Session:
    def __init__(self, agent_id: str, allowed_capabilities: list[str], max_calls: int):
        self.session_id = str(uuid.uuid4())
        self.agent_id = agent_id
        self.allowed_capabilities = set(allowed_capabilities)
        self.max_calls = max_calls
        self.calls_made = 0
        self.active = True
        self.created_at = datetime.now(timezone.utc)
        self.destroyed_at: datetime | None = None
        self.call_log: list[dict] = []


class SandboxStore:
    def __init__(self) -> None:
        self._sessions: dict[str, _Session] = {}

    def create(self, *, agent_id: str, allowed_capabilities: list[str], max_calls: int) -> _Session:
        session = _Session(agent_id, allowed_capabilities, max_calls)
        self._sessions[session.session_id] = session
        return session

    def get(self, session_id: str) -> _Session | None:
        return self._sessions.get(session_id)

    def record_call(self, session_id: str, *, capability: str, params: dict) -> tuple[bool, str, _Session | None]:
        session = self._sessions.get(session_id)
        if session is None:
            return False, "unknown session_id", None
        if not session.active:
            return False, "session is destroyed", session
        if capability not in session.allowed_capabilities:
            return False, f"capability '{capability}' not allowed in this sandbox session", session
        if session.calls_made >= session.max_calls:
            return False, "sandbox session call budget exhausted", session
        session.calls_made += 1
        session.call_log.append({"capability": capability, "params": params})
        return True, "call recorded", session

    def destroy(self, session_id: str) -> _Session | None:
        session = self._sessions.get(session_id)
        if session is None:
            return None
        session.active = False
        session.destroyed_at = datetime.now(timezone.utc)
        return session
