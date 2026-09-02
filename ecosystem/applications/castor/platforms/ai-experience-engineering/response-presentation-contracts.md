# AI Response Presentation Contracts

## Purpose

This document defines how approved AI outputs should be presented through the Castor experience layer.

The focus is on presentation and interaction behavior rather than AI reasoning or model implementation.

The goal is to provide consistent and understandable response experiences across Castor AI interactions.

---

## 1. Standard Response Contract

Each AI response should consider the following elements:

- Primary content
- Content hierarchy
- Relevant context
- Recommendations
- Clarification requirements
- Status information
- Loading behavior
- Failure behavior
- Recovery behavior
- Completion behavior
- Next actions

The response structure should adapt to the user's intent while maintaining clarity and consistency.

---

## 2. Response Hierarchy

A standard response should follow an understandable hierarchy:

Response
├── Primary Answer
├── Context
├── Supporting Information
├── Recommendation
└── Next Actions

Not every response requires every element.

The most relevant information should be presented first, with supporting information added when it helps the user understand or complete the task.

---

## 3. Content Rules

The interface should:

- Prioritize the most relevant information.
- Avoid unnecessary complexity.
- Clearly distinguish facts, explanations, and recommendations when applicable.
- Preserve relevant context.
- Provide understandable next actions.
- Avoid overwhelming the user with unnecessary choices.

---

## 4. Recommendation Presentation

Recommendations should not appear as unexplained commands.

When appropriate, the experience should communicate:

Recommendation
↓
Relevant Context
↓
Supporting Explanation
↓
Available Action

Recommendations should be relevant to the user's current intent and provide enough context for the user to understand the suggested action.

---

## 5. Clarification Presentation

When additional information is required, the experience should clearly communicate what is missing or ambiguous.

The clarification experience should:

- Ask a focused question.
- Provide suggested options when useful.
- Preserve the user's original request.
- Allow the user to continue after providing clarification.

---

## 6. Status and Loading Presentation

The user should be able to understand the current state of the interaction.

Supported states may include:

- Ready
- Processing
- Waiting for clarification
- Completed
- Failed
- Recovering

Loading and status feedback should be clear, timely, and consistent with the actual interaction state.

---

## 7. Failure and Recovery Presentation

When an interaction cannot be completed, the experience should:

- Explain the problem in understandable language.
- Avoid unnecessary technical details.
- Preserve the user's request where possible.
- Provide a clear recovery action.

Possible recovery actions include:

- Retry
- Edit request
- Provide missing information
- Clarify request

---

## 8. Completion and Next Actions

When an interaction is successfully completed, the experience should present the result clearly.

Where appropriate, the user should be able to:

- Ask a follow-up question.
- Continue the current workflow.
- Explore supporting information.
- Modify the original request.

The experience should preserve relevant context when continuation is expected.

---

## 9. Design System Dependency

All response presentation must use approved Castor Design System components.

The experience should not introduce an independent AI-specific visual language.

AI response presentation should follow approved design tokens, reusable components, and established interaction patterns to maintain consistency across Castor products.

---

## Conclusion

These AI Response Presentation Contracts provide reusable standards for presenting approved AI outputs through the Castor experience layer.

The contracts focus on clear response hierarchy, content presentation, recommendations, clarification, status handling, failure recovery, completion, and Design System alignment.
