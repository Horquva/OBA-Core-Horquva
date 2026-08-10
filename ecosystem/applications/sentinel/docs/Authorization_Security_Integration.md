## Authorization Integration Contract

### Purpose

W2 shall define the application-side integration contract between the Application Security Platform and the Sentinel Policy Engine.

The integration shall construct authorization requests from validated identity and application request context, obtain the applicable policy decision, enforce the resulting decision, and produce appropriate audit and security telemetry.

### Ownership Boundary

The Sentinel Policy Engine remains responsible for authorization policy and authorization decisions.

W2 is responsible for application-layer authorization integration and enforcement.

W2 shall not duplicate or independently redefine the authoritative authorization policy engine.

### Authorization Principle

Authentication establishes identity.

Authorization determines permission.

An authenticated identity shall not be considered authorized merely because authentication succeeded.

No unauthorized request may reach protected business logic.

### Authorization Request

For each protected operation requiring authorization, W2 shall construct an authorization request containing, where applicable:

* Subject context
* Resource context
* Action context
* Approved environment/context attributes
* Applicable policy request information

The authorization request shall contain sufficient context for the Policy Engine to make the applicable authorization decision.

### Subject Context

The subject context shall identify the authenticated identity established by the Identity Integration boundary.

Subject information shall originate from validated identity trust and shall not be constructed from untrusted request input.

### Resource Context

The authorization request shall identify the resource against which access is being requested.

Resource context shall represent the actual protected resource or resource class relevant to the requested operation.

Resource identifiers supplied by a client shall not automatically establish authorization to access the corresponding resource.

### Action Context

The authorization request shall identify the action being requested.

The action shall correspond to the actual protected operation being attempted.

The application shall not substitute a less restrictive action merely to obtain an authorization decision.

### Environment and Context Attributes

Where approved by the applicable security policy, W2 may include additional environment or contextual attributes in the authorization request.

The authoritative policy shall determine which contextual attributes are valid and relevant.

W2 shall not independently introduce authorization attributes that contradict the approved Policy model.

### Policy Request

W2 shall submit the constructed authorization context to the Sentinel Policy Engine through the governed authorization interface.

The policy request shall identify sufficient context for deterministic policy evaluation.

### Policy Decision

The Policy Engine shall return the applicable authorization decision.

At minimum, the authorization integration shall support:

* ALLOW
* DENY

The decision shall be propagated to the W2 Security Decision and request-processing flow.

### Allow Handling

When authorization returns ALLOW, W2 shall permit the request to continue through the remaining applicable security lifecycle.

Authorization ALLOW shall not bypass:

* Schema validation
* Threat detection
* Output protection
* Audit
* Other mandatory W2 controls

### Deny Handling

When authorization returns DENY, W2 shall prevent the unauthorized operation from reaching protected business logic.

The denial shall produce appropriate:

* Security decision information
* Audit evidence
* Security telemetry
* Controlled external error behavior

### Authorization Error Handling

W2 shall distinguish between:

1. A valid authorization evaluation resulting in DENY.
2. An authorization-processing failure.

A policy decision of DENY shall be treated as an authorization decision.

A failure to obtain or safely evaluate the authorization decision shall be handled according to the approved W2 failure architecture.

### Policy Service Failure

W2 shall define and validate behavior when the Policy Engine is unavailable or cannot safely provide an authorization decision.

Where continued processing would create an unacceptable security bypass, W2 shall apply the approved fail-closed behavior.

A policy-service failure shall not be converted into an implicit authorization ALLOW.

### Missing Authorization Context

If required authorization context is unavailable or cannot be trusted, W2 shall not infer or guess the missing information.

Missing required authorization context shall result in denial according to the approved security decision behavior.

### Authorization Context Integrity

Authorization context shall be derived from trusted application-security context and validated request information.

Untrusted client-controlled values shall not override trusted subject, resource, action, or approved policy context.

### Authorization Decision Enforcement

The authorization decision shall be enforced at the W2 application-security boundary before protected business logic executes.

Applications shall not independently override a W2 authorization denial.

### Authorization Negative Testing

The authorization integration shall be tested against at least:

* Authorized user → allowed operation
* Authenticated but unauthorized user → denied
* Wrong resource → denied
* Wrong action → denied
* Missing authorization context → denied
* Policy service failure → appropriate fail-closed behavior
* Privilege escalation attempt → denied

### Resource Authorization Testing

Tests shall demonstrate that authorization is evaluated against the requested resource.

An identity authorized for one resource shall not automatically receive authorization for another resource unless the applicable policy explicitly permits it.

### Action Authorization Testing

Tests shall demonstrate that authorization is evaluated against the requested action.

Permission for one operation shall not automatically imply permission for a different or more privileged operation.

### Privilege Escalation Testing

The authorization test suite shall include attempts to perform operations beyond the subject's approved permissions.

Privilege-escalation attempts shall result in denial and appropriate security evidence.

### Authorization Audit Integration

Authorization activity shall produce applicable audit evidence.

Authorization events shall be traceable, where applicable, to:

* Identity
* Application
* Service
* Endpoint
* Resource
* Operation
* Rule/policy
* Decision
* Environment
* Timestamp
* Result

Audit records shall not contain credentials, access tokens, private keys, or other prohibited secrets.

### Authorization Telemetry

W2 shall generate security telemetry for applicable authorization events, including:

* Authorization failures
* Authorization denials
* Policy evaluation failures
* Missing authorization context
* Privilege-escalation attempts
* Other approved authorization-security conditions

### Correlation

Authorization activity shall participate in the W2 correlation model so that an authorization decision can be associated with the originating request and related security events.

### Authorization and Request Lifecycle

Authorization shall occur after identity validation and before schema validation, threat scanning, business logic, and output protection according to the locked W2 request lifecycle:

**Request → Identity → Authorization → Schema → Threat Scan → Business Logic → Output Protection → Audit**

No application request may silently bypass this lifecycle.

### Authorization Failure Principle

Where authorization cannot establish that the requested operation is permitted, W2 shall not assume permission.

The default security behavior for insufficient or missing authorization evidence shall be denial.

### Policy Ownership Principle

Authorization policy remains owned by the Sentinel Policy authority.

W2 consumes the authoritative policy decision and enforces it at the application security boundary.

W2 shall not become a parallel authorization policy authority.

### Authorization Integration Acceptance

The Authorization Integration capability shall not be considered complete until:

* Authorization requests are constructed correctly
* Subject context is correct
* Resource context is correct
* Action context is correct
* Approved context attributes are handled correctly
* Policy requests reach the Policy Engine
* Policy decisions are consumed correctly
* ALLOW is enforced correctly
* DENY is enforced correctly
* Authorization errors are handled safely
* Policy-service failure behavior is validated
* Privilege escalation is denied
* Wrong-resource access is denied
* Wrong-action access is denied
* Missing authorization context is denied
* Authorization activity is auditable
* Authorization telemetry is operational
* Negative tests demonstrate real blocking
* No unauthorized request reaches protected business logic
