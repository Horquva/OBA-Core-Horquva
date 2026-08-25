# Reusable AI Interaction Patterns

## Purpose

This document defines reusable AI interaction patterns that can support multiple Castor experience surfaces.

The objective is to prevent isolated or one-off AI interaction implementations.

---

# AI Conversation Surface

## Purpose

Provide a reusable surface for AI-assisted interaction.

## Components

The conversation surface may include:

- Interaction history
- AI input
- Approved AI output
- Suggested actions
- Follow-up actions
- Context indicators

## Applicable States

- Initial
- Active
- Loading
- Clarification
- Failure
- Recovery
- Empty
- Completion

---

# AI Input Pattern

## Purpose

Provide a reusable entry point for AI interaction.

## Requirements

The pattern must support:

- Clear interaction entry.
- Predictable submission.
- Processing feedback.
- Failure handling.
- Recovery actions.
- Accessibility.
- Responsive behavior.
- User control.

---

# Suggested Action Pattern

## Purpose

Help users discover relevant next interactions.

## Requirements

Suggested actions must:

- Remain relevant to available context.
- Be optional.
- Preserve direct user interaction.
- Lead to valid experience transitions.

---

# Clarification Pattern

## Purpose

Handle interaction ambiguity.

## Flow

AMBIGUITY
↓
CLARIFICATION
↓
USER RESPONSE
↓
CONTEXT UPDATE
↓
CONTINUED INTERACTION

---

# Follow-Up Pattern

## Purpose

Continue an existing interaction.

## Requirements

The pattern must:

- Preserve relevant context.
- Support refinement.
- Support continued interaction.
- Request clarification when continuity is uncertain.

---

# Context Indicator Pattern

## Purpose

Represent relevant interaction context.

## Requirements

The pattern should:

- Make active context understandable.
- Support interaction continuity.
- Surface meaningful context changes.
- Avoid unnecessary internal implementation details.

---

# Recommendation Pattern

## Purpose

Present an approved recommendation within an AI experience.

## Structure

Context
↓
Available Insight
↓
Recommendation
↓
Available Action

---

## Pattern Reuse

All reusable AI interaction patterns should support consistent behavior across approved Castor experience surfaces.

The visual presentation may adapt to the surface, but the interaction meaning must remain consistent.
