
---
## Purpose

**What is W2.?**
The purpose of W2 is to establish the Sentinel Application Security Control Plane responsible for enforcing application-layer security controls across protected applications, APIs, services, request flows, payload boundaries, business-logic entry points, and application outputs.

**"Why does W2 exist?"**
W2 is intended to transform the defined application-security architecture into an operational, governed, automated, continuously validated, attack-tested, observable, and evidence-producing security capability.

**"What does this particular document do?"**
This document establishes the foundational architecture, responsibilities, security boundaries, control flow, and integration principles that will govern the design and implementation of W2. Subsequent W2 specifications, security contracts, implementation components, testing requirements, and evidence requirements shall be derived from and remain consistent with this architecture.
---
## Scope

W2 applies to the application-layer security of protected Sentinel applications, APIs, and services. Its scope includes the security of application request flows, request payloads, business-logic entry points, and application outputs.

Within this scope, W2 provides and enforces application-security controls including:

* Request interception and security middleware
* Application-side identity enforcement
* Authorization enforcement
* Schema and input validation
* Application-layer threat detection
* Security decision enforcement
* API security controls
* Output protection
* Security testing and regression controls
* Application-security telemetry and audit
* Security evidence generation
* Application-security drift detection
* Application-security policy enforcement
* Dependency-security integration where applicable

W2 operates at the application-security layer and integrates with other Sentinel security authorities where their capabilities or decisions are required.

The following domains remain outside W2's ownership:

* Identity architecture and identity authority
* Central authorization policy authority
* Infrastructure security architecture and infrastructure trust
* AI-specific security architecture
* Central CI/CD and engineering orchestration
* Business application logic and business functionality

W2 may integrate with these domains but shall not redefine or replace their authoritative responsibilities.

The specific applications, APIs, services, runtime environments, deployment topology, and integration mechanisms covered by W2 shall be established through subsequent W2 architecture and onboarding specifications.

---
## What W2 Protects

W2 protects application-layer interactions involving protected Sentinel applications, APIs, and services.

The W2 protection boundary includes the following:


**Applications**

W2 protects the application security boundary of protected Sentinel applications by enforcing required application-layer security controls before protected application functionality is executed.


**APIs**

W2 protects API interfaces by enforcing applicable authentication, authorization, validation, threat-detection, request, response, and other application-security controls.


**Services**

W2 protects application services and applicable service-to-service interactions. Internal service communication shall not be considered trusted solely because the communication occurs within an internal environment.


**Request Flows**

W2 protects the lifecycle of applicable application requests from initial receipt through identity validation, authorization, schema validation, threat detection, business-logic execution, output protection, and security auditing.


**Payload Boundaries**

W2 protects request and response payload boundaries through applicable schema validation, content-type validation, payload-size controls, input validation, threat detection, and output protection.

**Business-Logic Entry Points**

W2 protects the entry points through which requests reach protected business logic. Required application-security controls shall be enforced before an applicable request is permitted to execute protected business functionality.


**Application Outputs**

W2 protects application outputs by applying applicable response validation, sensitive-data protection, filtering, masking, secure serialization, and secure error-handling controls.

The specific applications, APIs, services, endpoints, and communication patterns subject to these controls shall be established through W2 application onboarding and security-profile specifications.

---

## What W2 Does Not Own

W2 is an application-security enforcement layer and shall not replace or redefine authoritative security responsibilities assigned to other Sentinel security domains.

**Identity**

W2 does not own Sentinel Identity architecture or identity authority.

W2 consumes identity information and applicable identity trust from the authoritative Identity domain and performs the application-side validation and enforcement required by W2.

Boundary:

> Identity establishes and provides identity trust; W2 enforces application security using that trust.



**Authorization Policy**

W2 does not own the authoritative authorization-policy definition or replace the Sentinel Policy Engine.

W2 integrates with the authoritative Policy Engine and enforces applicable authorization decisions at the application boundary.


 Boundary:

