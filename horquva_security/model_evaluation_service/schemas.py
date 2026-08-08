from __future__ import annotations
from pydantic import BaseModel, Field


class EvaluationSample(BaseModel):
    prompt: str
    output: str


class EvaluateModelRequest(BaseModel):
    subject_id: str = Field(min_length=1, description="model id or agent id under evaluation")
    samples: list[EvaluationSample] = Field(min_length=1)
    pass_threshold: float = Field(default=0.8, ge=0.0, le=1.0)
