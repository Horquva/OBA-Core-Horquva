# CASTOR v1.0 – AI Experience Platform
## Day 3: Executive AI Workflows

**Owner:** Gulshan Kumar, AI Experience Engineer
**Status:** Architecture – Draft for Review

---

## 1. Objective

Translate the conversational logic from Day 2 into specific workflows for C-suite and operational executives, each enforcing the Red/Yellow/Green human-approval model.

---

## 2. Core Workflow Scenarios

### A. Operational Triage (Yellow Zone)
**Trigger:** a metric crosses a threshold (e.g., response time > 5 seconds).

1. AI notification: "Response time is 8.4s. Root cause: 37 tickets arrived at 1:45 PM."
2. AI suggestion: reroute 10 tickets, escalate 5 urgent cases.
3. Human checkpoint: side-by-side comparison of current vs. proposed state.
4. User action: Approve Reroute / Modify Assignment / Dismiss.
5. On approval, the Orchestration Engine executes the change.

### B. Strategic Forecasting (Green/Yellow Zone)
**Trigger:** "How will revenue look if we pause the marketing campaign?"

1. AI calls the simulation engine and the analytics agent.
2. Response: "Simulation suggests a 15% drop in leads, but an 8% increase in profit margin from reduced ad spend."
3. Explanation: margin gain is driven by the $50k/mo campaign cost; lead volume drops from 200 to 170.
4. Recommendation: reduce budget by 30% rather than pausing, to test impact.
5. Executive reviews the data table and approves the reduction or issues a new instruction.

### C. Proactive Risk Mitigation (Red Zone)
**Trigger:** security anomaly detected, or client churn risk exceeds 80%.

1. Critical notification: "Client X churn risk: 92%. Reason: 0 engagement in 14 days."
2. AI proposal: retention email with 15% discount, meeting scheduled with the account manager.
3. No action taken automatically — Red Zone requires human sign-off.
4. Executive reviews the draft, approves the discount, confirms the meeting time.
5. Sign-off via 2FA/biometric (Sentinel).
6. AI sends the email and adds the meeting to the calendar.

---

## 3. Explanation Framework

| Layer | Content | Audience |
|---|---|---|
| Intuition | "Response time increased because we got more tickets than usual." | All users |
| Logic | "Rule triggered: tickets/minute > 1.5, linked to event 'Marketing Blast'." | Power users, analysts |
| Data | Direct link to the raw dataset or query used by the OBA agent | Engineers, data teams |

An "Explain" control on each AI response toggles between these three layers.

---

## 4. Notification Levels

| Urgency | Color | Delivery | Example |
|---|---|---|---|
| Informational | Blue | Sidebar, no interruption | "Daily summary is ready." |
| Action Required | Orange | Pop-up, requires acknowledgment | "Approval needed: budget increase of $5k." |
| Critical | Red | Push + email fallback | "System downtime detected. Immediate action required." |

All notifications include a one-click "Handle Now" action that opens the Copilot panel directly at the relevant workflow step.

---

## 5. Human Approval Matrix

| Domain | Auto-Execute (Green) | Requires Approval (Yellow/Red) |
|---|---|---|
| Data retrieval | All queries | Never |
| Drafting & summaries | Draft generation | Sending externally (e.g., email to client) |
| Task creation | Internal tasks | Tasks assigned to C-level peers |
| Financial adjustments | — (always Red) | Refunds > $100, any budget change |
| Automation rules | Low-risk rules | Rules affecting compliance/policy |
| Staff reassignment | Within the same team | Across departments |

---

## 6. Note

Every workflow hard-stops at the Red Zone. The architecture does not allow the AI to execute financial or security actions on its own — the executive retains final sign-off, keeping the system a decision-support tool rather than a decision-making one.
