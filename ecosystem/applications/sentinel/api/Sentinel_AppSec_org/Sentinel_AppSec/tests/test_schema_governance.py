# tests/test_schema_governance.py
import pytest
from sentinel.validation import SecurePayloadRequest, SecurePayloadRequestV2

# List of all critical schemas that must be governed
CRITICAL_SCHEMAS = [SecurePayloadRequest, SecurePayloadRequestV2]

@pytest.mark.parametrize("schema_class", CRITICAL_SCHEMAS)
def test_schema_has_governance_metadata(schema_class):
    """Audit: Every schema MUST have an owner, version, and compatibility contract."""
    schema_json = schema_class.model_json_schema()
    gov_meta = schema_json.get("x-schema-governance")
    
    assert gov_meta is not None, f"Schema {schema_class.__name__} is missing governance metadata!"
    assert "owner" in gov_meta, f"Schema {schema_class.__name__} has no defined owner."
    assert "version" in gov_meta, f"Schema {schema_class.__name__} is unversioned."
    assert "compatibility" in gov_meta, f"Schema {schema_class.__name__} missing compatibility contract."

def test_schema_evolution_compatibility():
    """
    Audit: Prove that V2 does not break V1 contracts.
    A valid V1 payload must be successfully parsed by the V2 schema.
    """
    from sentinel.validation import DataClassification
    
    v1_payload = {
        "username": "legacy_user",
        "age": 45,
        "classification": DataClassification.INTERNAL,
        "resources": [{"id": 500, "tags": ["legacy"]}]
    }
    
    # Validate V1 payload works in V1
    model_v1 = SecurePayloadRequest(**v1_payload)
    assert model_v1.username == "legacy_user"
    
    # Validate V1 payload safely evaluates in V2 without crashing (Backward compatibility)
    model_v2 = SecurePayloadRequestV2(**v1_payload)
    assert model_v2.department is None  # Defaults correctly without failing