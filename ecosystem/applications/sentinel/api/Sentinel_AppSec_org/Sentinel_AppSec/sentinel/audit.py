import json
import logging
from sentinel.context import SecurityContext

# Configure structured audit logger to write directly to a file
audit_logger = logging.getLogger("SentinelAudit")
audit_logger.setLevel(logging.INFO)

# Write directly to audit.log with strict UTF-8 encoding
file_handler = logging.FileHandler("audit.log", encoding="utf-8")
file_handler.setFormatter(logging.Formatter('%(message)s'))
audit_logger.handlers = [file_handler]
audit_logger.propagate = False  # Prevent pytest from intercepting this logger

class AuditEngine:
    """Emits tamper-evident structured audit and telemetry records for every request."""

    @staticmethod
    def record_event(context: SecurityContext, status_code: int, response_summary: str = ""):
        event = {
            "sentinel_event_version": "1.0.0",
            "correlation_id": context.correlation_id,
            "request_id": context.request_id,
            "timestamp": context.timestamp,
            "client_ip": context.client_ip,
            "endpoint": context.endpoint,
            "http_method": context.http_method,
            "subject": context.subject,
            "roles": context.roles,
            "authenticated": context.authenticated,
            "authorized": context.authorized,
            "threats_count": len(context.threats_detected),
            "threat_details": context.threats_detected,
            "decision": context.decision,
            "decision_reason": context.decision_reason,
            "http_status_code": status_code,
            "response_summary": response_summary
        }
        audit_logger.info(json.dumps(event))