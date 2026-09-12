# Clarification & Ambiguity Resolution

## Castor — AI Experience Engineering

This module defines the AI Experience behavior for handling ambiguous, incomplete, or unclear user requests.

The purpose is to prevent the AI from taking an incorrect action when required information is missing or when a user request has multiple possible interpretations.

---

## Objectives

The Clarification & Ambiguity Resolution layer is responsible for:

- Detecting incomplete user requests
- Identifying ambiguous commands
- Intercepting requests before an incorrect action is performed
- Generating structured clarification questions
- Preserving the original user intent
- Maintaining conversation context during clarification
- Continuing the original task after clarification is resolved
- Providing graceful fallback behavior when clarification cannot be completed

---

## Clarification Flow

The expected interaction flow is:

```text
User Request
     ↓
Intent Detection
     ↓
Ambiguity Check
     ↓
Required Information Check
     ↓
Clarification Request
     ↓
User Response
     ↓
Context Update
     ↓
Intent Re-evaluation
     ↓
Continue Original Task
```

---

## Supported Ambiguity Types

### 1. Missing Target

The user requests an action but does not specify which object, document, file, or resource should be used.

**Example:**

> Open the document.

The AI should ask which document the user means.

---

### 2. Missing Recipient

The user requests an action involving another person but does not specify who should receive or be affected by the action.

**Example:**

> Send the report.

The AI should ask who should receive the report.

---

### 3. Missing Date

The user requests a time-based action without providing the required date.

**Example:**

> Schedule a meeting with Sarah.

The AI should ask which date the meeting should be scheduled for.

---

### 4. Missing Time

The user provides a date but does not provide a required time.

**Example:**

> Schedule a meeting with Sarah tomorrow.

The AI should ask what time the meeting should be scheduled.

---

### 5. Missing Required Parameter

The user provides an action but leaves out another parameter required to complete it.

**Example:**

> Create a reminder.

The AI should request the information required to create the reminder.

---

### 6. Multiple Possible Interpretations

The user's request can reasonably be interpreted in more than one way.

**Example:**

> Open the report.

If multiple reports are available, the AI should ask which report the user means instead of selecting one without confirmation.

---

### 7. Unclear Action

The user provides an object or goal but does not clearly specify what action should be performed.

**Example:**

> Do something with the sales report.

The AI should ask what the user wants to do with the report.

---

### 8. Insufficient Context

The request depends on information that is not available from the current conversation context.

**Example:**

> Send it to her.

If the referenced file and recipient cannot be reliably identified, the AI should request clarification.

---

## Ambiguity Resolution Rules

When ambiguity is detected, the system should:

1. Detect the user's intended action.
2. Identify the missing or unclear information.
3. Determine whether that information is required to continue.
4. Generate a focused clarification question.
5. Preserve the original user request.
6. Preserve relevant conversation context.
7. Wait for the user's clarification.
8. Merge the clarification with the original request.
9. Re-evaluate the complete request.
10. Continue the original task when sufficient information is available.

The system must not silently select an interpretation when the request could result in an incorrect action.

---

## Clarification Dialogue

The clarification dialogue follows the following state flow:

```text
INITIAL REQUEST
      ↓
AMBIGUITY DETECTED
      ↓
CLARIFICATION REQUESTED
      ↓
USER RESPONSE
      ↓
CONTEXT UPDATED
      ↓
RESOLUTION CHECK
      ↓
TASK CONTINUED
```

If the user's response is still incomplete:

```text
USER RESPONSE
      ↓
RESOLUTION CHECK
      ↓
INFORMATION STILL MISSING
      ↓
CLARIFICATION REQUESTED
      ↓
USER RESPONSE
      ↓
RESOLUTION CHECK
```

### Initial Request

The system receives the user's original request and determines the intended action.

### Ambiguity Detection

The system checks whether the request contains missing information or multiple possible interpretations.

### Clarification Request

The system asks a concise question focused only on the information required to continue.

### User Response

The user provides the missing information.

### Context Update

The clarification response is added to the existing conversation context.

