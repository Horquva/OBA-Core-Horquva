# sentinel/decision.py
import json
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field

class DecisionOutcome(str, Enum):
    ALLOW = "ALLOW"
    BLOCK = "BLOCK"
    REQUIRE_ADDITIONAL_SECURITY_CONTROL = "REQUIRE ADDITIONAL SECURITY CONTROL"
    ESCALATE = "ESCALATE"

class SecurityDecision(BaseModel):
    # Context
    request_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    environment: str = "production"
    service: str = "sentinel_appsec"
    
    # Request Details
    identity: str
    endpoint: str
    resource: str
    action: str
    
    # Engine Results
    schema_result: str
    threat_result: str
    rule_id: Optional[str] = None
    severity: Optional[str] = None
    
    # Outcomes
    policy_decision: str
    final_decision: DecisionOutcome
    result: str 
    
    def to_audit_log(self) -> str:
        """Outputs the decision as a highly structured JSON string for SIEM ingestion."""
        return self.model_dump_json()