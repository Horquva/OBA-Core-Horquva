# Clarification Dialogue Specification

## 1. Purpose

This document defines the conversational behavior used when the AI needs additional information from the user.

The clarification experience should be short, contextual, and directly connected to the user's original request.

The system should preserve the original intent while collecting only the information required to continue safely and accurately.

---

## 2. Dialogue States

The clarification dialogue contains the following states:

```text
INITIAL_REQUEST
      ↓
AMBIGUITY_DETECTED
      ↓
CLARIFICATION_REQUESTED
      ↓
USER_RESPONSE
      ↓
CONTEXT_UPDATED
      ↓
RESOLUTION_CHECK
      ↓
TASK_CONTINUED
```

If the response is still incomplete:

```text
USER_RESPONSE
      ↓
RESOLUTION_CHECK
      ↓
INFORMATION_STILL_MISSING
      ↓
CLARIFICATION_REQUESTED
```

---

## 3. Initial Request

The system receives the user's original command.

**Example:**

> Schedule a meeting.

The request is evaluated for required information before execution.

---

## 4. Ambiguity Detection

The system determines whether the request contains enough information to continue.

If required information is missing or the request has multiple possible interpretations, execution should pause until the ambiguity is resolved.

---

## 5. Clarification Request

The AI should ask a direct and focused question.

**Example:**

> Who should I schedule the meeting with?

The question should focus only on the missing information required to continue.

---

## 6. Context Preservation

The original request must remain available during the clarification exchange.

### Example

**Original request:**

> Schedule a meeting with Sarah.

**Clarification:**

> What date and time should I use?

**User response:**

> Tomorrow at 3 PM.

The system should combine both messages:

```text
Original Intent:
Schedule a meeting with Sarah.

Clarification:
Tomorrow at 3 PM.

Resolved Request:
Schedule a meeting with Sarah tomorrow at 3 PM.
```

The clarification response must be interpreted in relation to the original request rather than as an unrelated new command.

---

## 7. Multiple Clarifications

If more than one required value is missing, the system may request multiple related values in one concise question.

**Example:**

> Schedule a meeting.

**Response:**

> Who should attend, and what date and time should I use?

However, questions should remain understandable and should not overwhelm the user with unnecessary information.

---

## 8. Still Ambiguous

If the user's response does not resolve the ambiguity, the system should ask a more specific question.

**Example:**

**User:**

> Schedule it sometime tomorrow.

**AI:**

> What time tomorrow would you like the meeting scheduled?

The system should only request the information that remains missing.

---

## 9. Successful Resolution

Once all required information is available, the system should leave the clarification state and continue the original task.

```text
Resolution Status: RESOLVED
Next State: TASK_CONTINUED
```

The system should preserve the resolved intent and pass the sufficiently specified request to the next stage of the AI Experience flow.

---

## 10. Failed Resolution

If the user cannot provide the required information, the system should gracefully stop or keep the request pending rather than guessing.

```text
Resolution Status: UNRESOLVED
Next State: WAITING_FOR_USER
```

No action requiring unresolved information should be performed.

---

## 11. Dialogue Principles

- Be concise.
- Ask only necessary questions.
- Preserve previous context.
- Never fabricate missing information.
- Do not restart the conversation unnecessarily.
- Avoid asking for information that has already been provided.
- Confirm critical details when required.
- Keep clarification questions directly connected to the original request.
- Continue the original task after successful clarification.
- Ask additional clarification questions only when required information is still missing.