> Policy determines authorization; W2 enforces the resulting security requirement.


**Infrastructure Security**

W2 does not own infrastructure-security architecture, infrastructure trust, or infrastructure-level security controls.

W2 may consume infrastructure-security capabilities or signals where required to make or enforce application-security decisions.

Boundary:

> Infrastructure Security establishes infrastructure-level trust and controls; W2 applies application-layer security enforcement.



**AI Security**

W2 does not own the authoritative AI-security architecture or AI-specific security policy.

W2 may integrate with AI-security controls where an application or API requires application-layer enforcement of those controls.

Boundary:

> AI Security defines authoritative AI-specific security controls; W2 enforces applicable controls at the application boundary.


**Engineering and CI/CD Orchestration**

W2 does not own Sentinel's central engineering or CI/CD orchestration.

W2 owns the application-security requirements, security tests, security gates, and security evidence required for W2 controls. The central engineering system is responsible for integrating those requirements into the broader software-delivery lifecycle.

Boundary:

> W2 defines and validates application-security requirements; central engineering orchestrates the overall delivery pipeline.


**Business Application Logic**

W2 does not own application business logic or business functionality.

W2 protects the entry points to protected business functionality by enforcing applicable application-security controls before the functionality is executed.

Boundary:

> The application owns business behavior; W2 owns the security boundary around that behavior.


**General Principle**

W2 shall integrate with authoritative Sentinel security domains rather than duplicate their authority.

Where another Sentinel security domain is authoritative for a security decision, W2 shall consume the required trust, decision, or control and enforce the applicable requirement at the application-security boundary.

W2 shall not create a competing source of truth for identity, authorization policy, infrastructure trust, AI-security authority, or central engineering orchestration.


---

## W2 Responsibilities

W2 owns the definition, enforcement, validation, observability, and evidence of application-layer security controls within its defined protection boundary.

W2 responsibilities are organized into the following control domains.

**Request Security**

W2 shall provide or enforce the application security boundary for applicable requests. This includes request interception, security middleware, security-context establishment, control execution, and enforcement before protected business logic is reached.

**Identity Enforcement**

W2 shall enforce applicable application-side identity requirements and validate identity information received from the authoritative Identity domain.

This includes enforcement of applicable token validation, issuer, audience, expiration, signature, and required identity-claim requirements.

**Authorization Enforcement**

W2 shall enforce applicable authorization requirements at the application boundary.

W2 shall integrate with the authoritative Policy Engine and shall not treat successful authentication as sufficient authorization.

**Schema and Input Validation**

W2 shall enforce applicable request and payload validation requirements, including schema structure, required fields, data types, limits, content types, payload sizes, and other defined validation constraints.

**Application-Layer Threat Detection**

W2 shall provide application-layer threat-detection capabilities covering the applicable OWASP API and web security risks defined by W2 security policy.

Threat-detection controls shall be deterministic, testable, versioned, observable, and associated with defined severity and handling requirements.

**Security Decision Enforcement**

W2 shall convert applicable identity, authorization, validation, threat-detection, policy, and other security signals into enforceable security outcomes.

Security decisions shall be deterministic, explainable, traceable, auditable, and reproducible.

**Output Protection**

W2 shall protect application outputs against unintended disclosure or unsafe responses through applicable response validation, sensitive-data protection, filtering, masking, secure serialization, and secure error-handling controls.

**Audit and Security Telemetry**

W2 shall generate or integrate with security audit and telemetry mechanisms capable of recording security-relevant events, decisions, failures, blocked requests, control execution, correlation information, and other required security evidence.

**Security Policy Enforcement**

W2 shall enforce applicable application-security policies and shall support policy versioning, evaluation, monitoring, and controlled policy lifecycle requirements.

W2 shall consume authoritative policy decisions where another Sentinel security domain owns the policy authority.

**Security Testing and Regression**

W2 shall maintain application-security tests covering positive, negative, integration, security, and regression scenarios.

