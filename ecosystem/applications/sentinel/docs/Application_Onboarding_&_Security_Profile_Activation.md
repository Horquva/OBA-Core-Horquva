## Application Onboarding and Security Profile Activation

### Purpose

W2 shall provide a governed application-onboarding process through which protected applications, APIs, services, endpoints, runtime environments, deployment configurations, and applicable security integrations are identified and associated with the required W2 application-security controls.

An application shall not be considered W2-protected merely because the W2 security library, middleware, or security component is installed.

Protection shall require successful onboarding, security-profile definition, applicable security-policy configuration, validation, testing, and activation.

### Onboarding Boundary

Application onboarding shall establish the application-security boundary that W2 is responsible for protecting.

The onboarding definition shall identify, where applicable:

* Application
* Service
* API
* Endpoint
* Resource
* Operation
* Runtime environment
* Deployment context
* Security profile
* Applicable security policies
* Required identity integration
* Required authorization integration
* Required validation contracts
* Required threat-detection rules
* Required output-protection requirements
* Required audit and telemetry integration
* Applicable dependencies

The W2-001 constitution explicitly states that the specific applications, APIs, services, endpoints, communication patterns, runtime environments, and deployment topology subject to W2 are established through onboarding and security-profile specifications.

### Application Registration

Each protected application shall have an identifiable W2 application registration.

The registration shall provide sufficient information to associate the application with:

* Application identity
* Service identity where applicable
* Environment
* Security profile
* Security policy
* Deployment state
* Security ownership
* Required integrations

### Application Identity

The application identity used by W2 shall be distinct from end-user identity where applicable.

W2 shall use the authoritative identity mechanisms established by the applicable Sentinel Identity domain.

W2 shall not create a competing identity authority.

The established boundary is:

> Identity establishes and provides identity trust; W2 enforces application security using that trust.

### Application Security Profile

Each protected application shall have an identifiable Application Security Profile where required.

The profile shall define the application-specific W2 security requirements and applicable control configuration.

The profile shall determine which W2 controls apply to the application and its protected interfaces.

### Security Profile Scope

An Application Security Profile shall support definition of applicable:

* Authentication requirements
* Authorization requirements
* Endpoint protection
* HTTP methods
* Content types
* Payload-size limits
* Request schemas
* Response schemas where applicable
* Threat-detection rules
* Sensitive-field controls
* Masking requirements
* Security headers
* Security constraints
* Security decision behavior

These are the security-policy dimensions already defined by the W2 Application Security Policy Engineering specification.

### Profile Versioning

Every approved Application Security Profile shall have an identifiable version.

The active profile version shall be determinable for a deployed application.

Profile changes shall produce an auditable version history.

### Profile Ownership

Each Application Security Profile shall have an identifiable owner according to the applicable governance model.

The profile owner shall be accountable for ensuring that application-specific security requirements remain accurate and applicable.

W2 shall not invent organizational ownership structures where those structures are defined by broader Sentinel governance.

### Application Inventory

The onboarding process shall establish which application components are protected.

The inventory shall identify applicable:

* APIs
* Services
* Endpoints
* Resources
* Operations
* Runtime environments
* Deployment contexts

The inventory shall be sufficiently precise to determine where W2 enforcement is required.

### Protected Endpoint Registration

Protected endpoints shall have an identifiable association with their applicable security requirements.

For each protected endpoint or endpoint class, W2 shall be able to determine the applicable:

* Authentication requirement
* Authorization requirement
* HTTP method requirement
* Content-type requirement
* Payload-size requirement
* Schema
* Threat-detection rules
* Output-protection requirements
* Security decision behavior

### Endpoint Coverage

The onboarding process shall establish the expected protected endpoint population.

This expected population shall provide the baseline against which W2 can measure actual protection coverage.

An endpoint shall not be considered protected solely because it appears in application documentation.

Runtime enforcement or appropriate validation evidence shall establish actual protection.

### Service Registration

Where W2 protects application services, each applicable service shall be identifiable.

Service registration shall support association with:

* Application
* Environment
* Endpoints
* Security profile
* Dependencies
* Security policies
* Security integrations

### API Registration

Protected APIs shall have an identifiable W2 association.

API registration shall identify, where applicable:

* API identity
* Version
* Base interface
* Protected operations
* Security profile
* Request schemas
* Response requirements
* Authentication requirements
* Authorization requirements

### Runtime Environment Registration

The onboarding definition shall identify the applicable runtime environment.

Examples may include:

* Development
* Test
* Staging
* Production

The exact environment taxonomy shall follow the applicable Sentinel engineering and deployment model.

### Environment-Specific Security

Security requirements shall not be weakened merely because an application is running in a non-production environment where W2 protection is required.

Where environment-specific differences are approved, those differences shall be explicitly represented in the applicable security profile or policy.

### Deployment Context

