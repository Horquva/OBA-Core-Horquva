# tests/test_validation.py
import pytest
from pydantic import ValidationError
from sentinel.validation import SecurePayloadRequest,DataClassification

def get_valid_payload():
    return {
        "username": "valid_user_123",
        "age": 30,
        "classification": DataClassification.CONFIDENTIAL,
        "resources": [{"id": 101, "tags": ["prod", "secure"]}]
    }

def test_valid_payload_passes():
    payload = get_valid_payload()
    model = SecurePayloadRequest(**payload)
    assert model.username == "valid_user_123"

# --- NEGATIVE VALIDATION TESTS ---

def test_missing_required_fields():
    payload = get_valid_payload()
    del payload["username"]
    with pytest.raises(ValidationError) as exc:
        SecurePayloadRequest(**payload)
    assert "username" in str(exc.value)

def test_strict_data_types():
    payload = get_valid_payload()
    payload["age"] = "30"  # String instead of int (Strict mode forbids this)
    with pytest.raises(ValidationError):
        SecurePayloadRequest(**payload)

def test_string_and_pattern_constraints():
    payload = get_valid_payload()
    payload["username"] = "a" * 51  # Too long
    with pytest.raises(ValidationError):
        SecurePayloadRequest(**payload)
        
    payload["username"] = "invalid-chars!@"  # Fails regex pattern
    with pytest.raises(ValidationError):
        SecurePayloadRequest(**payload)

def test_numeric_constraints():
    payload = get_valid_payload()
    payload["age"] = 17  # Below minimum (18)
    with pytest.raises(ValidationError):
        SecurePayloadRequest(**payload)

def test_enumeration_validation():
    payload = get_valid_payload()
    payload["classification"] = "top-secret"  # Not in Enum
    with pytest.raises(ValidationError):
        SecurePayloadRequest(**payload)

def test_array_and_nested_object_constraints():
    payload = get_valid_payload()
    payload["resources"] = []  # Below min_items (1)
    with pytest.raises(ValidationError):
        SecurePayloadRequest(**payload)

    # Nested numeric boundary
    payload["resources"] = [{"id": 99999, "tags": []}] 
    with pytest.raises(ValidationError):
        SecurePayloadRequest(**payload)

def test_unknown_field_handling():
    payload = get_valid_payload()
    payload["malicious_injected_field"] = "admin=true"  # Extra field
    with pytest.raises(ValidationError) as exc:
        SecurePayloadRequest(**payload)
    assert "Extra inputs are not permitted" in str(exc.value)