# AI Conversation Specifications

## Purpose

This document defines reusable conversation specifications for Castor AI experiences.

The purpose is to make AI interaction behavior explicit, predictable, and reusable across future Horquva products.

An AI conversation is treated as a sequence of interaction states rather than a single request-and-response event.

---

# 1. Conversation State Model

The standard conversation lifecycle is:

```text
Initial Interaction
        ↓
Active Conversation
        ↓
Clarification
        ↓
Recommendation
        ↓
Follow-up
        ↓
Completion
```

Additional states may occur throughout the lifecycle:

```text
Loading
Failure
Recovery
Empty State
```

---

# 2. Initial Interaction

## Purpose

Allow the user to begin an interaction with the AI system.

## Entry Conditions

- The user opens an AI interaction surface.
- No active conversation is currently selected.
- The system is ready to accept user input.

## User Intent

The user wants to ask a question, explore organizational information, request assistance, or begin a workflow.

## User-Visible State

The interface should provide:

- A clear AI identity.
- A short explanation of available assistance.
- Suggested starting actions when appropriate.
- An accessible input area.

## Expected Transition

```text
Initial Interaction
        ↓
User Input
        ↓
Loading
        ↓
Active Conversation
```

---

# 3. Active Conversation

## Purpose

Support an ongoing multi-turn interaction.

## Entry Conditions

- A user message has been submitted.
- Relevant approved context is available.

## User Intent

The user wants to continue exploring a question, task, or organizational topic.

## Behavior

The experience should:

- Preserve relevant conversation context.
- Clearly distinguish user input from AI responses.
- Maintain chronological interaction order.
- Allow follow-up questions.
- Avoid assuming a new user intent without sufficient context.

## Exit Conditions

The conversation may transition to:

- Clarification
- Recommendation
- Follow-up
- Completion
- Failure

---

# 4. Clarification State

## Purpose

Resolve ambiguity when the system cannot safely determine user intent or required context.

## Behavior

The AI experience should request clarification rather than silently assuming intent.

## Example Flow

```text
User Request
      ↓
Ambiguous Intent Detected
      ↓
Clarification Request
      ↓
User Provides Additional Information
      ↓
Context Updated
      ↓
Active Conversation
```

## User Control

The user should be able to:

- Answer the clarification.
- Modify the original request.
- Select a suggested interpretation when available.
- Cancel the interaction.

---

# 5. Recommendation State

## Purpose

Present approved AI-generated recommendations in a structured and understandable form.

## Response Structure

Recommendations should include:

1. Main recommendation
2. Relevant context
3. Supporting explanation
4. Available next actions

## User Control

The user should be able to:

- Ask a follow-up question.
- Request clarification.
- Explore supporting information.
- Continue the workflow.

---

# 6. Loading State

## Purpose

Communicate that an AI response is being prepared.

## Requirements

The experience should:

- Clearly communicate processing status.
- Avoid implying that the system has completed work when it has not.
- Preserve the user's submitted request.
- Maintain the conversation context.

---

# 7. Failure State

## Purpose

Communicate when an interaction cannot be completed.

## Requirements

The failure experience should:

- Explain the problem in understandable language.
- Preserve the user's input where possible.
- Avoid technical details that do not help the user recover.
- Provide a recovery action.

---

# 8. Recovery State

## Purpose

Allow the user to continue after an interruption or failure.

## Recovery Options

Possible recovery actions include:

- Retry the interaction.
- Edit the request.
- Clarify the request.
- Return to the previous conversation state.

---

# 9. Completion State

## Purpose

Provide a clear conclusion to an interaction while allowing future continuation.

## Requirements

The experience should:

- Present the final result clearly.
- Provide appropriate follow-up actions.
- Preserve context when continuation is relevant.
- Avoid forcing the user to restart unnecessarily.

---

# 10. Accessibility Requirements

All conversation states should support:

- Keyboard interaction.
- Semantic interface structure.
- Clear status communication.
- Accessible loading and error feedback.
- Understandable labels.

---

# 11. Responsive Requirements

The same conversation model should operate consistently across:

- Web
- Mobile
- Tablet
- Desktop

The presentation may adapt to screen size, but the fundamental interaction behavior should remain consistent.
