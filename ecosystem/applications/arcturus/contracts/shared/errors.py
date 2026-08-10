"""
Shared Arcturus error taxonomy.
Business-rule and integration failures should raise these typed errors
instead of generic exceptions (ValueError, RuntimeError, etc).
"""


class ArcturusError(Exception):
    """Base class for every typed Arcturus failure."""


class SchemaViolation(ArcturusError):
    """Pydantic-level validation failure."""


class BusinessRuleViolation(ArcturusError):
    """Valid schema, invalid domain state."""


class IntegrationFailure(ArcturusError):
    """A cross-platform contract could not be parsed or reconciled."""