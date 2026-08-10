## Security Context Architecture

### Purpose

W2 shall establish a controlled application security context for each protected request.

The security context shall provide trusted security state required for identity, authorization, threat detection, security decisions, audit, telemetry, and protected application processing.

### Security Context Boundary

The security context shall be established by the W2 Security Middleware/Interceptor after processing the applicable request boundary.

Security context values shall originate from trusted W2 security controls or validated application context.

Client-controlled request data shall not be treated as trusted security context.

### Security Context Contents

The security context shall support, where applicable:

* Correlation identifier
* Request context
* Application identity
* Service identity
* Authenticated subject
* Authentication state
* Authorization context
* Authorization decision
* Threat-detection results
* Security-control results
* Security decision state
* Applicable audit/evidence references

The exact runtime representation shall be defined by the implementation architecture.

### Correlation Context

The security context shall contain or reference the correlation identifier associated with the protected request.

The correlation identifier shall allow related authentication, authorization, threat-detection, security-decision, audit, telemetry, and application events to be associated with the originating request.

### Identity Context

Following successful Identity Integration, the security context shall contain the validated identity context required by downstream W2 controls.

Identity context shall represent authenticated identity established through the approved Identity Integration contract.

Unvalidated identity information shall not be placed into trusted identity context.

### Authentication State

The security context shall maintain the applicable authentication state for the request.

Authentication state shall be established by W2 security controls and shall not be inferred solely from the presence of credentials or client-provided fields.

### Authorization Context

The security context shall contain or reference the authorization information required by the Authorization Integration boundary.

Where applicable, this shall include:

* Subject context
* Resource context
* Action context
* Approved environment/context attributes
* Policy request information
* Authorization decision

### Authorization Decision

The authorization decision shall be represented in the security context after successful policy evaluation.

The application shall not independently replace or weaken a mandatory W2 authorization decision.

A DENY decision shall remain authoritative for the protected request unless an approved security workflow explicitly changes the decision.

### Threat-Detection Context

The security context shall contain or reference applicable threat-detection results.

Where a security rule executes, the context shall support identification of:

* Rule identifier
* Rule category
* Severity
* Rule version
* Execution result
* Applicable evidence reference

Threat-detection context shall support subsequent security decisions, audit, telemetry, and investigation.

### Security Decision State

The security context shall support the current applicable W2 security decision state.

Security decision state shall be established from the results of the applicable security controls.

Business logic shall not be permitted to convert a mandatory blocking security state into an allowed state.

### Security Context Integrity

Security-critical security-context values shall be protected against unauthorized modification.

The application shall not be permitted to modify trusted:

* Identity
* Authentication state
* Authorization decision
* Threat-detection result
* Security decision
* Security classification

in a manner that bypasses W2 security enforcement.

### Trust Establishment

Security context shall follow a controlled trust-establishment process:

**Untrusted Request → Security Validation → Trusted Security Context**

Security context shall never be established by copying security-sensitive fields directly from client input.

### Context Propagation

The trusted security context shall be propagated only to components that require it for security processing or approved application functionality.

Propagation shall preserve the integrity and semantics of security-critical fields.

### Request Isolation

Security context shall be isolated between independent requests.

Security context from one request shall not unintentionally become available to another request.

The implementation shall prevent context leakage across:

* Requests
* Sessions
* Tenants
* Users
* Concurrent executions
* Worker threads
* Asynchronous tasks
* Service invocations

where applicable.

### Asynchronous Processing

Where application processing continues asynchronously, the security context propagation model shall be explicitly defined.

Only the minimum security context required for the asynchronous operation shall be propagated.

The implementation shall prevent accidental propagation of stale, unrelated, or excessive security context.

### Service-to-Service Propagation

Where W2 security context crosses a service boundary, the receiving service shall establish its own trusted security context according to the applicable Identity and Authorization contracts.

An internal service shall not blindly trust arbitrary security-context data received from another service.

Security context propagation across services shall use the approved trust mechanism.

### Tenant and Security-Boundary Isolation

Where applications operate across multiple security or tenant boundaries, security context shall preserve the applicable boundary information.

A request associated with one tenant, security domain, or authorization boundary shall not acquire context belonging to another boundary.

### Context Lifetime

Security context shall have a defined lifetime associated with the protected request or approved execution scope.

Security-sensitive context shall not remain available beyond the period required for the applicable operation.

### Context Mutation

Security context mutation shall be restricted.

Where downstream processing needs to add security information, the architecture shall distinguish between:

* Immutable trusted security state
* Controlled derived state
* Application-local state

Application code shall not freely mutate authoritative security state.

### Security Context and Audit

The security context shall provide the information required to associate security events with:

* Identity
* Application
* Service
* Endpoint
* Resource
* Operation
* Security decision
* Policy/rule
* Correlation identifier
* Timestamp
* Result

Sensitive credentials and prohibited secrets shall not be stored in the security context merely for audit convenience.

### Security Context and Telemetry

The security context shall provide appropriate correlation and security-state information to the W2 security telemetry integration.

Telemetry shall avoid exposing:

* Access tokens
* Passwords
* Private keys
* Secrets
* Other prohibited credential material

### Error Handling

If required security context cannot be established safely, W2 shall apply the approved security failure behavior.

Where continued processing would create an unacceptable security bypass, the request shall fail closed.

Security-context establishment failures shall produce applicable audit and security telemetry.

### Context Validation

Security-sensitive context shall be validated before use by downstream controls where applicable.

Invalid, incomplete, inconsistent, or corrupted security context shall not be treated as trusted.

### Context Conflicts

Where security-context values conflict, W2 shall use the authoritative value established by the applicable security control.

Client-controlled values shall never override trusted W2 security state.

Examples include conflicts involving:

* Identity
* Authentication state
* Subject
* Resource
* Action
* Authorization decision
* Security classification

### Security Context Testing

The security-context implementation shall be tested for:

* Correct identity propagation
* Correct authentication state
* Correct authorization propagation
* Correct authorization decision propagation
* Correct threat-result propagation
* Correlation-ID propagation
* Request isolation
* Concurrent-request isolation
* Tenant-boundary isolation where applicable
* Asynchronous propagation
* Service-to-service propagation
* Unauthorized context modification
* Context corruption
* Context leakage
* Missing security context
* Conflicting security context
* Security-context failure handling

### Security Context Bypass Testing

Tests shall attempt to manipulate security-critical context through:

* Client-supplied fields
* Headers
* Query parameters
* Request bodies
* Alternate execution paths
* Internal application calls
* Asynchronous execution
* Service-to-service calls

Such manipulation shall not result in an authorization, identity, or security-decision bypass.

### Runtime Evidence

Runtime evidence shall demonstrate that trusted security context is actually established and propagated.

Evidence may include:

* Integration-test results
* Security middleware traces
* Authorization traces
* Threat-detection results
* Audit records
* Security telemetry
* Context-isolation tests
* Bypass-test results

Documentation alone shall not establish that security-context controls operate at runtime.

### Security Context Acceptance

The Security Context capability shall not be considered complete until:

* Security context is established at the W2 boundary
* Identity context is established from validated identity
* Authentication state is established correctly
* Authorization context is propagated correctly
* Authorization decisions are preserved
* Threat-detection results are available to the security decision layer
* Correlation identifiers propagate correctly
* Security context is isolated between requests
* Security context cannot be manipulated through untrusted input
* Applicable service-to-service propagation is controlled
* Applicable asynchronous propagation is controlled
* Security-context failures follow approved failure behavior
* Audit and telemetry can associate security events with the request
* Runtime testing demonstrates correct context behavior
* Security-context bypass attempts are rejected
