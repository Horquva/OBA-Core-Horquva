# sentinel/output.py
import re
from typing import Any

# Regex to catch common sensitive field names
SENSITIVE_KEY_PATTERN = re.compile(r"(password|secret|token|credential|ssn|credit_card|api_key|auth|session)", re.IGNORECASE)

def secure_serializer(data: Any) -> Any:
    """
    Recursively scans dictionaries and lists, masking the values of any 
    keys that match known sensitive patterns to prevent data leakage.
    """
    if isinstance(data, dict):
        secure_dict = {}
        for key, value in data.items():
            if isinstance(key, str) and SENSITIVE_KEY_PATTERN.search(key):
                secure_dict[key] = "********"
            else:
                secure_dict[key] = secure_serializer(value)
        return secure_dict
    elif isinstance(data, list):
        return [secure_serializer(item) for item in data]
    
    return data