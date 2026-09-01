import jwt
from sentinel.context import SecurityContext, SentinelSecurityException

# Shared constants required by the Verifier and the Pytest suite
SENTINEL_JWT_SECRET = "sentinel-production-grade-hmac-sha256-secret-key-32b"
SENTINEL_JWT_ALGORITHM = "HS256"
SENTINEL_ISSUER = "sentinel-auth-service"
SENTINEL_AUDIENCE = "sentinel-api"

class IdentityVerifier:
    def __init__(self):
        self.secret = SENTINEL_JWT_SECRET
        self.expected_issuer = SENTINEL_ISSUER
        self.expected_audience = SENTINEL_AUDIENCE
        self.algorithm = SENTINEL_JWT_ALGORITHM

    def verify(self, auth_header: str, context: SecurityContext):
        # 1. Malformed-token handling
        if not auth_header or not auth_header.startswith("Bearer "):
            raise SentinelSecurityException(
                status_code=401, 
                error_code="AUTH_MISSING", 
                message="Missing or malformed Authorization header"
            )
        
        token = auth_header.split(" ")[1]
        
        try:
            # 2. Cryptographic Validation
            payload = jwt.decode(
                token, 
                self.secret, 
                algorithms=[self.algorithm],
                issuer=self.expected_issuer,
                audience=self.expected_audience
            )
            
            # 3. Security-context construction
            context.subject = payload.get("sub")
            context.roles = payload.get("roles", [])
            context.authenticated = True
            
        # 4. Authentication failure handling
        except jwt.ExpiredSignatureError:
            raise SentinelSecurityException(
                status_code=401, 
                error_code="AUTH_EXPIRED", 
                message="Authentication token has expired"
            )
        except jwt.InvalidIssuerError:
            raise SentinelSecurityException(
                status_code=401, 
                error_code="AUTH_INVALID", 
                message="Token not issued by the approved Identity Authority"
            )
        except jwt.InvalidAudienceError:
            raise SentinelSecurityException(
                status_code=401, 
                error_code="AUTH_INVALID", 
                message="Token not intended for this application"
            )
        except jwt.InvalidTokenError as e:
            raise SentinelSecurityException(
                status_code=401, 
                error_code="AUTH_INVALID", 
                message=f"Token validation failed: {str(e)}"
            )