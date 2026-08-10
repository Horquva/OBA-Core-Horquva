## Identity Integration Contract

### Purpose

W2 shall integrate with the Sentinel Identity Service to consume and enforce authoritative identity trust at the application-security boundary.

W2 shall not create, replace, or become the authoritative owner of Sentinel identity architecture.

Identity remains the authoritative source for identity trust. W2 owns the application-side enforcement and consumption of that trust.

### Identity Processing

For each applicable protected request, W2 shall:

1. Obtain the applicable identity credential or identity context.
2. Validate the credential according to the applicable Identity contract.
3. Establish the authenticated subject only after successful validation.
4. Populate the W2 security context with the validated identity information.
5. Propagate the applicable identity context to downstream W2 security controls and protected application logic.
6. Reject invalid identity conditions before protected business logic is executed.

### Required Identity Validation

W2 shall validate, where applicable:

* JWT signature
* Token validity
* Token expiration
* Issuer
* Audience
* Required claims
* Subject identity
* Security context
* Authentication state
* Credential validity
* Token integrity and tampering

### Authentication Failure

The following conditions shall be treated as invalid identity conditions unless an explicitly approved Identity contract defines otherwise:

* Missing token
* Empty token
* Malformed token
* Expired token
* Invalid signature
* Wrong issuer
* Wrong audience
* Missing required claims
* Modified claims
* Algorithm misuse where applicable
* Invalid credential context

Invalid identity shall result in:

**Fail Closed → Audit → Appropriate Security Telemetry**

An invalid identity condition shall not permit protected business logic to execute.

### Identity Trust Boundary

W2 shall not treat identity information supplied directly by an untrusted request as authoritative.

Identity trust shall be established through the approved Sentinel Identity integration and applicable validation controls.

Client-supplied claims or identity attributes shall not override validated identity information.

### Identity Context

Following successful validation, W2 shall establish the applicable identity context within the W2 security context.

The identity context shall provide the validated information required for:

* Authorization evaluation
* Security-policy enforcement
* Audit
* Security telemetry
* Request traceability
* Protected application integration

The exact identity claim schema shall be defined by the Identity Integration API/Contract and shall not be independently invented by W2.

### Authentication and Authorization Separation

Authentication shall establish the identity of the requester.

Authentication success shall not constitute authorization.

Authorization shall be evaluated independently through the authoritative Policy mechanism.

Therefore:

**Authenticated ≠ Authorized**

No authenticated request shall reach protected business logic unless the applicable authorization requirements are also satisfied.

### Identity Failure Observability

Identity failures shall produce sufficient audit and security telemetry to establish:

* Correlation identifier
* Application/service
* Endpoint or operation
* Identity-validation outcome
* Failure category
* Timestamp
* Security decision
* Applicable security event information

Sensitive credentials and raw tokens shall not be exposed in logs, audit records, telemetry, or error responses.

### Identity Integration Principle

W2 shall convert authoritative identity trust into enforceable application-security behavior without duplicating Sentinel Identity's authority.

The integration boundary is therefore:

**Identity establishes trust → W2 validates and consumes trust → Policy determines permission → W2 enforces the resulting security decision.**
