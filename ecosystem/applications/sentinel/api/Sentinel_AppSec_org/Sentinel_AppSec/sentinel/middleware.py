import json
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from sentinel.context import SecurityContext, SentinelSecurityException, FailClosedException
from sentinel.identity import IdentityVerifier
from sentinel.authz import PolicyEngine
from sentinel.schema_validator import SchemaValidator
from sentinel.threat_engine import ThreatDetectionEngine
from sentinel.decision_engine import SecurityDecisionEngine
from sentinel.output_protection import OutputSanitizer
from sentinel.audit import AuditEngine

# Endpoints exempt from authentication (e.g., health check)
EXEMPT_ROUTES = {"/health", "/docs", "/openapi.json"}


class SentinelSecurityMiddleware(BaseHTTPMiddleware):
    """The central Application Security Control Plane interceptor."""

    def __init__(self, app):
        super().__init__(app)
        self.identity_verifier = IdentityVerifier()
        self.policy_engine = PolicyEngine()
        self.threat_engine = ThreatDetectionEngine()
        self.decision_engine = SecurityDecisionEngine()



    async def dispatch(self, request: Request, call_next):
        context = SecurityContext(
            client_ip=request.client.host if request.client else "unknown",
            endpoint=request.url.path,
            http_method=request.method
        )

        try:
            # 1. Exempt Routes
            if request.url.path in EXEMPT_ROUTES:
                response = await call_next(request)
                for header, value in OutputSanitizer.get_security_headers().items():
                    if request.url.path == "/docs" and header == "Content-Security-Policy":
                        continue
                    response.headers[header] = value
                return response

            # 2. Identity Verification (Authentication)
            auth_header = request.headers.get("Authorization")
            self.identity_verifier.verify(auth_header, context)

            # 3. Authorization Enforcement
            self.policy_engine.evaluate(context)

            # 4. Schema Validation
            raw_body = await request.body()
            SchemaValidator.validate_payload_size(raw_body)
            parsed_json = SchemaValidator.parse_and_validate_json(raw_body)
            request.state.parsed_json = parsed_json

            # 5. Threat Detection
            query_params = dict(request.query_params)
            self.threat_engine.scan(query_params, parsed_json, context)

            # 6. Security Decision
            self.decision_engine.decide(context)
            request.state.security_context = context

            # 7. Business Logic
            response = await call_next(request)

            # 8. Output Protection
            response_body = [section async for section in response.body_iterator]
            full_response_bytes = b"".join(response_body)

            try:
                raw_response_json = json.loads(full_response_bytes.decode("utf-8"))
                sanitized_json = OutputSanitizer.sanitize_data(raw_response_json)
                final_response = JSONResponse(content=sanitized_json, status_code=response.status_code)
            except Exception:
                final_response = Response(content=full_response_bytes, status_code=response.status_code, media_type=response.media_type)

            for header, value in OutputSanitizer.get_security_headers().items():
                final_response.headers[header] = value
            final_response.headers["X-Correlation-ID"] = context.correlation_id

            # 9. Audit Event
            AuditEngine.record_event(context, final_response.status_code, "SUCCESS")
            return final_response

        except SentinelSecurityException as sse:
            AuditEngine.record_event(context, sse.status_code, sse.message)
            return self._build_error_response(sse.status_code, sse.error_code, sse.message, context.correlation_id)

        except Exception as unhandled_err:
            AuditEngine.record_event(context, 500, f"UNHANDLED_EXCEPTION: {str(unhandled_err)}")
            return self._build_error_response(500, "FAIL_CLOSED", "A security subsystem exception occurred", context.correlation_id)
             

    def _build_error_response(self, status: int, code: str, msg: str, correlation_id: str) -> JSONResponse:
        content = {
            "error": {
                "code": code,
                "message": msg,
                "correlation_id": correlation_id
            }
        }
        headers = OutputSanitizer.get_security_headers()
        headers["X-Correlation-ID"] = correlation_id
        return JSONResponse(content=content, status_code=status, headers=headers)