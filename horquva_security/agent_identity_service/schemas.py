from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, Field
from ai_security_common import TrustLevel


class RegisterAgentRequest(BaseModel):
    agent_id: str = Field(min_length=1)
    display_name: str = Field(min_length=1)
    owner: str = Field(min_length=1)
    trust_level: TrustLevel = TrustLevel.STANDARD


class RegisterAgentResponse(BaseModel):
    agent_id: str
    credential: str  # returned exactly once, at registration/rotation time


class VerifyCredentialRequest(BaseModel):
    agent_id: str
    credential: str


class VerifyCredentialResponse(BaseModel):
    agent_id: str
    verified: bool
    needs_reverification: bool


class AgentStatusResponse(BaseModel):
    agent_id: str
    display_name: str
    owner: str
    trust_level: TrustLevel
    active: bool
    last_verified_at: Optional[str] = None
