"""
In-memory agent registry — swap for a persistent store before
production use. Kept intentionally simple/synchronous since this is
the reference implementation of the service's behavior/contract.
"""

from __future__ import annotations
from datetime import datetime, timedelta, timezone
from typing import Optional
import secrets

from ai_security_common import AgentIdentity, TrustLevel

_REVERIFICATION_INTERVAL = timedelta(hours=24)


class AgentIdentityStore:
    def __init__(self) -> None:
        self._agents: dict[str, AgentIdentity] = {}
        self._credentials: dict[str, str] = {}  # agent_id -> credential secret (hashed in real impl)
        self._credential_issued_at: dict[str, datetime] = {}

    def register(self, *, agent_id: str, display_name: str, owner: str,
                 trust_level: TrustLevel = TrustLevel.STANDARD) -> tuple[AgentIdentity, str]:
        if agent_id in self._agents:
            raise ValueError(f"agent_id '{agent_id}' already registered")
        identity = AgentIdentity(agent_id=agent_id, display_name=display_name,
                                  owner=owner, trust_level=trust_level)
        self._agents[agent_id] = identity
        credential = self._issue_credential(agent_id)
        return identity, credential

    def _issue_credential(self, agent_id: str) -> str:
        credential = secrets.token_urlsafe(32)
        self._credentials[agent_id] = credential
        self._credential_issued_at[agent_id] = datetime.now(timezone.utc)
        return credential

    def rotate_credential(self, agent_id: str) -> str:
        self._require(agent_id)
        return self._issue_credential(agent_id)

    def get(self, agent_id: str) -> Optional[AgentIdentity]:
        return self._agents.get(agent_id)

    def _require(self, agent_id: str) -> AgentIdentity:
        agent = self._agents.get(agent_id)
        if agent is None:
            raise KeyError(f"unknown agent_id '{agent_id}'")
        return agent

    def verify_credential(self, agent_id: str, credential: str) -> bool:
        return self._credentials.get(agent_id) == credential

    def mark_verified(self, agent_id: str) -> AgentIdentity:
        agent = self._require(agent_id)
        agent.last_verified_at = datetime.now(timezone.utc)
        return agent

    def needs_reverification(self, agent_id: str) -> bool:
        agent = self._require(agent_id)
        if agent.last_verified_at is None:
            return True
        return datetime.now(timezone.utc) - agent.last_verified_at > _REVERIFICATION_INTERVAL

    def deactivate(self, agent_id: str) -> AgentIdentity:
        agent = self._require(agent_id)
        agent.active = False
        return agent

    def reactivate(self, agent_id: str) -> AgentIdentity:
        agent = self._require(agent_id)
        agent.active = True
        return agent
