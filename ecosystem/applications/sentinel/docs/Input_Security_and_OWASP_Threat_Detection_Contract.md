## Input Security and OWASP Threat Detection Contract

### Purpose

W2 shall provide layered application-layer input security controls to reduce the risk of malicious or abusive input reaching protected application logic.

Threat detection shall operate as a security control in addition to schema validation and shall not be treated as the sole input-security mechanism.

### Threat Detection Position

Threat detection shall execute according to the locked W2 request lifecycle:

**Request → Identity → Authorization → Schema → Threat Scan → Business Logic → Output Protection → Audit**

No request shall silently bypass the applicable threat-detection stage.

### Protected Threat Categories

The W2 input-security architecture shall support approved detection and defensive controls for applicable application-layer threats including:

* SQL Injection
* Cross-Site Scripting
* Path Traversal
* Command-injection-like payloads where applicable
* Malformed encoding
* Unexpected characters
* Oversized input
* Nested payload abuse
* Invalid content types
* Parser abuse
* Suspicious payload structures
* Other approved OWASP application-layer threats

### Layered Input Security

W2 shall not depend on a single detection mechanism.

Applicable protections shall include layered controls such as:

* Schema validation
* Contextual encoding
* Parameterization
* Threat detection
* Secure application APIs

Regular-expression matching shall not be treated as the sole security defense.

### OWASP Rules Engine

W2 shall provide a governed threat-detection Rules Engine for approved application-layer security threats.

The Rules Engine shall execute applicable rules against protected request inputs according to the request security lifecycle and applicable security policy.

### Rule Definition

Every operational security rule shall contain, at minimum:

* Rule ID
* Rule category
* Severity
* Description
* Detection logic
* Version
* Owner
* Test fixtures
* Expected behavior
* False-positive considerations
* Evidence requirements

### Rule Lifecycle

The governed rule lifecycle shall be:

**Create → Review → Test → Version → Approve → Deploy → Execute → Monitor → Improve**

No security rule shall enter operational use without test coverage.

### Rule Testing

Each security rule shall be tested against, at minimum:

* Known malicious payload
* Known benign payload
* Edge-case payload
* Encoded payload
* Case variation
* Nested payload
* False-positive scenario
* Rule conflict
* Rule regression

Test results shall establish both detection effectiveness and legitimate-input behavior.

### False-Positive Management

Rules shall include explicit consideration of false positives.

Benign fixtures shall be maintained for applicable rules.

False-positive behavior shall be monitored after deployment and shall feed the controlled rule-improvement lifecycle.

Security effectiveness shall not be achieved by indiscriminately blocking legitimate application traffic.

### Rule Conflicts

The Rules Engine and Security Decision Engine shall provide deterministic handling when multiple security rules produce conflicting or overlapping results.

The conflict-resolution behavior shall be documented, tested, version controlled, and auditable.

### Detection Result

Where a rule executes, W2 shall retain sufficient rule-execution information in the security context to support:

* Security decision-making
* Audit
* Security telemetry
* Evidence
* Incident investigation
* Reproducibility

Applicable information shall include the rule identifier, category, severity, version, execution result, and applicable evidence reference.

### Threat Detection Failure

Threat-engine failure shall be treated as a defined security dependency failure.

Where continued processing would create an unacceptable security bypass, W2 shall apply the approved fail-closed behavior.

Threat-engine failures shall generate the applicable audit and security telemetry.

The exact timeout, retry, availability, and degraded-operation behavior shall be defined by the runtime dependency-failure specification.

### Input Security Principle

Application security shall not depend on one detection mechanism.

The W2 architecture shall reduce attack surface through multiple independent and complementary controls.

Therefore:

**Schema Valid ≠ Threat Free**

and:

**Detection by one mechanism ≠ Complete Input Security**

### Security Evidence

Rule execution and threat-detection outcomes shall produce sufficient evidence to establish:

* Which rule executed
* Rule version
* Detection result
* Applicable severity
* Security decision
* Request correlation
* Timestamp
* Environment
* Application/service
* Applicable audit reference

Security evidence shall be generated from actual rule execution and actual test results rather than assumed outcomes.
