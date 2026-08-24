from __future__ import annotations
from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field


class CreateSandboxRequest(BaseModel):
    agent_id: str = Field(min_length=1)
    allowed_capabilities: list[str] = Field(default_factory=list)
    max_calls: int = Field(default=50, gt=0)


class SandboxSession(BaseModel):
    session_id: str
    agent_id: str
    allowed_capabilities: list[str]
    max_calls: int
    calls_made: int
    active: bool
    created_at: datetime
    destroyed_at: datetime | None = None


class RecordCallRequest(BaseModel):
    capability: str
    params: dict[str, Any] = Field(default_factory=dict)


class RecordCallResult(BaseModel):
    allowed: bool
    reason: str
    session: SandboxSession
