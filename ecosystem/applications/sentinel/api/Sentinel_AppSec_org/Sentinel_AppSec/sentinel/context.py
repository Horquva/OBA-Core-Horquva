import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone


class SentinelSecurityException(Exception):
    """Base exception for all security violations."""
    def __init__(self, message: str, status_code: int = 403, error_code: str = "SEC_VIOLATION"):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code


class FailClosedException(SentinelSecurityException):
    """Triggered when an internal security failure occurs to prevent security bypass."""
    def __init__(self, message: str = "Security subsystem failure: Fail-Closed enforced"):
        super().__init__(message=message, status_code=500, error_code="FAIL_CLOSED")


@dataclass
class SecurityContext:
    correlation_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    request_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    client_ip: str = "0.0.0.0"
    endpoint: str = ""
    http_method: str = ""
    authenticated: bool = False
    subject: Optional[str] = None
    roles: List[str] = field(default_factory=list)
    claims: Dict[str, Any] = field(default_factory=dict)
    authorized: bool = False
    threats_detected: List[Dict[str, Any]] = field(default_factory=list)
    decision: str = "PENDING"
    decision_reason: str = "Evaluation in progress"