# User Intent Continuity

## Purpose

This specification defines how Castor AI experiences maintain continuity between related user interactions.

The goal is to preserve relevant user intent while allowing users to change direction when needed.

---

## Intent Flow

User Intent
↓
Context
↓
Interaction
↓
AI Response
↓
Follow-up Intent
↓
Context Continuity
↓
Next Interaction

---

## Continuity Requirements

The experience should:

- Preserve relevant intent across follow-up interactions.
- Avoid repeating questions when relevant information is already available.
- Detect when the user introduces a new topic.
- Request clarification when continuity cannot be safely inferred.
- Allow users to intentionally change direction.

---

## New Intent Detection

A new user request may:

- Continue the existing interaction.
- Refine the existing request.
- Change the current objective.
- Begin an unrelated interaction.

When the relationship between the current and previous intent is unclear, clarification should be preferred over assumption.

---

## User Control

Users should remain able to:

- Change their request.
- Correct context.
- Start a new interaction.
- Return to a previous conversation when supported.
