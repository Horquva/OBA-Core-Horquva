import re
from typing import Any, Dict, List

# Regular expressions for data masking
EMAIL_REGEX = re.compile(r"([a-zA-Z0-9_.+-]+)@([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)")
CREDIT_CARD_REGEX = re.compile(r"\b(?:\d{4}[-\s]?){3}\d{4}\b")
SSN_REGEX = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")
SENSITIVE_KEYS = {"password", "secret", "token", "access_token", "api_key", "private_key"}


class OutputSanitizer:
    """Masks PII, strips credentials, and ensures strict security headers on output."""

    @classmethod
    def mask_text(cls, text: str) -> str:
        # Mask emails: user@domain.com -> u***@domain.com
        text = EMAIL_REGEX.sub(r"\1***@\2", text)
        # Mask credit cards
        text = CREDIT_CARD_REGEX.sub("****-****-****-****", text)
        # Mask SSNs
        text = SSN_REGEX.sub("***-**-****", text)
        return text

    @classmethod
    def sanitize_data(cls, data: Any) -> Any:
        if isinstance(data, str):
            return cls.mask_text(data)
        elif isinstance(data, dict):
            clean_dict = {}
            for k, v in data.items():
                if str(k).lower() in SENSITIVE_KEYS:
                    clean_dict[k] = "[REDACTED_BY_SENTINEL]"
                else:
                    clean_dict[k] = cls.sanitize_data(v)
            return clean_dict
        elif isinstance(data, list):
            return [cls.sanitize_data(item) for item in data]
        return data

    @staticmethod
    def get_security_headers() -> Dict[str, str]:
        return {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none';",
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"
        }