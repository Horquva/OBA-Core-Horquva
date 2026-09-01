# tests/test_layered_security.py
import pytest
from pydantic import ValidationError
from sentinel.validation import SecurePayloadRequest, DataClassification
from sentinel.threats import ThreatDetector
from sentinel.context import SentinelSecurityException

def get_base_payload():
    return {
        "username": "valid_user_123",
        "age": 30,
        "classification": DataClassification.PUBLIC,
        "resources": [{"id": 101, "tags": ["prod"]}]
    }

# --- LAYER 1: SCHEMA VALIDATION (Type, Bounds, Strictness) ---

def test_layer1_blocks_oversized_input():
    payload = get_base_payload()
    # Attempting buffer overflow / oversized input
    payload["username"] = "A" * 10000 
    
    with pytest.raises(ValidationError) as exc:
        SecurePayloadRequest(**payload)
    assert "String should have at most 50 characters" in str(exc.value)

def test_layer1_blocks_unexpected_characters():
    payload = get_base_payload()
    # Fails the strict regex pattern defined in the schema
    payload["username"] = "user_name_!<script>"
    
    with pytest.raises(ValidationError) as exc:
        SecurePayloadRequest(**payload)
    assert "String should match pattern" in str(exc.value)


# --- LAYER 2: THREAT DETECTION (Signatures, Semantics, DOS) ---

def test_layer2_blocks_sql_injection():
        malicious_tag = "prod'; DROP TABLE users; --"
        payload = get_base_payload()
        payload["resources"][0]["tags"].append(malicious_tag)

        with pytest.raises(SentinelSecurityException) as exc:
            ThreatDetector.scan_payload(payload)
        # Enforce that the real engine returns an official OWASP ID
        assert "OWASP-" in exc.value.message

def test_layer2_blocks_xss():
    malicious_tag = "<script>alert(1)</script>"
    payload = get_base_payload()
    payload["resources"][0]["tags"].append(malicious_tag)
    
    with pytest.raises(SentinelSecurityException) as exc:
        ThreatDetector.scan_payload(payload)
    assert "XSS" in exc.value.message

def test_layer2_blocks_path_traversal():
        malicious_tag = "../../../etc/passwd"
        payload = get_base_payload()
        payload["resources"][0]["tags"].append(malicious_tag)

        with pytest.raises(SentinelSecurityException) as exc:
            ThreatDetector.scan_payload(payload)
        # Enforce the specific Path Traversal rule ID
        assert "OWASP-PT-001" in exc.value.message

def test_layer2_blocks_nested_parser_abuse():
        # Attack: Try to crash the JSON parser/memory with infinite nesting
        deep_payload = get_base_payload()
        current_level = deep_payload
        # Increase loop to 20 to successfully breach the engine's strict depth limit of > 10
        for i in range(20):  
            current_level["nested_key"] = {}
            current_level = current_level["nested_key"]

        with pytest.raises(SentinelSecurityException) as exc:
            ThreatDetector.scan_payload(deep_payload)
        assert "Payload too deep" in exc.value.message