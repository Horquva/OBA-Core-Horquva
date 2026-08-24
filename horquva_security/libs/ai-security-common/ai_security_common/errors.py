"""Common security errors — machine-readable error contract shared by every service."""

from __future__ import annotations


class SecurityError(Exception):
    """Base class for all AI-security-domain errors."""

    code = "security_error"

    def __init__(self, message: str, *, details: dict | None = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}

    def to_dict(self) -> dict:
        return {"code": self.code, "message": self.message, "details": self.details}


class ValidationError(SecurityError):
    code = "validation_error"


class AuthorizationError(SecurityError):
    code = "authorization_denied"


class NotFoundError(SecurityError):
    code = "not_found"