Where relevant, onboarding shall identify the deployment context necessary to establish the W2 protection boundary.

This may include:

* Application instance
* Service instance
* Runtime component
* Deployment unit
* API gateway integration
* Middleware integration
* Security-library integration

The exact deployment technology shall be defined by the implementation architecture rather than by the W2-001 constitution.

### Identity Integration Activation

Where authentication is required, onboarding shall identify the applicable identity integration.

The integration shall establish how W2 receives and validates the identity information required for the application.

W2 shall perform application-side identity validation but shall not replace the authoritative Identity domain.

### Authorization Integration Activation

Where authorization is required, onboarding shall identify the applicable authorization integration.

W2 shall integrate with the authoritative Policy Engine or applicable policy mechanism.

Authentication success shall not be treated as authorization success.

### Schema Integration

Where request validation is required, onboarding shall identify the applicable validation contracts.

The onboarding definition shall establish sufficient information for W2 to determine:

* Applicable request schema
* Schema version
* Request constraints
* Content-type requirements
* Payload-size requirements

The existing Schema Validation Contract already establishes that the Validation Engine uses the applicable schema and that validation failures prevent protected business logic from executing.

### Threat-Detection Integration

Where threat detection is required, onboarding shall identify the applicable threat-detection rules or rule sets.

The applicable rule configuration shall be governed and versioned.

A protected endpoint shall not silently operate without its required threat-detection configuration.

### Output-Protection Activation

Where output protection is required, onboarding shall identify the applicable response-security requirements.

These may include:

* Response schema
* Sensitive-field filtering
* Sensitive-field masking
* Secure serialization
* Security headers
* Secure error handling

### Audit Integration

The application shall integrate with the applicable W2 audit/security-event mechanism.

The onboarding process shall verify that required security events can be associated with the application.

The Audit and Security Event Model requires security evidence for critical application-security activities and traceability to application, service, endpoint, policy/rule, security decision, environment, timestamp, and result where applicable.

### Telemetry Integration

The application shall integrate with the applicable W2 security telemetry mechanisms.

Onboarding shall establish that relevant:

* Security events
* Security decisions
* Security failures
* Blocked requests
* Control execution
* Drift conditions

can be observed.

### Dependency Declaration

Where dependency governance is applicable, onboarding shall identify the security-sensitive dependencies required by the application.

This shall include applicable W2 security libraries and other dependencies that materially affect W2 security behavior.

### Security Library Activation

Where the Shared Application Security Library is required, the application shall use an approved version.

The library shall be treated as a governed security-sensitive dependency subject to versioning, testing, security review, dependency governance, and vulnerability monitoring.

### Security Policy Association

Every protected endpoint or endpoint class shall have an identifiable applicable security policy.

The policy shall define the W2 security requirements applicable to that endpoint.

The policy shall be authoritative for runtime W2 security enforcement rather than undocumented application assumptions.

### Policy Version Association

The active policy version shall be identifiable for the protected application.

Security decisions and security events shall be capable of being associated with the applicable policy version where required.

### Security Profile and Policy Relationship

The Application Security Profile shall establish the application-specific security configuration.

The applicable Application Security Policy shall define the authoritative security requirements for protected resources and endpoints.

The relationship shall be explicit.

An application shall not depend on undocumented security assumptions outside the approved profile and policy model.

### Onboarding Validation

Before activation, W2 shall validate the onboarding definition.

Validation shall establish, where applicable:

* Application identity
* Protected endpoint inventory
* Security profile
* Security policy
* Identity integration
* Authorization integration
* Schema integration
* Threat-detection configuration
* Output-protection configuration
* Audit integration
* Telemetry integration
* Required security dependencies

### Onboarding Security Tests

The onboarding process shall include applicable security tests.

Testing shall verify that:

* Authentication is enforced where required
* Authorization is enforced where required
* Schema validation is enforced where required
* Threat detection is active where required
* Output protection is active where required
* Security decisions are enforced
* Audit events are generated
* Security telemetry is generated

### Positive Onboarding Tests

Positive tests shall establish that legitimate requests satisfying applicable security requirements can reach protected business logic.

### Negative Onboarding Tests

Negative tests shall establish that applicable security failures prevent protected business logic from executing.

Applicable tests shall include:

* Authentication failure
* Authorization denial
* Schema failure
* Threat detection
* Invalid content type
* Payload-size violation
* Security-policy violation
* Output-security failure where applicable

The W2 lifecycle requires that only requests satisfying required security controls and receiving an applicable allow decision reach protected business logic.

### Security Lifecycle Verification

Onboarding testing shall verify the applicable request lifecycle:

**Request → Identity → Authorization → Schema → Threat Detection → Security Decision → Business Logic → Output Protection → Audit and Evidence**

This is the canonical W2 request lifecycle.

### Business-Logic Boundary Verification

