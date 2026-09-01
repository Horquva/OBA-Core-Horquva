# AI Experience Architecture

**Constitutional Architecture Draft — Day 1 Deliverable**

| | |
|---|---|
| **Owner** | Gulshan Kumar, AI Experience Platform Owner |
| **Prepared for** | CTO Review (Natasha Khan) |
| **Date** | Week 2, Day 1 |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [AI Interaction Principles (Constitutional)](#2-ai-interaction-principles-constitutional)
3. [AI Capability Map](#3-ai-capability-map)
4. [AI Entry Points](#4-ai-entry-points-where-conversations-begin)
5. [Conversation Lifecycle](#5-conversation-lifecycle)
6. [Conversation Flow Diagrams](#6-conversation-flow-diagrams)
7. [Human-AI Collaboration Model](#7-human-ai-collaboration-model)
8. [Executive Copilot Concept](#8-executive-copilot-concept-defined)
9. [Architecture Diagram](#9-architecture-diagram)
10. [Next Steps](#next-steps-after-cto-approval)

---

## 1. Executive Summary

The AI Experience Architecture defines how every human will interact with Horquva's Organizational Intelligence. Rather than treating AI as a chat widget, this architecture positions conversational AI as the **primary interaction layer** across WOBA, Executive Workspace, and future products.

Users will not navigate menus to find insights — they will *ask, explore, and receive* intelligence through natural conversation, with AI acting as a proactive, transparent, and trustworthy partner.

---

## 2. AI Interaction Principles (Constitutional)

Every AI interaction must obey these six principles:

| Principle | Definition |
|---|---|
| **Proactive Intelligence** | AI surfaces relevant insights *before* users ask — but never acts without visibility. |
| **Conversational Continuity** | Context persists across sessions, topics, and devices. AI remembers what matters. |
| **Transparent Reasoning** | Every AI response includes *why* it answered that way — citations, logic, or source. |
| **Human-in-the-Loop** | High-stakes decisions (escalations, financial moves, policy changes) require explicit human approval. |
| **Actionable Answers** | Responses include clear next steps — draft emails, create tasks, schedule reviews, generate reports. |
| **Graceful Fallback** | When uncertain, AI admits it, asks clarifying questions, or escalates to a human. |

---

## 3. AI Capability Map

This maps Horquva's backend specialist agents to user-facing capabilities available through conversation:

| Capability | Backend Agent | What User Can Ask / Do |
|---|---|---|
| **Operational Insights** | Ops Agent | "What's our current ticket backlog?" / "Why did response time spike at 2 PM?" |
| **Sales Intelligence** | Sales Agent | "Which deals are at risk this quarter?" / "Summarize last week's pipeline changes." |
| **Support Analytics** | Support Agent | "Show me top 5 recurring complaints." / "Draft a response to this customer." |
| **Reviews & Sentiment** | Reviews Agent | "What's our average rating this month?" / "Summarize negative feedback trends." |
| **Financial Overview** | (Connected via integration) | "What are our current MRR and churn?" / "Forecast next quarter revenue." |
| **Task Automation** | Orchestration Engine | "Automate this refund process." / "Schedule a follow-up for all pending tickets." |
| **System Status** | Monitoring Layer | "Is our uptime still 99.97%?" / "Alert me if any agent fails." |

> **Key design decision:** Users never need to know *which* agent is answering. The orchestration layer handles routing — users simply ask, and the right intelligence responds.

---

## 4. AI Entry Points (Where Conversations Begin)

Users will access AI from **5 primary entry points** across the Horquva ecosystem:

| Entry Point | Location | Purpose |
|---|---|---|
| **WOBA Widget** | Embedded on every Horquva product screen | Quick Q&A, task assistance, immediate help — floating, non-modal |
| **Executive Copilot Panel** | Dedicated sidebar in Executive Workspace | Deep strategic conversations, forecasting, decision support, long-form analysis |
| **Organizational Explorer** | Search bar + natural language | Ask anything about org structure, memory timeline, knowledge base |
| **Contextual Inline AI** | Inside dashboards, tables, reports | Click any chart/metric → "Explain this trend" or "What if we change X?" |
| **Notifications & Alerts** | Actionable alerts with AI-generated summaries | "3 agents are overloaded. AI suggests re-routing. Approve?" |

---

## 5. Conversation Lifecycle

Every conversation follows a **6-phase lifecycle**, ensuring clarity, context, and closure:

**1. Initiation**
- User starts via any entry point (text / voice / click)
- AI acknowledges intent and sets expectations

**2. Context Loading**
- AI loads user profile, org memory, and session history
- AI identifies whether this is a follow-up or a new topic

**3. Intelligence Gathering**
- Orchestration routes the query to relevant agents
- Agents fetch data, reason, and synthesize
- AI prepares a response with citations / logic

**4. Response & Clarification**
- AI presents the answer (structured: summary + details)
- If uncertain, AI asks one or two clarifying questions
- User can refine, drill down, or pivot

**5. Action / Handoff**
- If action is needed, AI presents options (draft, create, schedule, approve, escalate)
- If human judgment is required, AI flags a checkpoint
- If complex, AI offers to connect with a human agent

**6. Closure & Persistence**
- AI summarizes what was resolved and what remains
- Conversation is saved to memory for future recall
- User can "pin" the thread or "follow up" later

---

## 6. Conversation Flow Diagrams

### Flow A: Simple Q&A

> Example: *"What's our current ticket backlog?"*

```
User Query
    │
    ▼
AI: "Checking your operational data..."   [calls Ops Agent]
    │
    ▼
Ops Agent returns: 247 open tickets, 12 overdue, avg age 4.2h
    │
    ▼
AI Response:
  • Summary:   "You have 247 open tickets. 12 are overdue (4.8%)."
  • Detail:    Breakdown by priority (High: 34, Med: 156, Low: 57)
  • Action:    "Would you like me to draft a summary for your team?"
  • Context:   "This is 12% lower than last Tuesday's peak."
```

### Flow B: Multi-turn Conversation

> Example: *"Why did response time spike?"* → *"Show me the agents involved."*

```
Turn 1
──────
User:  "Why did response time spike at 2 PM today?"
AI:    [Calls Ops + Analytics agents]
       "Spike from 2.1s to 8.4s between 1:45-2:15 PM.
        Root cause: 37 tickets arrived simultaneously from a marketing campaign.
        2 agents were on lunch break."

Turn 2 (follow-up — context preserved)
─────────────────────────────────────
User:  "Show me the agents involved."
AI:    [Context preserved — knows we're still on the same spike]
       "Agents on shift: Aisha (handled 12), Rahul (handled 8),
        Samira (was on break). Samira returned at 2:20 PM,
        resolving the backlog by 2:45."
```

### Flow C: Action with Human Checkpoint

> Example: *"Automate this refund process."*

```
User:  "Create an automation rule for refunds under $50."
AI:    [Calls Orchestration Engine]
       "I can set up a rule: auto-approve refunds < $50 with no human review.
        This would apply to ~180 refunds/month, saving 6 hours/week.
        ⚠ Approval required from Finance Lead before activation."
       "I've drafted an approval request. Shall I send it to [Finance Lead]?"

User:  "Yes."
AI:    "Sent. I'll notify you when it's approved and activate it automatically."
```

---

## 7. Human-AI Collaboration Model

| Zone | Scope | AI Autonomy | Human Role |
|---|---|---|---|
| 🟢 **Green Zone** | Information retrieval, summaries, data queries, routine reporting | Full autonomy | Review optional |
| 🟡 **Yellow Zone** | Drafting, scheduling, recommendations, low-risk automations | AI proposes; human confirms or edits | One-click approve / reject |
| 🔴 **Red Zone** | Financial decisions, policy changes, escalations, staff reassignments | AI presents options + risks; human decides | Explicit approval required (with audit trail) |
| ⚠️ **Emergency Override** | System failures, security threats, critical outages | AI alerts and suggests immediate steps; human can override | Executive decision with 2FA authentication |

> **Design decision:** The AI *never* makes a Red Zone decision without explicit human confirmation. Every human override is logged in Sentinel (trust layer) for full traceability.

---

## 8. Executive Copilot Concept (Defined)

The Executive Copilot is not a separate tool — it is the **same conversational AI, elevated** for executives:

| Feature | Description |
|---|---|
| **Strategic Briefings** | Daily 3-minute audio/text summary: "Here's what changed overnight — deals, tickets, revenue, risks." |
| **What-If Simulation** | "What if we increase support headcount by 2?" → AI calls Arcturus (simulation) to forecast impact. |
| **Delegation** | "Assign this task to my ops lead." → AI creates task, drafts email, tracks completion. |
| **Proactive Alerts** | AI pushes insights without being asked: "I noticed churn risk in 3 accounts. Want to see them?" |
| **Explainability Mode** | Executive can ask: "Why did you recommend this?" → AI shows full reasoning chain and source data. |

> **Note:** The Executive Copilot lives **inside the Executive Workspace** (collaboration with Syed Muhammad Taha Zaidi) but is powered entirely by this AI Experience architecture.

---

## 9. Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          USER ENTRY POINTS                                │
│  ┌──────────┐  ┌───────────────┐  ┌────────────┐  ┌──────────────┐        │
│  │   WOBA   │  │ Exec Copilot  │  │ Org        │  │  Inline AI   │        │
│  │  Widget  │  │    Panel      │  │ Explorer   │  │  (Charts)    │        │
│  └────┬─────┘  └───────┬───────┘  └──────┬─────┘  └──────┬───────┘        │
│       └────────────────┴─────────────────┴────────────────┘                │
│                                    │                                       │
│                                    ▼                                       │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │                   AI EXPERIENCE ORCHESTRATION                      │   │
│  │  ┌────────────────────────────────────────────────────────────┐    │   │
│  │  │ 1. Intent Classifier + Context Loader (Memory / Profile)  │    │   │
│  │  └──────────────────────────┬─────────────────────────────────┘    │   │
│  │                             ▼                                      │   │
│  │  ┌────────────────────────────────────────────────────────────┐    │   │
│  │  │ 2. Routing Engine (sends to relevant OBA agents)           │    │   │
│  │  └──────────────────────────┬─────────────────────────────────┘    │   │
│  │                             ▼                                      │   │
│  │  ┌────────────────────────────────────────────────────────────┐    │   │
│  │  │ 3. Response Synthesizer + Action Generator                 │    │   │
│  │  └──────────────────────────┬─────────────────────────────────┘    │   │
│  │                             ▼                                      │   │
│  │  ┌────────────────────────────────────────────────────────────┐    │   │
│  │  │ 4. Governance Check (Yellow / Red Zone approval needs)     │    │   │
│  │  └──────────────────────────┬─────────────────────────────────┘    │   │
│  └─────────────────────────────┼──────────────────────────────────────┘   │
│                                │                                          │
│                                ▼                                          │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │              HORQUVA ORGANIZATIONAL BRAIN (OBA)                   │   │
│  │  ┌───────┐ ┌───────┐ ┌───────┐ ┌────────┐ ┌──────────┐            │   │
│  │  │ Ops   │ │Sales  │ │Support│ │Reviews │ │Analytics │            │   │
│  │  │Agent  │ │Agent  │ │Agent  │ │Agent   │ │Agent     │            │   │
│  │  └───────┘ └───────┘ └───────┘ └────────┘ └──────────┘            │   │
│  │  ┌──────────────────────────────────────────────────────────┐     │   │
│  │  │ Organizational Memory  │  Knowledge Base  │  Context     │     │   │
│  │  └──────────────────────────────────────────────────────────┘     │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│                                ▼                                          │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │                  SENTINEL (Trust & Governance)                     │   │
│  │  • Logs all interactions   • Checks approvals   • Audit trail     │   │
│  └────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Next Steps (After CTO Approval)

- **Day 2:** Deep-dive into Conversation & Context Design — memory states, follow-up logic, response structures.
- **Day 3:** Map Executive AI Workflows — specific scenarios with approval checkpoints.
- **Day 4:** Review, finalize documentation, and submit Readiness Report.
