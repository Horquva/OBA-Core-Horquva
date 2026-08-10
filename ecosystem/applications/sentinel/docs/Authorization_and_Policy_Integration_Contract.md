##  Authorization and Policy Integration Contract

**Purpose**

W2 shall integrate with Sentinel's authoritative Policy Engine to obtain authorization decisions for applicable protected operations.

W2 shall construct the applicable authorization request, provide the required authorization context, obtain the Policy decision, enforce the resulting decision, and generate the required audit and security telemetry.


**Authority Boundary**

The Policy Engine remains authoritative for authorization policy and applicable authorization decisions.

W2 shall not independently replace or override the authoritative Policy decision.

W2 owns enforcement of the applicable authorization result at the application-security boundary.


**Authorization Context**

For each applicable protected operation, W2 shall construct an authorization context containing, where applicable:

* Subject
* Resource
* Action
* Approved environment attributes
* Approved contextual attributes

The subject shall be derived from the validated identity context.

The resource and action shall represent the actual protected operation being requested.

Only approved contextual attributes shall be supplied to the Policy Engine.


**Authorization Request**

W2 shall construct and submit an authorization request to the authoritative Policy Engine using the applicable authorization context.

The authorization request shall be associated with the W2 security context and correlation identifier.

The exact wire-level Policy API schema shall be defined by the Policy Integration API Contract and shall not be invented independently by application implementations.


**Policy Decision**

The Policy Engine shall provide the applicable authorization decision.

W2 shall process at minimum:

* Allow
* Deny
* Authorization error or unavailable decision

The resulting authorization outcome shall be recorded in the W2 security context.


**Allow Handling**

Where the Policy Engine returns an applicable allow decision and all other required W2 security controls succeed, W2 shall permit the request to proceed to the next required security-control stage or protected business logic as defined by the request lifecycle.


**Deny Handling**

Where the Policy Engine returns deny, W2 shall:

1. Prevent protected business logic from executing.
2. Produce the applicable security decision.
3. Generate the required audit information.
4. Generate appropriate security telemetry.
5. Return the approved secure error response.

A Policy deny shall not be overridden by the application.


**Missing Authorization Context**

Where required authorization context is missing, malformed, inconsistent, or cannot be reliably established, W2 shall not treat the authorization request as successfully authorized.

The request shall be denied and shall not reach protected business logic.


**Policy Service Failure**

Where the Policy Engine is unavailable or cannot provide the required authorization decision, W2 shall apply the approved fail-closed behavior where continued processing would create an unacceptable security bypass.

The request shall not be treated as authorized merely because the requester is authenticated.

The exact timeout, retry, caching, and dependency-failure mechanisms shall be defined by the Policy Runtime and Dependency Failure Specifications.


**Authorization Security Rules**

W2 shall enforce the following rules:

* Authentication does not imply authorization.
* The actual subject must be used.
* The actual protected resource must be used.
* The actual requested action must be used.
* Required authorization context must not be omitted.
* Unauthorized operations must not reach protected business logic.
* Privilege escalation attempts must be denied.
* Policy decisions must not be overridden by application code.


**Required Authorization Validation**

The implementation shall test at minimum:

* Authorized user performing an allowed operation.
* Authenticated but unauthorized user.
* Wrong resource.
* Wrong action.
* Missing authorization context.
* Policy service failure.
* Privilege escalation attempt.


**Audit and Telemetry**

Authorization processing shall produce sufficient information to establish:

* Correlation identifier
* Subject or validated identity reference
* Resource
* Action
* Applicable policy information
* Authorization result
* Failure category where applicable
* Timestamp
* Application/service
* Endpoint or operation
* Final security decision

Sensitive credentials and unnecessary sensitive data shall not be exposed in authorization logs, audit records, telemetry, or error responses.



**Authorization Principle**

The W2 authorization boundary is:

Identity establishes who the requester is → W2 constructs the authorization context → Policy determines whether the operation is permitted → W2 enforces the decision.

Therefore:

Authenticated ≠ Authorized

and:

No unauthorized request may reach protected business logic.
