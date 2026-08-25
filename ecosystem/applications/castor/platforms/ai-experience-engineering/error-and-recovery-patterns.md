# Error and Recovery Patterns

## Purpose

This specification defines reusable patterns for:

- Loading
- Failure
- Recovery
- Empty states
- User-visible processing
- Completion

The objective is to provide consistent and predictable feedback across AI experiences.

---

## Loading Pattern

### Purpose

Communicate that an AI interaction is currently processing.

### Entry Condition

A user interaction has been submitted and the experience is waiting for an approved response or transition.

### Requirements

The experience must:

- Provide visible processing feedback.
- Preserve the active interaction.
- Prevent confusing duplicate actions where appropriate.
- Maintain accessible status information.

### Transition

LOADING
↓
SUCCESS → RESPONSE / RECOMMENDATION / COMPLETION

or

LOADING
↓
FAILURE

---

## Failure Pattern

### Purpose

Communicate that the requested interaction could not be completed.

### Requirements

The experience must:

- Clearly communicate the failure.
- Avoid unnecessary internal implementation details.
- Preserve useful user input where possible.
- Provide an available recovery action.

### Transition

FAILURE
↓
RECOVERY

---

## Recovery Pattern

### Purpose

Provide a meaningful path after failure.

### Recovery Actions

#### Retry

Repeat the applicable interaction.

#### Modify Request

Allow the user to update the previous request.

#### Clarify Request

Request additional information when ambiguity or missing information prevents continuation.

#### Return

Allow the user to leave the failed interaction and return to an available previous experience.

---

## Recovery Flow

FAILURE
↓
RECOVERY OPTIONS
├── RETRY
├── MODIFY REQUEST
├── CLARIFY REQUEST
└── RETURN

---

## Empty State Pattern

### Purpose

Represent the absence of applicable content or results.

### Requirements

The Empty State should:

- Explain the current condition.
- Preserve relevant user context where useful.
- Offer a next action where applicable.
- Avoid unexplained blank experiences.

### Possible Actions

- Refine Request
- Modify Context
- Start New Interaction
- Return

---

## Completion Pattern

### Purpose

Communicate that the current interaction has reached an outcome.

### Available Actions

The completion experience may provide:

- Follow-Up
- Related Action
- New Interaction
- Contextual Navigation

---

## Accessibility Requirements

All feedback patterns must support:

- Understandable status communication.
- Accessible failure information.
- Discoverable recovery actions.
- Keyboard access where applicable.
- Supported assistive technologies.

---

## Responsive Requirements

Loading, failure, recovery, empty, and completion patterns must remain understandable and actionable across supported experience surfaces.

---

## Acceptance Criteria

Every applicable feedback pattern must define:

- Entry condition
- User-visible feedback
- Behavior
- State transition
- Recovery path where applicable
- Accessibility requirements
- Responsive behavior
