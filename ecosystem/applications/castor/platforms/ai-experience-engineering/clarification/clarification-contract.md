# Clarification Contract

## 1. Purpose

This contract defines the structured representation of an ambiguous request and the clarification information required to resolve it.

The contract provides a consistent structure for preserving the original request, identifying the ambiguity, storing the required clarification, and tracking the resolution state.

---

## 2. Clarification Object

```json
{
  "id": "clarification-001",
  "original_request": "Send the report",
  "detected_intent": "send_report",
  "ambiguity_type": "missing_recipient",
  "missing_information": [
    "recipient"
  ],
  "clarification_question": "Who should receive the report?",
  "conversation_context": {
    "previous_messages": []
  },
  "resolution_status": "pending"
}
```

---

## 3. Field Definitions

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique clarification identifier |
| `original_request` | string | Original user request |
| `detected_intent` | string | Intent identified from the request |
| `ambiguity_type` | string | Category of detected ambiguity |
| `missing_information` | array | Required information that is missing |
| `clarification_question` | string | Question presented to the user |
| `conversation_context` | object | Relevant context required for continuity |
| `resolution_status` | string | Current clarification state |

---

## 4. Resolution Status

Supported statuses:

```text
pending
in_progress
resolved
unresolved
cancelled
```

---

## 5. Example — Missing Recipient

```json
{
  "id": "clarification-002",
  "original_request": "Send the weekly report",
  "detected_intent": "send_report",
  "ambiguity_type": "missing_recipient",
  "missing_information": [
    "recipient"
  ],
  "clarification_question": "Who should receive the weekly report?",
  "conversation_context": {
    "original_intent": "send_report"
  },
  "resolution_status": "pending"
}
```

---

## 6. Example — Missing Date and Time

```json
{
  "id": "clarification-003",
  "original_request": "Schedule a meeting with Sarah",
  "detected_intent": "schedule_meeting",
  "ambiguity_type": "missing_date_time",
  "missing_information": [
    "date",
    "time"
  ],
  "clarification_question": "What date and time should I schedule the meeting for?",
  "conversation_context": {
    "participant": "Sarah"
  },
  "resolution_status": "pending"
}
```

---

## 7. Contract Requirements

The clarification contract must:

1. Preserve the original request.
2. Identify the detected intent.
3. Identify the ambiguity type.
4. Explicitly identify missing information.
5. Store the clarification question.
6. Preserve relevant conversation context.
7. Track the current resolution status.
8. Support continuation of the original task after successful clarification.
9. Prevent execution while required information remains unresolved.

---

## 8. Context Preservation

The contract should preserve enough conversation context to connect the user's clarification response with the original request.

### Example

**Original request:**

> Schedule a meeting with Sarah.

**Clarification:**

> What date and time should I use?

**User response:**

> Tomorrow at 3 PM.

The resulting context should represent:

```text
Original Intent:
Schedule a meeting with Sarah.

Provided Information:
Date: Tomorrow
Time: 3 PM

Resolved Request:
Schedule a meeting with Sarah tomorrow at 3 PM.
```

---

## 9. Completion Condition

A clarification request is considered resolved when all required information needed to continue the original task has been provided and the resulting intent can be interpreted without guessing.

When the contract reaches the `resolved` state, the system may continue the original task through the appropriate AI Experience flow.

If required information is still missing, the contract should remain unresolved and additional clarification may be requested when necessary.
