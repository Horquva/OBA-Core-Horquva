# Prompt Experience Specifications

## Purpose

This document defines reusable prompt and conversation interaction structures for Castor AI experiences.

The goal is to create predictable, consistent, and reusable AI interaction behavior across Castor experiences while maintaining clear user control and context continuity.

---

## 1. Prompt Structure

A reusable prompt experience should support the following interaction structure:

User Intent
↓
Relevant Context
↓
User Request
↓
Clarification if Required
↓
Approved AI Capability
↓
Response
↓
Follow-up Interaction

The structure may adapt depending on the user's intent, available context, and type of interaction.

The AI experience should not assume missing information when clarification is required.

---

## 2. AI Greeting Pattern

The initial AI experience should:

- Clearly communicate what assistance is available.
- Avoid unnecessary or overly long introductions.
- Provide useful starting actions when appropriate.
- Maintain a professional, clear, and understandable tone.
- Help the user understand how to begin the interaction.
- Avoid making assumptions about the user's intent before a request is provided.

---

## 3. Clarification Pattern

Clarification should occur when:

- User intent is ambiguous.
- Required context is missing.
- Multiple interpretations are possible.
- The requested action is outside the available AI capability.
- Continuing would require an unsafe or unsupported assumption.

The clarification experience should:

1. Explain what information is needed.
2. Ask a focused and understandable question.
3. Offer suggested options when useful.
4. Allow the user to modify or clarify the original request.
5. Preserve relevant context from the original request.
6. Return to the active conversation after clarification.

### Example Flow

User Request
↓
Ambiguous Intent Detected
↓
Clarification Question
↓
User Provides Information
↓
Context Updated
↓
Active Conversation

---

## 4. Response Structure

A standard AI response should use an understandable hierarchy:

Primary Answer
↓
Relevant Context
↓
Supporting Explanation
↓
Recommendation or Next Action
↓
Follow-up Opportunity

Not every response requires every section.

The response structure should adapt to the user's intent, context, and task while keeping the primary answer clear and actionable.

Responses should avoid unnecessary information that does not help the user complete the current task.

---

## 5. Loading and Processing Pattern

The AI experience should clearly communicate when a response is being prepared.

During loading or processing:

- The interface should provide clear processing feedback.
- The user's submitted request should remain visible or preserved where possible.
- The system should not imply that a response is complete before processing finishes.
- The user should understand that the system is still working.
- Loading feedback should remain consistent across supported experiences.

### Example Flow

User Request
↓
Request Submitted
↓
Loading / Processing
↓
AI Response

---

## 6. Suggestion Pattern

Suggestions should:

- Be relevant to the current conversation context.
- Help the user continue the current workflow.
- Avoid overwhelming the user with unnecessary choices.
- Clearly communicate the possible next action.
- Provide useful alternatives when multiple paths are appropriate.
- Remain optional rather than forcing a specific action.

Suggestions should support the user's decision-making and provide clear next steps.

---

## 7. Recommendation Pattern

AI-generated recommendations should be presented in a clear and understandable structure.

A recommendation should include, when relevant:

1. Main recommendation.
2. Relevant context.
3. Supporting explanation.
4. Important considerations.
5. Available next actions.

Recommendations should:

- Be relevant to the user's current intent.
- Use available approved context.
- Clearly distinguish recommendations from confirmed facts.
- Allow the user to request clarification.
- Allow the user to continue or modify the workflow.

### Example Flow

User Intent
↓
Relevant Context
↓
AI Recommendation
↓
Supporting Explanation
↓
User Decision
↓
Follow-up or Next Action

---

## 8. Follow-up Pattern

After receiving a response, the user may:

- Ask another question.
- Request clarification.
- Explore a recommendation.
- Change the current task.
- Continue the existing workflow.
- End the interaction.

The experience should preserve relevant context while allowing the user to introduce a new intent when appropriate.

The system should avoid unnecessarily restarting the conversation when sufficient context is already available.

---

## 9. Context Continuity

The AI experience should preserve relevant context throughout an active conversation.

Context continuity should:

