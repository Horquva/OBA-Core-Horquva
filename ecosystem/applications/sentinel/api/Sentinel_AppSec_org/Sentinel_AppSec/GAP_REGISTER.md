Sentinel Application Security: Implementation Gap Register
GAP-SEC-001
Gap ID: GAP-SEC-001

Description: Dynamic JWKS (JSON Web Key Set) caching and automated key rotation integration with Areeb's production Identity Authority.

Risk: High - If Areeb's service rotates cryptographic keys and the AppSec layer does not dynamically update its cache, valid user tokens will be rejected.

Owner: Application Security Architecture Team

Current State: The test harness successfully mathematically validates JWT signatures, but relies on a static public key injected during the test execution.

Impact: Potential temporary loss of system availability (false-positive blocks) during a key rotation event.

Compensating Control: The fail-closed architecture guarantees that if keys are mismatched, the system strictly blocks traffic rather than accidentally allowing forged tokens.

Priority: CRITICAL

Target Phase: Pre-Production / Staging Validation

Acceptance Criteria: The Identity middleware dynamically fetches, caches, and rotates public keys from Areeb's live JWKS endpoint without dropping active, valid requests.

GAP-SEC-002
Gap ID: GAP-SEC-002

Description: Asynchronous streaming of AuditEngine security events to the Enterprise SIEM (Security Information and Event Management) platform.

Risk: Medium - Local container logs could be lost if a pod crashes before the external log scraper collects them.

Owner: SecOps & AppSec Engineering

Current State: The AuditEngine successfully generates normalized JSON events with mandatory traceability fields (correlation_id, request_id), but currently outputs them to local stdout and the local developer dashboard.

Impact: Delayed cross-system threat correlation during a live incident.

Compensating Control: Events are structurally perfect, fully normalized, and ready for ingestion. Traceability IDs already bridge the boundary between microservices.

Priority: HIGH

Target Phase: Production Day-2 Operations

Acceptance Criteria: AuditEngine successfully fires normalized JSON logs to the external SIEM via a non-blocking, asynchronous queue (e.g., Kafka or direct API) without adding latency to the HTTP request cycle.

GAP-SEC-003
Gap ID: GAP-SEC-003

Description: Network-layer rate limiting and volumetric DDoS mitigation prior to schema validation.

Risk: Medium - Attackers could overwhelm the application layer by sending millions of complex JSON payloads, exhausting the Pydantic schema parser's CPU.

Owner: Infrastructure / API Gateway Team

Current State: The AppSec layer strictly limits individual payload sizes and depths (proven via test_input_boundaries.py), but does not limit the frequency of requests.

Impact: High CPU utilization on the Sentinel application servers during a volumetric application-layer attack.

Compensating Control: Malformed requests and nested JSON bombs are deterministically caught and dropped quickly by Layer 1 and Layer 2 defenses.

Priority: MEDIUM

Target Phase: Production Release Candidate

Acceptance Criteria: An upstream API gateway or WAF (Web Application Firewall) is configured to enforce strict rate limits (e.g., 100 requests/minute per IP/Token) before traffic hits the Sentinel middleware.

By formally documenting these gaps using the exact required structure, you prove to the architecture board that you have total visibility over the system's operational limits, fully satisfying the outcome that no Application Security gap is lost or silently ignored.