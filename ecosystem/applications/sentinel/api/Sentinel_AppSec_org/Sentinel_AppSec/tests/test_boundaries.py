import pytest
from sentinel.registry import SentinelServiceRegistry
from sentinel.context import SentinelSecurityException

class TestCrossPlatformBoundaries:
    """
    Tasks 19, 20, 21 - Verify Application Security relies on upstream platforms.
    """

    def test_ai_guardrail_enforcement(self):
        # Task 20: Valid AI request with passing guardrail
        valid_ai_headers = {"x-sentinel-ai-client": "true", "x-ai-guardrail-decision": "ALLOW"}
        # Should execute silently without throwing an exception
        SentinelServiceRegistry.enforce_ai_guardrail(valid_ai_headers)
        
        # Task 20: AI request that bypassed or failed the guardrail must be blocked
        invalid_ai_headers = {"x-sentinel-ai-client": "true", "x-ai-guardrail-decision": "DENY"}
        with pytest.raises(SentinelSecurityException) as exc:
            SentinelServiceRegistry.enforce_ai_guardrail(invalid_ai_headers)
        
        assert exc.value.error_code == "AI_GUARDRAIL_REJECTED"
        assert exc.value.status_code == 403

    def test_infrastructure_trust_enforcement(self):
        # Task 21: Valid infrastructure request containing Ali's workload ID
        valid_infra_headers = {"x-workload-identity": "sentinel-production-cluster-01"}
        SentinelServiceRegistry.enforce_infrastructure_trust(valid_infra_headers)
        
        # Task 21: Missing workload identity must fail closed
        invalid_infra_headers = {}  # Empty headers simulating an untrusted source
        with pytest.raises(SentinelSecurityException) as exc:
            SentinelServiceRegistry.enforce_infrastructure_trust(invalid_infra_headers)
            
        assert exc.value.error_code == "INFRASTRUCTURE_UNTRUSTED"
        assert exc.value.status_code == 401