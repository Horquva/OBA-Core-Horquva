# Reusable AI Experience Pattern Contract

## Purpose

Every reusable AI Experience pattern must follow a consistent engineering contract.

This contract ensures that patterns are sufficiently defined for implementation and reuse.

---

# Pattern Name

Define the unique name of the reusable pattern.

---

# Purpose

Define why the pattern exists and what interaction problem it addresses.

---

# Applicable Use Cases

Define where the pattern may be used.

---

# Variants

Define supported interaction variations.

Variants should not create unrelated implementations of the same interaction pattern.

---

# States

Define all applicable states.

Examples include:

- Initial
- Active
- Focus
- Loading
- Clarification
- Failure
- Recovery
- Empty
- Recommendation
- Follow-Up
- Completion

---

# Behavior

Define:

- Available user actions.
- Expected experience behavior.
- State transitions.
- Follow-up behavior.

---

# Context Requirements

Define:

- Required context.
- Visible context.
- Inferable context.
- Continuity requirements.
- Clarification requirements.

---

# Accessibility

Define applicable requirements for:

- Keyboard interaction.
- Focus behavior.
- Assistive technology.
- Status feedback.
- Error communication.
- Recovery actions.

---

# Responsive Behavior

Define expected behavior across supported devices and experience surfaces.

---

# Content Rules

Define:

- Content hierarchy.
- Required information.
- Optional information.
- Clarification content.
- Recommendation presentation.
- Error messaging.
- Recovery messaging.

---

# Error Handling

Define:

- Failure conditions.
- User-visible failure behavior.
- Preserved context.
- Available recovery actions.

---

# Loading Behavior

Define:

- Processing feedback.
- Duplicate action handling.
- Context preservation.
- Resulting state transitions.

---

# User-Control Requirements

Define which actions remain under user control.

The pattern must not silently replace explicit user intent with unsupported assumptions.

---

# Design System Dependencies

Identify applicable approved Design System components and interaction standards.

---

# Integration Dependencies

Identify applicable integration requirements with:

- Frontend Engineering
- Executive Workspace
- Visualization Platform
- Other approved Castor platforms

---

## Pattern Completion Checklist

A reusable AI Experience pattern is complete when all applicable sections of this contract have been defined.
