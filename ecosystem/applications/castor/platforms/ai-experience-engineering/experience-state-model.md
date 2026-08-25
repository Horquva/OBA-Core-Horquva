# Experience State Model

## Purpose

The Experience State Model defines the applicable states, transitions, and user-visible behavior required for a predictable AI interaction experience.

The objective is to prevent undefined interaction behavior.

---

## State Model

An AI interaction may move through the following states:

INITIAL
↓
ACTIVE
↓
LOADING
↓
RESPONSE
↓
FOLLOW-UP
↓
COMPLETION

Additional transitions may include:

ACTIVE → CLARIFICATION

LOADING → FAILURE

FAILURE → RECOVERY

ACTIVE → RECOMMENDATION

ACTIVE → EMPTY

---

## Initial State

### Purpose

The Initial State represents an available AI experience before the user begins an interaction.

### User-Visible Behavior

The experience may provide:

- An AI interaction entry point.
- Available suggestions.
- Relevant context.
- A clear prompt or action to begin.

### Allowed Transitions

INITIAL → ACTIVE

INITIAL → CLARIFICATION

---

## Active State

### Purpose

The Active State represents an ongoing user interaction.

### User-Visible Behavior

The experience may support:

- User interaction.
- Approved AI output.
- Context awareness.
- Suggested actions.
- Follow-up interaction.

### Allowed Transitions

ACTIVE → LOADING

ACTIVE → CLARIFICATION

ACTIVE → RECOMMENDATION

ACTIVE → FOLLOW-UP

ACTIVE → FAILURE

ACTIVE → COMPLETION

---

## Focus State

### Purpose

The Focus State represents active user attention on an interactive element.

### Requirements

Focus behavior must:

- Remain visible where applicable.
- Support keyboard navigation.
- Support accessible interaction.
- Remain predictable during state changes.

---

## Clarification State

### Purpose

The Clarification State is entered when additional information is required before an interaction can continue.

### User-Visible Behavior

The experience must:

- Clearly request the required information.
- Preserve relevant interaction context.
- Allow the user to refine or correct the interaction.

### Allowed Transitions

CLARIFICATION → ACTIVE

CLARIFICATION → FAILURE

---

## Loading State

### Purpose

The Loading State communicates that an interaction is being processed.

### Requirements

The experience must:

- Provide visible processing feedback.
- Preserve the active interaction.
- Prevent unnecessary duplicate actions where applicable.
- Maintain accessible status communication.

### Allowed Transitions

LOADING → RESPONSE

LOADING → RECOMMENDATION

LOADING → FAILURE

LOADING → COMPLETION

---

## Failure State

### Purpose

The Failure State represents an interaction that could not be completed.

### User-Visible Behavior

The experience must:

- Clearly communicate the failure.
- Avoid unnecessary internal technical details.
- Preserve useful interaction context where possible.
- Provide a recovery path.

### Allowed Transition

FAILURE → RECOVERY

---

## Recovery State

### Purpose

The Recovery State provides the user with an available path after a failed interaction.

### Recovery Actions

Available actions may include:

- Retry
- Modify Request
- Clarify Request
- Return

### Allowed Transitions

RECOVERY → ACTIVE

RECOVERY → CLARIFICATION

RECOVERY → COMPLETION

---

## Empty State

### Purpose

The Empty State represents the absence of applicable content or results.

### Requirements

The experience should:

- Explain the current condition.
- Avoid unexplained empty experiences.
- Provide a meaningful next action where applicable.

---

## Recommendation State

### Purpose

The Recommendation State presents an approved recommendation within an AI interaction.

### Requirements

The experience should clearly distinguish:

- Context
- Available insight
- Recommendation
- Available next action

### Allowed Transitions

RECOMMENDATION → FOLLOW-UP

RECOMMENDATION → CLARIFICATION

RECOMMENDATION → COMPLETION

---

## Follow-Up State

### Purpose

The Follow-Up State represents continuation of an existing interaction.

### Requirements

The experience must:

- Preserve relevant context.
- Support continued interaction.
- Allow refinement.
- Request clarification when continuity is uncertain.

---

## Completion State

### Purpose

The Completion State represents the current outcome of an interaction.

### Available Next Actions

The experience may provide:

- Follow-Up
- Related Action
- New Interaction
- Contextual Navigation

---

## State Definition Requirements

Every applicable state must define:

- Purpose
- Entry condition
- User-visible behavior
- Available actions
- State transitions
- Exit condition
- Recovery behavior where applicable
- Accessibility requirements
- Responsive requirements

---

## Acceptance Criteria

The Experience State Model is complete when applicable AI interactions do not contain undefined states or undefined user-visible transitions.
