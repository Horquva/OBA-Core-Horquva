import json
from typing import Any, Dict
from sentinel.context import SentinelSecurityException

MAX_PAYLOAD_SIZE = 1_048_576  # 1 MB


class SchemaValidator:
    """Validates structural constraints and rejects oversized or malformed payloads."""

    @staticmethod
    def validate_payload_size(raw_body: bytes) -> None:
        if len(raw_body) > MAX_PAYLOAD_SIZE:
            raise SentinelSecurityException(
                f"Payload size {len(raw_body)} bytes exceeds allowed limit of {MAX_PAYLOAD_SIZE} bytes",
                status_code=413,
                error_code="PAYLOAD_TOO_LARGE"
            )

    @staticmethod
    def parse_and_validate_json(raw_body: bytes) -> Dict[str, Any]:
        if not raw_body:
            return {}
        try:
            return json.loads(raw_body.decode("utf-8"))
        except UnicodeDecodeError:
            raise SentinelSecurityException("Invalid payload encoding, UTF-8 required", status_code=400, error_code="INVALID_ENCODING")
        except json.JSONDecodeError:
            raise SentinelSecurityException("Malformed JSON payload structure", status_code=400, error_code="MALFORMED_JSON")