## Dependency and Supply-Chain Security Architecture

### Purpose

W2 shall provide a governed application-security architecture for managing security risks arising from software dependencies used by protected applications, services, and W2 security components.

Dependency security shall address direct dependencies, transitive dependencies, security-sensitive shared libraries, dependency vulnerabilities, unsupported components, version drift, and unauthorized dependency changes.

### Scope

Dependency-security controls shall apply, where relevant, to:

* Application dependencies
* Shared W2 security libraries
* Security middleware
* Security frameworks
* Threat-detection components
* Policy-integration components
* Identity-integration components
* Serialization libraries
* Parsing libraries
* Cryptographic libraries
* Runtime dependencies
* Transitive dependencies
* Other software components capable of affecting W2 security behavior

### Responsibility Boundary

W2 shall define and enforce application-security requirements for dependencies within its protection boundary.

W2 shall not replace Sentinel's central engineering or CI/CD orchestration.

Central engineering may execute broader software-supply-chain processes, while W2 shall define the application-security requirements, security validation, security gates, and security evidence applicable to W2 controls.

### Dependency Inventory

Protected applications and W2 security components shall maintain an identifiable dependency inventory where required.

The inventory shall support identification of:

* Dependency name
* Dependency version
* Dependency type
* Direct or transitive status
* Application or component using the dependency
* Environment
* Security relevance
* Source
* Applicable security findings

### Dependency Identity

Every governed dependency shall be uniquely identifiable sufficiently to distinguish it from other versions or similarly named components.

Dependency identification shall support vulnerability and version assessment.

### Direct Dependencies

Direct application dependencies shall be explicitly declared and governed.

Applications shall not introduce security-sensitive direct dependencies through undocumented or uncontrolled mechanisms.

### Transitive Dependencies

W2 shall account for applicable transitive dependencies where they can materially affect application security.

A dependency shall not be considered safe solely because it was introduced indirectly.

### Security-Sensitive Dependencies

Dependencies that directly implement or materially affect security controls shall receive enhanced governance.

Examples include:

* Authentication libraries
* Authorization libraries
* Cryptographic libraries
* Input-validation libraries
* Serialization libraries
* Parsing libraries
* Security middleware
* Threat-detection libraries
* Security logging components
* Shared W2 security primitives

### Shared Application Security Library

The Shared Application Security Library shall be treated as a governed security-sensitive dependency.

Applications shall consume approved library versions through the governed dependency mechanism.

The library shall remain subject to:

* Versioning
* Testing
* Security review
* Dependency governance
* Vulnerability monitoring
* Compatibility assessment

These requirements are already established by the Shared Application Security Library specification.

### Approved Dependency Sources

Where dependency-source governance is applicable, applications shall use approved dependency sources.

Unapproved or unknown dependency sources shall not be introduced into protected applications without the applicable security assessment and approval.

### Dependency Versioning

Dependency versions shall be explicitly identifiable.

Security-sensitive dependencies shall not rely on uncontrolled floating versions where doing so could create unpredictable security behavior.

### Version Drift

W2 shall support detection of dependency version drift.

Version drift shall identify deviations between:

* Approved dependency version
* Declared dependency version
* Resolved dependency version
* Deployed dependency version

where those distinctions are applicable.

### Dependency Vulnerability Monitoring

Dependencies shall be monitored for known security vulnerabilities where applicable.

Monitoring shall identify:

* Vulnerability
* Affected dependency
* Affected version
* Severity
* Affected application/component
* Available remediation
* Current remediation state

### Vulnerability Assessment

A detected dependency vulnerability shall be assessed according to its actual applicability and security impact.

The presence of a vulnerability identifier alone shall not automatically establish that a protected W2 security boundary is exploitable.

Assessment shall consider:

* Affected component
* Affected version
* Runtime usage
* Reachability
* Exposure
* Security function
* Available mitigation
* Application context

### Vulnerability Findings

