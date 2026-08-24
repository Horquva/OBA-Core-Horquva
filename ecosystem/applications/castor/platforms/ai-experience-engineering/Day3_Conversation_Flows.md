<img src="https://unpkg.com/lucide-static@latest/icons/git-branch.svg" width="22" style="vertical-align:middle" /> Day 3 — Conversation Flow Diagrams

**Ahmad Ali Sultan** · AI Experience Engineering, Castor

**Week 2, Day 3**

---

## What today was about

Day 2 gave us the messages WOBA can say.

Today's job was connecting those messages into full paths.

This means showing the whole journey: from the moment a user opens WOBA, to the moment their task is done.

It also means showing what happens when something goes wrong along the way, like unclear input, or WOBA not knowing the answer.

**Key idea from Day 1 research:** most problems happen in the *middle* of a conversation, not at the start. So each diagram below shows real branches, not just one straight line.

---

## <img src="https://unpkg.com/lucide-static@latest/icons/map.svg" width="18" style="vertical-align:middle" /> 1. The main journey

This is the normal path: understand the question, ask for clarification if needed, give an answer, suggest a next step, then close or continue.

```mermaid
flowchart TD
    A([User opens WOBA]) --> B[Greeting]
    B --> C[User sends a message]
    C --> D{Is the request clear?}
    D -- No --> E[Ask a clarifying question]
    E --> F[User responds]
    F --> D
    D -- Yes --> G{Does WOBA have the data?}
    G -- No or partial --> H[Say what's missing, offer next step]
    H --> M{User wants to continue?}
    G -- Yes --> I[Generate answer]
    I --> J[Show answer with a Why button]
    J --> K{User asks why?}
    K -- Yes --> L[Show more detail and sources]
    L --> N
    K -- No --> N[Offer a next step]
    N --> M
    M -- Yes, new question --> C
    M -- No --> O([Close conversation])
```

---

## <img src="https://unpkg.com/lucide-static@latest/icons/alert-triangle.svg" width="18" style="vertical-align:middle" /> 2. What happens when something goes wrong

This part matters most, since it is the part most tools forget to design. There are four common problems, and each one has its own fix.

```mermaid
flowchart TD
    A[User message] --> B{What kind of problem?}

    B -- Unclear wording --> C[Offer best guess]
    C --> D{User confirms?}
    D -- Yes --> E[Move ahead with that guess]
    D -- No, corrects it --> F[Acknowledge briefly, restate]
    F --> E

    B -- Missing detail --> G[Ask one specific question]
    G --> H[User gives detail]
    H --> E

    B -- No data available --> I[Say plainly what's missing]
    I --> J[Suggest where to find it, or flag to a team]

    B -- WOBA misread the request --> K[User points out mistake]
    K --> L[Acknowledge once, move on]
    L --> F
```

**Simple rule I followed:** never quietly guess. Every "problem" path ends in either a confirmed correction, or an honest "I don't have this."

---

## <img src="https://unpkg.com/lucide-static@latest/icons/database.svg" width="18" style="vertical-align:middle" /> 3. Memory across a conversation

This maps back to the "silent forgetting" problem from Day 1. It shows exactly what gets remembered, and for how long.

```mermaid
flowchart TD
    A[New message arrives] --> B{Same session as before?}
    B -- Yes --> C[Use current chat memory]
    B -- No, new session --> D{Is there saved memory for this user?}
    D -- Yes --> E[Load saved info, like role or recent topics]
    D -- No --> F[Start with no memory]
    C --> G[Combine with any saved memory]
    E --> G
    F --> G
    G --> H[Reply using full context]
    H --> I{Is the chat getting long?}
    I -- Yes --> J[Summarize older messages]
    I -- No --> K[Keep going as normal]
    J --> L([Continue conversation])
    K --> L
```

---

## <img src="https://unpkg.com/lucide-static@latest/icons/flag.svg" width="18" style="vertical-align:middle" /> Open questions after today

| Question | Who Needs to Answer It |
|---|---|
| What counts as "one session"? For example, closed tab, or 30 minutes idle? | Backend / Platform team |
| How much detail should the "Why this?" button show? | Gulshan and me |
| Does topic-switching need special logic, or does the AI handle it on its own? | Engineering team |

---

