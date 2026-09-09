from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, Field


class PromptSecurityRequest(BaseModel):
    agent_id: str = Field(min_length=1)
    session_id: str = Field(min_length=1)
    prompt: str = Field(min_length=1, max_length=200_000)
    source: str = Field(default="user", description="user | retrieved_document | tool_output | system")


class PromptSecurityFinding(BaseModel):
    finding_type: str  # direct_injection | indirect_injection | instruction_conflict | suspicious_pattern
    confidence: float = Field(ge=0.0, le=1.0)
    detail: str
    matched_snippet: Optional[str] = None


class PromptSecurityResult(BaseModel):
    correlation_id: str
    agent_id: str
    session_id: str
    is_safe: bool
    findings: list[PromptSecurityFinding]
    sanitized_prompt: str
