
### Status

Accepted

### Decision

W2 shall implement a mandatory application-security interception boundary between untrusted application traffic and protected application business logic.

For applicable HTTP applications, this boundary shall be implemented through W2 security middleware.

For applicable gRPC applications, this boundary shall be implemented through W2 gRPC interceptors.

The W2 interception layer shall establish the security-processing context and invoke the applicable identity, authorization, schema-validation, threat-detection, security-decision, audit, and telemetry controls before protected business logic is permitted to execute.

### Rationale

The W2 source architecture explicitly defines the Security Middleware Interceptor as the central application-security interception layer and requires it to become the mandatory security boundary between untrusted application traffic and protected application logic. It also requires HTTP middleware and gRPC interceptors where applicable.

The source further requires every applicable request to follow the defined security lifecycle and prohibits silent bypass of that lifecycle.

### Consequences

1. Protected business logic shall not be directly reachable through an integration path that bypasses required W2 security controls.
2. HTTP applications require a governed W2 middleware integration.
3. Applicable gRPC applications require a governed W2 interceptor integration.
4. W2 must provide a consistent security context across supported application integration patterns.
5. Middleware bypass testing becomes a mandatory security-validation requirement.
6. The exact Kubernetes deployment and middleware distribution model remains a separate architectural decision.

### Not Decided By This ADR

This decision does not determine:

* whether W2 also uses an API gateway;
* whether W2 uses sidecars;
* Kubernetes deployment topology;
* service-mesh architecture;
* exact middleware packaging;
* application onboarding automation;
* exact W2 runtime process boundaries.

Those decisions require separate architecture specifications.



##  W2 Security Context

W2 shall establish a security context for each applicable protected request.

The security context shall provide a consistent representation of the security-relevant identity, authorization, request, control, decision, and traceability information required throughout the W2 request lifecycle.

**Context Creation**

The W2 security middleware shall create the initial security context when an applicable request enters the W2 security boundary.

The context shall be established before protected business logic is executed.

**Correlation**

W2 shall generate or propagate a correlation identifier for each applicable request.

The correlation identifier shall allow security processing, application processing, audit events, telemetry, and evidence associated with the request to be correlated.

**Identity Context**

The security context shall contain the validated identity information required for application-security enforcement.

Identity information shall originate from the authoritative Identity mechanism and shall not be treated as trusted solely because it was supplied by the requesting party.

W2 shall validate applicable identity requirements before establishing authenticated identity within the security context.

**Authorization Context**

The security context shall contain the information required to construct and evaluate the applicable authorization request.

The authorization context shall include, where applicable:

* Subject
* Resource
* Action
* Approved environment or contextual attributes

Authentication state shall not be interpreted as authorization.

**Security Metadata**

The security context shall carry the security metadata required to support enforcement, observability, audit, and evidence.

Applicable metadata shall include sufficient information to associate security activity with the relevant application, service, endpoint, resource, operation, environment, policy or rule, decision, timestamp, and result.

**Control Results**

The security context shall maintain the applicable results of security controls executed during the request lifecycle.

These may include:

* Identity validation result
* Authorization result
* Schema validation result
* Threat-detection result
* Applicable rule information
* Applicable policy information
* Final security decision

Control results shall be available to the components responsible for enforcement, auditing, telemetry, and evidence.

**Decision Context**

Where applicable, W2 shall retain the inputs necessary to explain and reproduce the resulting security decision.

The decision context shall support traceability to the request, identity, endpoint, resource, action, schema result, threat result, rule or policy, final decision, timestamp, environment, service, and result.

**Context Integrity**

Security context values shall not be accepted as authoritative merely because they originate from an untrusted request.

Identity, authorization decisions, security-control results, and other security-sensitive context values shall be established from validated or authoritative sources.

Malformed, inconsistent, corrupted, or otherwise invalid security context shall not permit protected business logic to execute.

**Context Propagation**

W2 shall propagate the security context or its required security metadata across applicable middleware, service, interceptor, audit, telemetry, and application integration boundaries.

Propagation mechanisms shall preserve the integrity and traceability of security-relevant context.

**Context Ownership**

The W2 security context is an enforcement and correlation construct and shall not become a competing source of truth for identity or authorization policy.

Identity remains authoritative for identity trust.

The Policy Engine remains authoritative for authorization policy and applicable authorization decisions.

W2 consumes, validates, propagates, and enforces the applicable security information at the application boundary.