Onboarding shall verify that protected business logic cannot be reached when a mandatory security control fails.

This test shall establish the fundamental W2 invariant:

> No request shall reach protected business logic unless all required security controls for that operation have successfully completed and the resulting security decision permits execution.

### Bypass Testing

Onboarding shall include appropriate attempts to bypass the W2 security boundary.

Applicable bypass scenarios may include:

* Direct endpoint invocation
* Alternate request path
* Middleware bypass
* Missing security context
* Invalid identity
* Authorization bypass
* Validation bypass
* Threat-detection bypass
* Output-protection bypass

### Onboarding Failure

An application shall not be activated as W2-protected if required onboarding validation fails.

A failed onboarding condition shall produce an identifiable result and applicable evidence.

### Incomplete Onboarding

An application with incomplete mandatory onboarding shall not be represented as fully W2-protected.

Unknown or incomplete security configuration shall not silently be interpreted as compliant configuration.

### Activation Decision

W2 shall produce an explicit onboarding activation outcome.

Applicable outcomes shall include:

* Approved
* Rejected
* Pending remediation
* Exception-controlled activation where explicitly permitted

### Activation Criteria

An application may be activated only when:

* Required application identity is established
* Protected interfaces are identified
* Required security profile is defined
* Required security policies are approved
* Required security integrations are available
* Required security controls are configured
* Required onboarding tests pass
* Required evidence is produced
* Applicable security exceptions are approved

### Activation Evidence

Activation evidence shall establish:

* Application identity
* Protected scope
* Security profile version
* Policy version
* Security integration state
* Test results
* Security-control validation
* Activation decision
* Timestamp
* Environment

### Security Profile Deployment

Approved security profiles shall be deployed through a controlled mechanism.

Deployment shall preserve profile-version information and establish which profile became effective.

### Runtime Profile Enforcement

At runtime, W2 shall use the approved active security profile.

Runtime behavior shall not silently use:

* Obsolete profiles
* Unapproved profiles
* Incomplete profiles
* Unknown profiles

### Profile Change

Changes to an active Application Security Profile shall follow the applicable governed lifecycle.

Changes shall be:

* Defined
* Reviewed
* Tested
* Approved
* Versioned
* Deployed
* Monitored

The policy architecture uses the equivalent governed lifecycle:

**Define → Review → Test → Approve → Version → Deploy → Evaluate → Monitor → Improve.**

### Profile Change Regression

Changes to an active security profile shall receive applicable regression testing.

Testing shall verify that previously enforced W2 controls remain effective.

### Profile Drift

W2 shall monitor for divergence between:

* Approved security profile
* Deployed security profile
* Runtime security state

Profile drift shall enter the W2 drift-management lifecycle.

### Re-Onboarding

Material architectural or security changes shall trigger re-validation or re-onboarding where required.

Examples include:

* New protected API
* New endpoint class
* Changed authentication mechanism
* Changed authorization model
* Changed schema
* Changed threat rules
* Changed output-security requirements
* Security-library change
* Material deployment change

### Application Onboarding and CI/CD

W2 shall define the security requirements, security tests, security gates, and security evidence required for onboarding.

Central engineering and CI/CD systems shall orchestrate their integration into the broader delivery process.

W2 shall not replace central engineering orchestration.

### Onboarding and Security Evidence

All material onboarding activities shall produce or integrate with applicable evidence.

Evidence shall include, where applicable:

* Registration
* Security profile
* Policy
* Policy version
* Configuration
* Security integrations
* Test results
* Security-control results
* Activation decision
* Deployment state
* Exceptions

### Onboarding and Monitoring

An activated application shall enter the W2 security-monitoring lifecycle.

Monitoring shall establish continued visibility into:

* Security-control execution
* Security decisions
* Security failures
* Threat detection
* Policy behavior
* Configuration
* Dependencies
* Security posture
* Drift

### Onboarding and Drift

Successful onboarding shall establish the approved security baseline against which future security drift is assessed.

The onboarding state shall therefore become an input to the W2 continuous-security-posture architecture.

### Onboarding Acceptance

Application Onboarding and Security Profile Activation shall not be considered complete until:

* Application identity is established
* Protected applications/services are identified
* Protected APIs are identified
* Protected endpoints are identified
* Runtime environments are identified
* Application Security Profile is defined
* Profile version is identifiable
* Required policies are associated
* Policy versions are identifiable
* Identity integration is established
* Authorization integration is established
* Schema integration is established
* Threat-detection integration is established
* Output protection is established
* Audit integration is established
* Telemetry integration is established
* Security-sensitive dependencies are identified
* Required security tests pass
* Bypass testing is performed where required
* Security-control execution is verified
* Business-logic protection is verified
* Activation decision is explicit
* Activation evidence is produced
* Runtime profile enforcement is verified
* Monitoring is activated
* The approved onboarding state becomes the baseline for drift detection