Applicable dependency vulnerabilities shall generate or integrate with the W2 security-finding lifecycle.

The lifecycle shall support:

**Detect → Record → Classify → Assess → Assign → Remediate → Verify → Close**

### Severity

Dependency vulnerabilities shall receive applicable severity classification according to the governing security-risk model.

Severity shall account for the actual impact on the W2 application-security boundary.

### Critical Security Dependencies

Dependencies that directly affect mandatory W2 security controls shall receive appropriate priority during vulnerability assessment and remediation.

A vulnerability in a security-sensitive dependency shall not be treated as an ordinary application-maintenance issue.

### Unsupported Dependencies

Unsupported or end-of-life dependencies shall be identified where their unsupported state creates security risk.

The application shall assess the need for:

* Upgrade
* Replacement
* Compensating control
* Exception
* Retirement

### Dependency Security Review

Security-sensitive dependency changes shall undergo applicable security review.

The review shall consider:

* Security impact
* Vulnerability history
* API compatibility
* Behavioral compatibility
* Dependency changes
* Transitive dependency changes
* Failure behavior
* Attack surface
* Migration requirements
* Regression risk

These review considerations are explicitly required for the governed Shared Application Security Library.

### Dependency Change Control

Dependency changes shall be identifiable and traceable.

Applicable changes shall record:

* Previous version
* New version
* Reason for change
* Security assessment
* Test result
* Approval where required
* Deployment result

### Dependency Testing

Security-sensitive dependency changes shall receive appropriate testing.

Testing shall include, where applicable:

* Functional testing
* Security testing
* Negative testing
* Regression testing
* Compatibility testing
* Integration testing

The Shared Application Security Library specification already requires these testing categories for security-sensitive primitives.

### Dependency Regression

A dependency upgrade shall not be considered safe solely because the new version resolves a known vulnerability.

Regression testing shall verify that existing W2 security behavior remains intact.

Applicable regression areas include:

* Identity enforcement
* Authorization enforcement
* Schema validation
* Threat detection
* Security decisions
* Output protection
* Audit
* Security telemetry
* Error handling

### Security-Control Dependency Changes

Where a dependency implements or materially affects a W2 security control, the change shall trigger the applicable security-control regression suite.

### Dependency Integrity

W2 shall support mechanisms appropriate to establishing the integrity and provenance of governed dependencies.

Where applicable, dependency acquisition shall verify:

* Expected source
* Expected package identity
* Expected version
* Integrity metadata
* Approved artifact status

### Dependency Provenance

Where dependency provenance information is available, it shall be retained according to the applicable software-supply-chain process.

Provenance shall support investigation of the origin of security-sensitive components.

### Unauthorized Dependency Detection

W2 shall support detection of dependencies that are:

* Not approved
* Not declared
* Unexpected
* Version-mismatched
* Vulnerable
* Unsupported
* Introduced outside the governed dependency process

Unauthorized dependencies shall generate applicable security findings.

### Dependency License and Legal Review

Where organizational policy requires license or legal review, dependency governance shall integrate with the applicable process.

W2 shall not establish independent legal policy.

### Dependency Secrets

Dependency configuration shall not introduce uncontrolled secrets.

Package-manager credentials, repository credentials, signing credentials, and other secret material shall be handled through the approved Secrets Integration architecture.

### Dependency Repository Security

Where applications retrieve dependencies from repositories, repository access shall be appropriately authenticated and authorized.

Repository credentials shall not be embedded in source code or committed configuration.

### Dependency Availability

Failure of an approved dependency source shall not cause an application to retrieve an unapproved substitute solely to preserve build or runtime availability.

Approved fallback mechanisms, where required, shall be explicitly governed.

### Dependency Failure at Runtime

If a runtime dependency required by a mandatory W2 security control fails, the dependency-failure architecture shall apply.

Where continued processing would create an unacceptable security bypass, the affected operation shall fail closed.

### Dependency Security and Security Context

