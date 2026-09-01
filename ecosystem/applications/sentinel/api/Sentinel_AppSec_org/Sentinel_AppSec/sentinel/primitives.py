import hashlib
import base64
import json
from typing import Any

class SharedSecurityPrimitives:
    """
    Task 17: Shared Application Security Library.
    Provides verified, reusable secure primitives to prevent insecure ad-hoc implementations.
    """

    @staticmethod
    def hash_sensitive_data(data: str) -> str:
        """
        Hashing utility using SHA-256. 
        Provides a standard way to one-way hash data across the application.
        """
        if not data:
            return ""
        return hashlib.sha256(data.encode('utf-8')).hexdigest()

    @staticmethod
    def safe_base64_encode(data: str) -> str:
        """
        Encoding utility. 
        Provides URL-safe Base64 encoding for safe transport of parameters.
        """
        if not data:
            return ""
        return base64.urlsafe_b64encode(data.encode('utf-8')).decode('utf-8')

    @staticmethod
    def safe_serialize(payload: Any) -> str:
        """
        Secure serialization. 
        Safely converts objects to JSON strings, catching type errors to prevent crashes.
        """
        try:
            return json.dumps(payload, default=str)
        except (TypeError, ValueError):
            return '{"error": "serialization_failed", "message": "Object could not be safely serialized"}'