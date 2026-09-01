class AppSecPolicy:
    """
    Task 18: Executable Application Security Policy.
    Centralizes governing rules for the Sentinel platform.
    """
    VERSION = "1.0.0"
    
    # 1. Protected Endpoints & HTTP Methods
    ALLOWED_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"]
    EXEMPT_ROUTES = ["/health", "/docs", "/openapi.json"]
    
    # 2. Payload & Schema Limits
    MAX_PAYLOAD_SIZE_BYTES = 1048576  # 1MB limit to prevent resource exhaustion
    ALLOWED_CONTENT_TYPES = ["application/json"]
    
    # 3. Output Protection Policies
    SENSITIVE_FIELDS = ["password", "ssn", "credit_card", "token", "secret", "email"]
    
    # 4. Mandatory Security Headers
    SECURITY_HEADERS = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        "Content-Security-Policy": "default-src 'self'"
    }

    @classmethod
    def is_route_exempt(cls, path: str) -> bool:
        """Policy execution check for route exemptions."""
        return path in cls.EXEMPT_ROUTES

    @classmethod
    def is_method_allowed(cls, method: str) -> bool:
        """Policy execution check for allowed HTTP methods."""
        return method in cls.ALLOWED_METHODS