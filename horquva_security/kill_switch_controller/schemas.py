from __future__ import annotations
from datetime import datetime
from pydantic import BaseModel, Field
from ai_security_common import KillSwitchState


class TripRequest(BaseModel):
    scope: str = Field(min_length=1, description="'global' or an agent_id/task_id")
    tripped_by: str = Field(min_length=1)
    reason: str = Field(min_length=1)


class ResetRequest(BaseModel):
    reset_by: str = Field(min_length=1)


class KillSwitchStatusResponse(BaseModel):
    scope: str
    state: KillSwitchState
    tripped_at: datetime | None = None
    tripped_by: str | None = None
    reason: str | None = None


class IsBlockedResponse(BaseModel):
    scope: str
    blocked: bool
    reason: str