Dependency information may be represented in security evidence where necessary to establish the runtime security state.

Security context shall not contain unnecessary dependency metadata or sensitive package-management credentials.

### Dependency Security and Audit

Material dependency-security events shall generate applicable audit evidence.

Examples include:

* Vulnerability detection
* Security-sensitive dependency change
* Unauthorized dependency detection
* Dependency-version drift
* Security exception
* Remediation
* Verification

### Dependency Security and Telemetry

Dependency-security conditions shall produce applicable security telemetry.

Telemetry shall support detection of:

* New vulnerabilities
* Increasing vulnerability severity
* Repeated dependency failures
* Unauthorized dependency changes
* Version drift
* Unsupported components
* Security-sensitive dependency changes

### Dependency Exceptions

Where an application cannot immediately remediate a dependency vulnerability, an explicit security exception may be required according to organizational policy.

The exception shall identify:

* Affected dependency
* Vulnerability
* Risk
* Scope
* Owner
* Compensating controls where applicable
* Expiration or review date
* Remediation plan

An exception shall not silently convert a vulnerable dependency into an approved dependency.

### Dependency Remediation

Dependency remediation shall be tracked through the applicable security-finding lifecycle.

Remediation shall include appropriate verification that:

* The vulnerable version is no longer deployed where required
* The intended secure version is deployed
* Transitive dependencies are also addressed where applicable
* Security tests pass
* The finding is appropriately closed

### Dependency Security Drift

W2 shall detect divergence between approved dependency state and actual application state where technically applicable.

Examples include:

* Unapproved version
* Unapproved package
* Missing security patch
* Unexpected transitive dependency
* Runtime dependency mismatch

Dependency drift shall enter the defined drift-management lifecycle.

### Dependency Security Scanning

Where scanning is used, dependency scanning shall be integrated with the governed security-assurance process.

Scanning results shall be treated as security evidence rather than as the sole basis for runtime security decisions.

### Dependency Security Testing

Dependency-security controls shall be tested for:

* Known vulnerable dependency
* Vulnerable transitive dependency
* Version drift
* Unauthorized dependency
* Unsupported dependency
* Security-sensitive dependency change
* Dependency repository failure
* Dependency integrity failure
* Dependency remediation
* Dependency exception
* Runtime security dependency failure

### Dependency Bypass Testing

Testing shall attempt to introduce or execute unapproved dependency versions through applicable alternate mechanisms.

Such mechanisms may include:

* Direct dependency substitution
* Transitive dependency manipulation
* Configuration manipulation
* Build artifact manipulation
* Runtime path manipulation

The application shall not silently accept an unauthorized security-sensitive dependency.

### Dependency Regression Testing

Dependency changes shall trigger applicable regression testing for the W2 security boundary.

Regression evidence shall demonstrate that the dependency change did not weaken mandatory W2 controls.

### Dependency Evidence

Dependency-security evidence shall support reconstruction of:

* Dependency identity
* Version
* Application/component
* Environment
* Security assessment
* Vulnerability state
* Remediation state
* Applicable test results
* Approval or exception
* Deployment state

### Dependency Security Acceptance

Dependency and Supply-Chain Security capability shall not be considered complete until:

* Dependencies are identifiable
* Direct dependencies are governed
* Transitive dependencies are considered
* Security-sensitive dependencies receive enhanced governance
* Approved dependency sources are defined
* Dependency versions are identifiable
* Version drift can be detected
* Dependency vulnerabilities are monitored
* Vulnerabilities are assessed
* Security findings are generated where applicable
* Unsupported dependencies are identified
* Security-sensitive dependency changes receive appropriate review
* Dependency changes are tested
* Dependency regression testing exists
* Dependency integrity is addressed
* Unauthorized dependencies can be detected
* Dependency exceptions are governed
* Dependency remediation is verified
* Dependency drift is monitored
* Dependency security evidence is produced
* Runtime security dependency failures follow the W2 failure architecture
