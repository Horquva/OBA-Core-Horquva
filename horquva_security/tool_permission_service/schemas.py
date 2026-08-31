from __future__ import annotations
from typing import Any
from pydantic import BaseModel, Field
from ai_security_common import TrustLevel


class RegisterToolRequest(BaseModel):
    tool_id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    trust_tier: TrustLevel = TrustLevel.STANDARD
    allowed_capabilities: list[str] = Field(default_factory=list)


class BindAgentToolRequest(BaseModel):
    agent_id: str
    tool_id: str
    capabilities: list[str]  # subset of the tool's allowed_capabilities this agent may use


class AuthorizeToolCallRequest(BaseModel):
    agent_id: str
    tool_id: str
    capability: str
    params: dict[str, Any] = Field(default_factory=dict)


class ToolCallDecision(BaseModel):
    correlation_id: str
    agent_id: str
    tool_id: str
    capability: str
    allowed: bool
    reason: str
