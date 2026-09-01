from __future__ import annotations
from typing import Any, Optional
from pydantic import BaseModel, Field


class WriteMemoryRequest(BaseModel):
    tenant_id: str = Field(min_length=1)
    session_id: str = Field(min_length=1)
    owner_agent_id: str = Field(min_length=1)
    key: str = Field(min_length=1)
    value: dict[str, Any]
    ttl_seconds: Optional[int] = None


class ReadMemoryRequest(BaseModel):
    tenant_id: str
    session_id: str
    requesting_agent_id: str
    key: str


class DeleteMemoryRequest(BaseModel):
    tenant_id: str
    session_id: str
    requesting_agent_id: str
    key: str


class MemoryAccessResult(BaseModel):
    correlation_id: str
    allowed: bool
    reason: str
    value: Optional[dict[str, Any]] = None
