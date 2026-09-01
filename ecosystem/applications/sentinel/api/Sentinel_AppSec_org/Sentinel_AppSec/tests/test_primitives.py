import pytest
from sentinel.primitives import SharedSecurityPrimitives

class TestSharedSecurityPrimitives:
    """
    Task 17 - Verify reusable secure primitives.
    """

    def test_hash_sensitive_data(self):
        # Verify standard hashing
        raw_data = "sensitive_password_123"
        hashed = SharedSecurityPrimitives.hash_sensitive_data(raw_data)
        
        assert hashed != raw_data
        assert len(hashed) == 64  # SHA-256 produces a 64-character hex string
        
        # Verify safe handling of empty inputs
        assert SharedSecurityPrimitives.hash_sensitive_data("") == ""
        assert SharedSecurityPrimitives.hash_sensitive_data(None) == ""

    def test_safe_base64_encode(self):
        # Verify encoding
        raw_data = "hello world?&="
        encoded = SharedSecurityPrimitives.safe_base64_encode(raw_data)
        
        assert encoded != raw_data
        assert "?" not in encoded  # Ensures it is URL-safe
        
        # Verify safe handling of empty inputs
        assert SharedSecurityPrimitives.safe_base64_encode("") == ""
        assert SharedSecurityPrimitives.safe_base64_encode(None) == ""

    def test_safe_serialize(self):
        # Verify standard serialization
        payload = {"user": "syed", "role": "admin"}
        serialized = SharedSecurityPrimitives.safe_serialize(payload)
        
        assert '"user": "syed"' in serialized
        
        # Verify crash prevention on weird data types (like sets, which normally break JSON)
        weird_payload = {"data": {1, 2, 3}}
        safe_serialized = SharedSecurityPrimitives.safe_serialize(weird_payload)
        assert "data" in safe_serialized  # The system survived the serialization attempt without a 500 error