## Schema Validation Contract

###  Purpose

W2 shall provide a centralized Validation Engine as an application-security control at the protected application boundary.

The Validation Engine shall validate applicable request structure and data characteristics before the request proceeds to threat detection and protected business logic.

### Position in Request Lifecycle

Schema validation shall occur according to the locked W2 request lifecycle:

**Request → Identity → Authorization → Schema → Threat Scan → Business Logic → Output Protection → Audit**

No request that fails required schema or request-boundary validation shall proceed to protected business logic.

### Supported Validation Controls

The W2 Validation Engine shall support, where applicable:

* JSON Schema
* Required fields
* Data types
* String length constraints
* Numeric constraints
* Enumerations
* Arrays
* Nested structures
* Object constraints
* Pattern validation
* Content-type validation
* Payload-size limits
* Unknown-field rejection where required
* Schema versioning
* Schema ownership
* Schema lifecycle management

### Schema Definition

Each protected request type shall reference an applicable schema or schema definition sufficient to establish the expected request structure and constraints.

Schemas shall be maintained as governed security artifacts rather than as undocumented application-local validation logic.

The exact schema registry, storage mechanism, and distribution model remain implementation decisions.

### Schema Ownership

Each production schema shall have an identified owner responsible for:

* Definition
* Review
* Versioning
* Test coverage
* Deployment approval
* Runtime monitoring
* Controlled updates

No production schema shall be treated as ownerless.

### Schema Lifecycle

The controlled schema lifecycle shall be:

**Define → Review → Version → Test → Deploy → Validate → Monitor → Update**

Schema changes shall be traceable to the applicable version and approval process.

### Schema Versioning

W2 shall support versioned schemas.

The applicable schema version shall be identifiable for each protected request where schema versioning is required.

Schema-version changes shall be tested before production deployment.

The exact version-negotiation and compatibility mechanism shall be defined by the API contract and schema governance specification.

### Request Boundary Validation

Before application processing continues, W2 shall validate applicable request-boundary characteristics including:

* Content type
* Payload size
* Required request structure
* Applicable schema
* Applicable field constraints

Where the applicable schema requires rejection of unknown fields, W2 shall enforce that requirement.

### Validation Failure

If required schema validation fails, W2 shall:

1. Reject the request.
2. Prevent protected business logic from executing.
3. Produce a deterministic security outcome.
4. Generate the applicable audit information.
5. Generate appropriate security telemetry.
6. Return the approved secure error response.

The exact error representation shall be defined by the API error contract.

### Negative Validation Requirements

The Validation Engine shall be tested against, at minimum:

* Missing required fields
* Wrong data type
* Oversized field
* Oversized payload
* Invalid enumeration
* Invalid nested object
* Invalid array
* Unexpected field
* Invalid encoding
* Malformed JSON
* Wrong content type
* Schema version mismatch

Every rejected request shall produce deterministic behavior.

### Layered Input Security

Schema validation shall not be treated as the sole input-security mechanism.

W2 application security shall use layered controls where applicable, including:

* Schema validation
* Contextual encoding
* Parameterization
* Threat detection
* Secure application APIs

Regular-expression matching shall not be treated as the sole security defense.

### Validation and Threat Detection Separation

Schema validation determines whether the request conforms to the applicable structural and data constraints.

Threat detection separately evaluates the request for approved application-layer security threats.

A structurally valid request may still be subject to threat detection.

Therefore:

**Schema Valid ≠ Security Safe**

### Validation Decision Integrity

Validation results shall be recorded in the W2 security context and shall be available to the subsequent security-decision, audit, telemetry, and evidence processes.

Validation results shall not be overridden by application code in a manner that permits a failed security validation to reach protected business logic.