### Resolution Check

The system evaluates whether the original request is now sufficiently clear.

### Task Continuation

When the request is resolved, the system continues the original task.

The clarification response should not be treated as an unrelated new request.

---

## Design Principles

### 1. Do Not Guess

The AI should not invent missing information.

### 2. Preserve Intent

The original user request must remain available throughout the clarification process.

### 3. Ask Focused Questions

Questions should request only the information required to resolve the ambiguity.

### 4. Avoid Repeating Information

The AI should not ask for information that the user has already provided.

### 5. Preserve Context

Relevant information from earlier conversation turns must remain available during clarification.

### 6. Resume the Original Task

After clarification, the AI should continue the original task instead of restarting the conversation.

### 7. Minimize Clarification Turns

The AI should request the required information efficiently without creating unnecessary back-and-forth dialogue.

---

## Clarification Contract

A clarification request should maintain a structured representation of the unresolved request.

The conceptual contract contains:

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
  "conversation_context": {},
  "resolution_status": "pending"
}
```

### Contract Fields

| Field | Description |
|---|---|
| `id` | Unique identifier for the clarification request |
| `original_request` | Original user request |
| `detected_intent` | Interpreted user intent |
| `ambiguity_type` | Type of ambiguity detected |
| `missing_information` | Information required to continue |
| `clarification_question` | Question presented to the user |
| `conversation_context` | Relevant context preserved during clarification |
| `resolution_status` | Current clarification state |

### Resolution Status

Supported statuses include:

- `pending`
- `in_progress`
- `resolved`
- `unresolved`
- `cancelled`

A clarification is considered `resolved` when all required information has been provided and the original request can be interpreted without guessing.

---

## Examples

### Example 1 — Missing Recipient

**User:**

> Send the report.

**AI:**

> Which report would you like me to send, and who should receive it?

**User:**

> Send the weekly sales report to Sarah.

**Resolved Request:**

```text
Action: Send report
Report: Weekly sales report
Recipient: Sarah
Status: Resolved
```

---

### Example 2 — Missing Date and Time

**User:**

> Schedule a meeting with Sarah.

**AI:**

> What date and time should I schedule the meeting?

**User:**

> Tomorrow at 3 PM.

**Resolved Request:**

```text
Action: Schedule meeting
Participant: Sarah
Date: Tomorrow
Time: 3 PM
Status: Resolved
```

---

### Example 3 — Missing Time

**User:**

> Schedule a meeting with Sarah tomorrow.

**AI:**

> What time should I schedule the meeting?

**User:**

> 3 PM.

**Resolved Request:**

```text
Action: Schedule meeting
Participant: Sarah
Date: Tomorrow
Time: 3 PM
Status: Resolved
```

---

### Example 4 — Multiple Possible Targets

**User:**

> Open the report.

**AI:**

> Which report would you like me to open?

**User:**

> The weekly sales report.

**Resolved Request:**

```text
Action: Open
Target: Weekly sales report
Status: Resolved
```

---

### Example 5 — Unclear Action

**User:**

> Do something with the sales report.

**AI:**

> What would you like me to do with the sales report?

The system should wait for the user's intended action rather than assuming what should be done.

---

### Example 6 — Insufficient Context

**User:**

> Send it to her.

If the system cannot reliably determine what "it" and "her" refer to, it should ask:

> What would you like me to send, and who should receive it?

---

### Example 7 — Cancellation

**User:**

> Schedule a meeting with Sarah.

**AI:**

> What date and time should I schedule the meeting?

**User:**

> Never mind.

**Result:**

```text
Resolution Status: Cancelled
Original Intent: Schedule meeting
Action: No action performed
```

---

## Test Scenarios

The following scenarios are used to validate the clarification and ambiguity resolution behavior.

### TC-01 — Missing Recipient

**Input:**

> Send the report.

**Expected Behavior:**

The system identifies the missing recipient and requests clarification.

**Expected Result:**

```text
Ambiguity Type: Missing Recipient
Status: Clarification Required
```

---

### TC-02 — Missing Date

**Input:**

> Schedule a meeting with Sarah.

**Expected Behavior:**

The system asks for the meeting date.

**Expected Result:**

```text
Ambiguity Type: Missing Date
Status: Clarification Required
```

---

### TC-03 — Missing Time

**Input:**

> Schedule a meeting with Sarah tomorrow.

**Expected Behavior:**

The system asks for the meeting time.

**Expected Result:**

```text
Ambiguity Type: Missing Time
Status: Clarification Required
```

---

### TC-04 — Missing Target

**Input:**

> Open the document.

**Expected Behavior:**

The system asks which document should be opened.

**Expected Result:**

```text
Ambiguity Type: Missing Target
Status: Clarification Required
```

---

### TC-05 — Multiple Possible Targets

**Input:**

> Open the report.

**Expected Behavior:**

If multiple reports exist, the system asks the user to identify the required report.

**Expected Result:**

```text
Ambiguity Type: Multiple Possible Interpretations
Status: Clarification Required
```

---

### TC-06 — Unclear Action

**Input:**

> Do something with the sales report.

**Expected Behavior:**

The system asks what action the user wants to perform.

**Expected Result:**

```text
Ambiguity Type: Unclear Action
Status: Clarification Required
```

---

### TC-07 — Context Preservation

**Conversation:**

```text
User: Schedule a meeting with Sarah.
AI: What date and time should I schedule the meeting?
User: Tomorrow at 3 PM.
```

**Expected Result:**

```text
Action: Schedule meeting
Participant: Sarah
Date: Tomorrow
Time: 3 PM
Status: Resolved
```

The system must preserve the original request while processing the clarification response.

---

### TC-08 — Still Incomplete

**Conversation:**

```text
User: Schedule a meeting with Sarah.
AI: What date and time should I schedule the meeting?
User: Tomorrow.
```

**Expected Behavior:**

The system detects that the time is still missing.

**Expected Result:**

```text
Missing Information: Time
Status: Clarification Required
```

---

### TC-09 — Successful Resolution

**Conversation:**

```text
User: Send the weekly sales report.
AI: Who should receive the report?
User: Sarah.
```

**Expected Result:**

```text
Action: Send report
Report: Weekly sales report
Recipient: Sarah
Status: Resolved
```

The original intent must be preserved and completed after clarification.

---

### TC-10 — Cancellation

**Conversation:**

```text
User: Schedule a meeting with Sarah.
AI: What date and time should I schedule the meeting?
User: Never mind.
```

**Expected Result:**

```text
Status: Cancelled
Action: No action performed
```

---

## Acceptance Criteria

The Clarification & Ambiguity Resolution layer is considered complete when:

- Ambiguous requests are detected.
- Missing information is identified.
- Appropriate ambiguity categories are assigned.
- Clarification questions are focused and understandable.
- Original user intent is preserved.
- Conversation context is maintained.
- Previously provided information is not requested again.
- Clarification responses are merged with the original request.
- The request is re-evaluated after clarification.
- The system does not fabricate missing information.
- Resolved requests continue to the original task.
- Still-incomplete requests trigger additional clarification only when necessary.
- Cancelled requests do not trigger the original action.
- Multiple possible interpretations are not silently selected.

---

## Safety Rule

The AI must not fabricate, assume, or silently select missing information when doing so could result in an incorrect or unintended action.

When required information is unavailable, the system should request explicit clarification.

---

## Scope

This module covers clarification and ambiguity handling at the AI Experience layer.

It includes:

- Ambiguity detection
- Missing information detection
- Clarification question generation
- Clarification dialogue behavior
- Context preservation
- Intent re-evaluation
- Structured clarification contracts
- Resolution status tracking
- Test scenarios
- Graceful handling of unresolved requests
- Cancellation handling

It does not define:

- Business authority
- Organizational memory
- Organizational intelligence
- Backend decision-making
- Backend system architecture
- Independent business rules
- Model architecture

The module is limited to the AI Experience behavior required to guide the user from an unclear request toward a sufficiently specified request.
