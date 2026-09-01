import pytest
from sentinel.policy import AppSecPolicy

class TestPolicyExecution:
    """
    Task 18 - Make Application Security Policies Executable.
    Verifies that security requirements operate as executable runtime controls.
    """

    def test_policy_versioning(self):
        # Policies must be versioned assets
        assert AppSecPolicy.VERSION is not None
        assert isinstance(AppSecPolicy.VERSION, str)

    def test_method_allowlist_execution(self):
        # Verify the policy correctly governs HTTP methods
        assert AppSecPolicy.is_method_allowed("GET") is True
        assert AppSecPolicy.is_method_allowed("POST") is True
        
        # Verify malicious or unsupported methods are rejected by policy
        assert AppSecPolicy.is_method_allowed("TRACE") is False
        assert AppSecPolicy.is_method_allowed("TRACK") is False

    def test_route_exemption_execution(self):
        # Verify the policy strictly governs which routes bypass security
        assert AppSecPolicy.is_route_exempt("/health") is True
        assert AppSecPolicy.is_route_exempt("/api/v1/data") is False
        assert AppSecPolicy.is_route_exempt("/api/v1/profile") is False

    def test_output_masking_policy(self):
        # Verify sensitive fields are defined as executable controls
        assert "password" in AppSecPolicy.SENSITIVE_FIELDS
        assert "email" in AppSecPolicy.SENSITIVE_FIELDS
        
    def test_payload_limits_policy(self):
        # Verify payload limits exist to prevent Denial of Service (DoS)
        assert AppSecPolicy.MAX_PAYLOAD_SIZE_BYTES == 1048576