Security controls shall be continuously validated, and security regressions shall be detectable and actionable.

**Security Evidence**

W2 shall produce or integrate with mechanisms that provide evidence of security-control operation, security-test results, runtime security decisions, vulnerabilities, remediation, exceptions, policy execution, and other required acceptance evidence.

**Drift Detection and Security Posture**

W2 shall support detection and management of application-security drift, including unauthorized or unintended changes to security middleware, authentication, authorization, validation, security rules, policies, dependencies, and other defined security controls.

Drift shall follow the defined lifecycle of detection, recording, classification, assessment, remediation, verification, and evidence.

**Responsibility Principle**

W2 shall be responsible for enforcing application-layer security within its protection boundary while consuming authoritative security trust, decisions, and capabilities from other Sentinel security domains.

W2 shall not establish competing sources of truth for security domains that are explicitly owned elsewhere.


---


## Security Request Lifecycle

W2 shall enforce application security through a defined request lifecycle that establishes and evaluates applicable security controls before protected business logic is executed and protects application outputs after business execution.

The canonical W2 request lifecycle is:

**Request → Identity → Authorization → Schema → Threat Detection → Security Decision → Business Logic → Output Protection → Audit and Evidence**

### Request Interception

An applicable request shall enter the W2 application-security boundary before reaching protected business logic.

W2 shall establish the security-processing context required to evaluate applicable controls.

### Identity Validation

W2 shall evaluate applicable identity requirements using identity information provided by the authoritative Identity domain.

Where applicable, W2 shall validate token structure, signature, issuer, audience, expiration, and required identity claims.

An identity validation failure shall prevent the request from reaching protected business logic.

### Authorization Evaluation

Following successful identity processing, W2 shall establish the applicable authorization context, including the subject, resource, action, and required contextual information.

W2 shall obtain or evaluate the applicable authorization decision through the authoritative Policy mechanism.

Authentication success shall not be treated as authorization success.

An authorization failure or denial shall prevent the request from reaching protected business logic.

### Schema and Input Validation

W2 shall validate applicable request payloads against their defined security and API schemas.

Validation shall include applicable structural, type, required-field, size, content-type, format, and constraint requirements.

A request that fails required validation shall be rejected before protected business logic executes.

### Threat Detection

W2 shall evaluate applicable requests for application-layer security threats using the defined threat-detection and OWASP security controls.

Detected threats shall produce the applicable security decision and handling behavior.

Threat-detection results shall be observable and associated with the applicable request and security context.

### Security Decision

W2 shall evaluate the applicable security-control results and produce an enforceable security decision.

The decision mechanism shall support applicable outcomes including:

* Allow
* Block
* Additional security handling where explicitly defined

Security decisions shall be deterministic, explainable, traceable, auditable, and reproducible.

### Business Logic Execution

Only requests that satisfy all required security controls and receive an applicable allow decision shall proceed to protected business logic.

W2 shall enforce the security boundary but shall not own or alter the application's business functionality.

### Output Protection

Application responses shall pass through applicable output-security controls before being returned to the requesting party.

W2 shall apply applicable response validation, sensitive-data protection, filtering, masking, secure serialization, and secure error-handling requirements.

### Audit and Evidence

W2 shall record or integrate with mechanisms that capture required security-relevant events and evidence throughout the request lifecycle.

The recorded information shall support investigation, monitoring, audit, security testing, acceptance, and reproducibility of security decisions.

### Failure Handling

Where a required security control cannot establish the security condition necessary for safe execution, W2 shall fail closed unless an explicitly approved and documented alternative behavior exists.

Security-control failures, dependency failures, denials, blocked requests, and other security-relevant outcomes shall be observable and auditable.

### Lifecycle Invariant

The following invariant shall apply to protected application operations:

> **No request shall reach protected business logic unless all required security controls for that operation have successfully completed and the resulting security decision permits execution.**

This invariant is the fundamental application-security enforcement principle of W2.
