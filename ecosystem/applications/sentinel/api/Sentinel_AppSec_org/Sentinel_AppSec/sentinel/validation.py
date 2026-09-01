# sentinel/validation.py
from pydantic import BaseModel, Field, ConfigDict, ValidationError
from enum import Enum
from typing import List, Optional

class DataClassification(str, Enum):
    PUBLIC = "public"
    INTERNAL = "internal"
    CONFIDENTIAL = "confidential"

class SentinelSecureModel(BaseModel):
    """Constitutional Base Schema."""
    model_config = ConfigDict(
        extra="forbid",
        strict=True,
        str_strip_whitespace=True
    )

class NestedResource(SentinelSecureModel):
    id: int = Field(..., gt=0, le=9999)
    tags: List[str] = Field(..., max_length=5)

# --- TASK 9: SCHEMA GOVERNANCE ---

class SecurePayloadRequest(SentinelSecureModel):
    """V1 Schema with strict Governance Metadata attached."""
    model_config = ConfigDict(
        extra="forbid",
        strict=True,
        str_strip_whitespace=True,
        json_schema_extra={
            "x-schema-governance": {
                "owner": "AppSec Team",
                "version": "1.0.0",
                "compatibility": "Strict - Breaking changes require new major version"
            }
        }
    )
    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_]+$")
    age: int = Field(..., ge=18, le=120)
    classification: DataClassification
    resources: List[NestedResource] = Field(..., min_length=1, max_length=10)

class SecurePayloadRequestV2(SentinelSecureModel):
    """
    V2 Schema Evolution.
    Demonstrates safe schema lifecycle by adding an OPTIONAL field.
    """
    model_config = ConfigDict(
        extra="forbid",
        strict=True,
        str_strip_whitespace=True,
        json_schema_extra={
            "x-schema-governance": {
                "owner": "AppSec Team",
                "version": "2.0.0",
                "compatibility": "Backward-compatible with V1 payloads"
            }
        }
    )
    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_]+$")
    age: int = Field(..., ge=18, le=120)
    classification: DataClassification
    resources: List[NestedResource] = Field(..., min_length=1, max_length=10)
    
    # Safe Lifecycle Evolution: New fields MUST be optional to not break V1 clients
    department: Optional[str] = Field(default=None, max_length=50)

def format_validation_error(e: ValidationError) -> dict:
    return {"error_code": "PAYLOAD_INVALID", "details": e.errors()}