# Clarification & Ambiguity Test Scenarios

## 1. Purpose

These scenarios verify that the clarification layer correctly detects ambiguous requests, asks appropriate follow-up questions, preserves context, and resumes the original task after clarification.

---

## 2. Test Cases

### TC-01 — Missing Recipient

**Input:**

> Send the report.

**Expected:**

The system should ask who should receive the report.

**Expected Status:**

```text
pending
```

---

### TC-02 — Missing Date

**Input:**

> Schedule a meeting with Sarah.

**Expected:**

The system should request the required date and/or time.

---

### TC-03 — Missing Time

**Input:**

> Schedule a meeting with Sarah tomorrow.

**Expected:**

The system should ask for the meeting time.

---

### TC-04 — Missing Target

**Input:**

> Open the document.

**Expected:**

The system should request the specific document when multiple documents are possible.

---

### TC-05 — Multiple Possible Targets

**Input:**

> Open the report.

**Expected:**

If multiple reports exist, the system should ask the user to identify the intended report.

---

### TC-06 — Unclear Action

**Input:**

> Do something with the sales report.

**Expected:**

The system should ask what action the user wants to perform.

---

### TC-07 — Context Preservation

**Initial Input:**

> Schedule a meeting with Sarah.

**AI:**

> What date and time should I use?

**User:**

> Tomorrow at 3 PM.

**Expected:**

The system should preserve the participant from the original request and resolve the complete request as:

```text
Schedule a meeting with Sarah tomorrow at 3 PM.
```

---

### TC-08 — Still Incomplete Clarification

**Initial Input:**

> Schedule a meeting with Sarah.

**AI:**

> What date and time should I use?

**User:**

> Tomorrow.

**Expected:**

The system should request the missing time rather than assuming one.

---

### TC-09 — Successful Resolution

**Initial Input:**

> Send the weekly report.

**AI:**

> Who should receive the weekly report?

**User:**

> Sarah.

**Expected:**

The system should combine the original request and clarification:

```text
Action: Send report
Report: Weekly report
Recipient: Sarah
Resolution: Resolved
```

---

### TC-10 — User Cancels

**Initial Input:**

> Schedule a meeting with Sarah.

**AI:**

> What date and time should I use?

**User:**

> Never mind.

**Expected:**

The clarification request should be cancelled.

```text
resolution_status: cancelled
```

---

## 3. Acceptance Criteria

The clarification system is considered complete when:

- Ambiguous requests are detected.
- Missing information is identified.
- Appropriate clarification questions are generated.
- Original intent is preserved.
- Conversation context is maintained.
- Clarified information is merged with the original request.
- Incomplete clarification results in another focused question.
- The system does not guess missing information.
- Resolved requests continue through the original task flow.
- Cancelled requests are handled gracefully.

---

## 4. Expected Result

The AI Experience should provide a reliable clarification layer that prevents incorrect interpretation while maintaining a natural multi-turn conversation.