- Maintain relevant information from previous turns.
- Avoid repeatedly asking for information already provided.
- Use previous context when responding to follow-up questions.
- Allow the user to change or correct previously provided information.
- Prevent irrelevant context from affecting a new request.
- Preserve the current workflow when the user asks a related follow-up question.

Context should be used only when it remains relevant to the user's current intent.

---

## 10. Error and Failure Pattern

When an interaction cannot be completed, the experience should clearly communicate the failure and provide a path forward.

The failure experience should:

- Explain the problem in understandable language.
- Avoid unnecessary technical details.
- Preserve the user's request whenever possible.
- Clearly communicate that the requested action was not completed.
- Provide an appropriate recovery option.

### Example Flow

User Request
↓
Processing
↓
Failure
↓
Clear Explanation
↓
Recovery Option

---

## 11. Recovery Pattern

After a failure or interruption, the user should be able to continue without unnecessarily restarting the entire interaction.

Possible recovery actions include:

- Retry the interaction.
- Edit the original request.
- Provide missing information.
- Clarify the request.
- Return to the previous conversation state.

### Example Flow

Failure
↓
Clear Explanation
↓
Recovery Option
↓
Retry / Edit / Clarify
↓
Active Conversation

The system should preserve user work and relevant context whenever possible.

---

## 12. Interaction State Transitions

The AI experience should support predictable transitions between conversation states.

A standard interaction may follow:

Initial Interaction
↓
User Input
↓
Loading
↓
Active Conversation
↓
Clarification / Recommendation / Follow-up
↓
Completion

Additional states may occur when required:

- Loading
- Failure
- Recovery
- Empty State

The exact transition depends on the user's intent and the current state of the interaction.

---

## 13. User Control

The user should remain in control of the interaction throughout the conversation.

The experience should allow the user to:

- Modify the original request.
- Provide additional context.
- Ask follow-up questions.
- Request clarification.
- Accept or ignore recommendations.
- Retry after a failure.
- End the interaction.

The AI should assist the user without unnecessarily forcing a particular workflow.

---

## 14. Interaction Consistency

Reusable prompt experiences should maintain consistent behavior across supported Castor AI experiences.

The interaction should:

- Follow predictable conversation patterns.
- Use consistent terminology.
- Provide clear transitions between interaction states.
- Maintain understandable user feedback.
- Support clarification, loading, recovery, recommendations, and follow-up interactions.
- Preserve relevant context across related interactions.

The exact wording and presentation may vary by product, but the underlying interaction behavior should remain consistent.

---

## 15. Accessibility Considerations

Prompt and conversation experiences should remain accessible to users across supported interfaces.

The experience should support:

- Clear and understandable labels.
- Keyboard interaction where applicable.
- Readable response structure.
- Clear loading and status feedback.
- Understandable error and recovery messages.
- Consistent interaction patterns.

Accessibility should be considered across all conversation states rather than only the initial interaction.

---

## 16. Responsive Experience

The conversation model should remain consistent across supported platforms and screen sizes.

The experience may adapt its presentation for:

- Web
- Mobile
- Tablet
- Desktop

The visual presentation may change based on the available screen size, but the fundamental interaction behavior should remain consistent.

---

## 17. Design Principles

The following principles should guide reusable Castor AI interaction experiences:

- Clarity: Users should understand what the AI is doing and what they can do next.
- Consistency: Similar interactions should follow predictable patterns.
- Context Continuity: Relevant conversation context should be preserved.
- User Control: Users should be able to modify, clarify, continue, or end an interaction.
- Recoverability: Failed interactions should provide a clear path forward.
- Adaptability: Responses and interaction patterns should adapt to user intent.
- Accessibility: Conversation experiences should remain understandable and usable across supported interfaces.
- Reusability: Interaction patterns should be applicable across future Castor AI experiences.

---

## Conclusion

These prompt experience specifications provide a reusable foundation for designing consistent AI interactions within Castor.

The patterns cover the complete interaction lifecycle, including initial interaction, prompt structure, clarification, loading, responses, suggestions, recommendations, follow-up interactions, context continuity, failure, recovery, user control, accessibility, and responsive behavior.

The specifications are intended to guide future AI experience implementations while allowing individual products to adapt presentation and wording to their specific requirements.
