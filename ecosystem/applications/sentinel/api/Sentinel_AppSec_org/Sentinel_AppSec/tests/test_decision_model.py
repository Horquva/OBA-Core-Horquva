import pytest
import json
from unittest.mock import patch
from sentinel.context import SecurityContext
from sentinel.audit import AuditEngine

class TestObservabilityAndEvidence:
    """
    Tasks 14, 22, 23 - Decision Model, Event Lifecycle, and Evidence Traceability.
    Verifies that security events are normalized and contain all mandatory fields.
    """

    @patch("sentinel.audit.logging.Logger.info")
    def test_evidence_traceability_fields(self, mock_logger):
        # 1. Create a complex context simulating a blocked malicious request (Task 14)
        context = SecurityContext(
            client_ip="192.168.1.100",
            endpoint="/api/v1/financial-transfer",
            http_method="POST"
        )
        context.subject = "user-999"
        context.roles = ["standard-user"]
        context.authenticated = True
        context.decision = "BLOCK"
        context.decision_reason = "Malicious OWASP payload detected in JSON body"
        
        # 2. Generate the Normalized Security Event (Task 22)
        AuditEngine.record_event(context, 403, "THREAT_DETECTED")
        
        # 3. Intercept the JSON log output
        mock_logger.assert_called_once()
        log_call_args = mock_logger.call_args[0][0]
        event_data = json.loads(log_call_args)
        
        # 4. Verify all mandatory Traceability constraints (Task 23)
        assert event_data["sentinel_event_version"] == "1.0.0"
        assert "correlation_id" in event_data
        assert "request_id" in event_data
        assert "timestamp" in event_data
        
        # Verify Contextual Tracing
        assert event_data["client_ip"] == "192.168.1.100"
        assert event_data["endpoint"] == "/api/v1/financial-transfer"
        assert event_data["http_method"] == "POST"
        assert event_data["subject"] == "user-999"
        
        # Verify Decision & Result Tracing
        assert event_data["decision"] == "BLOCK"
        assert event_data["decision_reason"] == "Malicious OWASP payload detected in JSON body"
        assert event_data["http_status_code"] == 403
        assert event_data["response_summary"] == "THREAT_DETECTED"