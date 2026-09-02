# OBA Core — Executive Agent Interface

## Implementation Plan (Workstream W-L)

---

**Document control**

| Field | Value |
|---|---|
| Version | 1.0 |
| Date | 2026-08-27 |
| Status | For team execution — pending sign-off on §4.2 |
| Workstream | W-L |
| Branch | `ocos/develop` |
| Companion document | `docs/superpowers/specs/2026-08-27-w-l-agent-interface-design.md` (architecture and rationale) |
| Audience | Backend, frontend and data engineers implementing the agent layer |
| Prior art | Decisions D-01 … D-68; workstreams W-A … W-K, all closed |

**How the two documents relate.** The design document answers *why* and *what*: why the agent runs
in-process, why there are thirteen tools rather than a hundred and fifty, why grounding needs five
layers. This document answers *how, in what order, and how we know it is done*. If the two ever
disagree, the design document wins on intent and this one wins on sequence.

---

# 1. Purpose and how to use this document

This is the build plan for an executive-facing conversational agent over OBA Core. It is written to be
executed by more than one engineer working in parallel, so every task states its lane, its
dependencies, its interface contract, and the condition under which it is finished.

**Read sections 1 through 9 before writing any code.** They contain the invariants that the rest of the
plan assumes. A task executed correctly in isolation but in violation of §6.4 will have to be redone.

**Task format.** Every task in sections 10 through 13 uses the same block:

- **Lane** — which engineer can pick it up (Backend, Frontend, Data, or Any)
- **Depends on** — tasks that must be complete first
- **Estimate** — engineer-days, assuming familiarity with the codebase
- **Why** — the reason this task exists, so it can be challenged rather than followed blindly
- **Files** — what gets created or changed
- **Contract** — the interface other tasks will code against, written out in full
- **Steps** — the implementation sequence
- **Tests** — what proves it works
- **Done when** — the acceptance condition

**A note on code in this plan.** Prior workstreams in this repository wrote out every line of
implementation code in the plan itself. That suited a single agent executing mechanically. This plan is
for a team, so it writes out **contracts, schemas, protocols and acceptance criteria in full** — the
things two engineers must agree on to work in parallel — and describes implementation precisely without
dictating every line. Where a decision is genuinely load-bearing (SQL schema, SSE event protocol, tool
envelope, provider interface) the code is complete and normative.

---

# 2. Scope

## 2.1 In scope

A conversational interface, available on every page of the workspace, that:

1. Answers natural-language questions about the organization using the MVP's existing computed
   intelligence, at executive depth rather than in one-line templates.
2. Explains what a metric means, how it was computed, and whether it is measured or authored.
3. Runs the MVP's existing what-if simulations on demand and reasons over the real results.
4. Runs a new succession simulation (reassigning one person's responsibilities to another).
5. Offers — never forces — navigation to the page and section where a finding lives, and explains what
   the user is looking at when they arrive.
6. Sustains multi-turn follow-up reasoning over prior results.
7. Refuses to invent numbers, entities, or metric definitions, with mechanical enforcement rather than
   prompt-based hope.
8. **Is the workspace's landing experience** — the agent occupies `/` full-screen — while remaining
   available, with the same live conversation, docked alongside every other page.

## 2.2 Out of scope

Stated explicitly so nobody builds them by accident:

- **Any write to organizational data.** All thirteen tools are reads or pure computations. D-04
  deferred the write loop for the whole product; the agent is not an exception to it.
- **Multi-tenancy.** D-01 fixed the product as single-tenant. Conversations are scoped per user for
  privacy and audit, not for tenant isolation.
- **Voice input/output.** The existing `/api/voice` naming is historical. This is text.
- **Model fine-tuning, embeddings, or a vector store.** See design document §5.3.
- **Replacing the existing dashboard.** The agent sits alongside the pages, not instead of them.
- **Agent-initiated actions or notifications.** The agent responds; it does not act or schedule.

## 2.3 Success criteria — the acceptance demo

W-L is complete when the following session runs end to end against live data, in the browser, with the
validator reporting clean on every turn:

| # | User says | The system must |
|---|---|---|
| 1 | "What's our biggest organizational risk right now?" | Call the intelligence tools, name a real entity, quote its real predicted score and reasons, and explain why it matters in executive terms. |
| 2 | "What happens if Sarah leaves?" | Resolve "Sarah" to Sarah Mitchell, run the real `employeeLeaves` simulation, report the real impacted agents, workflows, severity and health delta. |
| 3 | "Which workflows are affected?" | Answer from the previous turn's result without re-running, and list only workflows that appeared in it. |
| 4 | "Why is that one the biggest concern?" | Pull the workflow's real profile — criticality, documentation state, owner, dependencies — and reason from it. |
| 5 | "What if Omar Hassan takes over her responsibilities?" | Run the new reassignment simulation, and report the residual risk that remains after the transfer. |
| 6 | "Show me where this is in the app." | Offer a valid navigation target; on click, land on the right page with the right block highlighted, the agent docked beside it, and **the same conversation still live** — turns 1 through 5 still readable, no remount. |

Plus: every number in every answer traces to a tool result; no invented entity names; the tool trace is
visible; and a question whose data is genuinely missing produces an honest "not measured" rather than an
estimate.

---

# 3. Provider selection: Google Gemini free tier

## 3.1 The decision

**Provider: Google Gemini API, free tier. Model: `gemini-3.7-flash`. SDK: `@google/genai`.**

This satisfies the requirement to build and run the agent at zero cost. The provider is reached through
an adapter interface (§8.4), so switching later is a configuration change and one new file, not a
rewrite.

## 3.2 Why Gemini and not the alternatives

| Option | Verdict | Reasoning |
|---|---|---|
| **Gemini free tier** | **Selected** | Function calling, 1M context, and streaming are all included on the free tier. Flash-tier token-per-minute headroom comfortably absorbs our ~10k-token prefix plus tool results. No credit card required. |
| Groq free tier | **Rejected** | The free tier caps at roughly 6,000 tokens per minute. Our system prompt, tool definitions and organization roster alone are approximately 9,300 tokens. A single turn would exceed the entire per-minute budget before the user's question is even added. Architecturally incompatible, not merely tight. |
| Local model via Ollama | **Rejected for v1, viable later** | Free forever and fully private, but multi-step tool chaining is where small models fail, and our acceptance demo is a four-turn chain. Worth revisiting as a fallback provider once the adapter exists and the golden-question suite (§18.2) can measure the quality drop objectively. |
| Anthropic Claude | **Deferred, not discarded** | Higher answer quality, at roughly $0.05 per turn. The adapter keeps this a one-line switch. Recommended for customer-facing demos; see §20.4. |

## 3.3 What the free tier changes about the architecture

Four consequences that engineers must know, because they differ from the companion design document,
which was written provider-neutrally with Anthropic as its reference:

**1. Requests-per-day becomes the binding constraint, not money.** Free-tier Flash allows on the order
of 1,500 requests per day per project, and **one agent turn costs several requests** — one for the
initial call plus one per tool round trip. At a cap of eight tool iterations, a worst-case turn is nine
requests. Budget on the order of 150–400 turns per day across the entire project, shared by every
developer and every demo. This is why §10.7 puts the provider behind a per-user turn budget from day
one, and why §20.2 makes quota a monitored operational metric rather than an afterthought.

**2. There is no prompt-cache prefix to protect, so volatile context can go in the system
instruction.** The companion design routed per-turn context through a mid-conversation system message
specifically to avoid invalidating a cached prefix. Gemini's `systemInstruction` is sent per request
anyway, so that constraint disappears: the turn's snapshot timestamp, graph load time, current page and
any validator repair instruction all go straight into `systemInstruction`. This is simpler and it keeps
operator instructions out of the user turn, which preserves the injection-safety property that motivated
the original design.

**3. Tool input validation is our responsibility.** Gemini supports only a subset of the OpenAPI schema
and offers no equivalent of a strict-mode guarantee that arguments will conform. Schemas must therefore
be kept flat and modest, and **every tool must validate its own input before executing** (§11.1). This
is a real task, not a defensive nicety — it was previously free.

**4. Model identifiers move.** Gemini model IDs are versioned and rotate faster than this document will
be revised. **The model ID must live in an environment variable and never be hardcoded**, and the team
must confirm the current free-tier model row in AI Studio on the day they start (§7.1).

## 3.4 What does not change

Everything that carries the product's integrity is provider-independent: the thirteen tools, the frozen
roots invariant, the tool result envelope, the numeric citation validator, the entity allowlist, the
metric glossary, the navigation catalog, the SSE protocol, and the conversation schema. A weaker model
degrades prose quality and multi-step chaining; it does not degrade correctness, because correctness is
enforced outside the model.

---

# 4. Assumptions and open decisions

## 4.1 Assumptions this plan makes

The plan is written to be executable now rather than blocked. Where a decision is open, the
recommendation from the design document has been assumed and the affected tasks are marked.

| ID | Assumption taken | Tasks affected if reversed |
|---|---|---|
| D-69 | First shippable slice is Phases 1–2: grounded Q&A, no navigation, no succession. | Sequencing only. |
| D-70 | On reassignment: the successor inherits assets, but **not** backup coverage and **not** documentation state; the successor's existing load counts against them. | 13.1, 13.2 |
| D-71 | Navigation catalog is shared via a single JSON file if the Vercel build can resolve it; otherwise duplicated with a CI drift test. | 12.2 |
| D-72 | `voice.js` and `executive.js` are retained as a non-LLM fallback when the agent is disabled, not deleted. | 11.6, 13.5 |
| D-73 | Numeric validator performs one automatic repair round, then annotates and logs. | 11.8 |
| D-74 | Provider is Gemini free tier, behind an adapter. | 10.7 |
| D-75 | Render free plan for now; paid tier before any customer-facing demo. | 19.2 |
| D-76 | Provider adapter is mandatory, not optional. | 10.7 |
| D-77 | The agent is the landing experience at `/`; the dashboard moves to `/dashboard`; the agent docks alongside every other route with the same conversation. | 12.4, 12.5, 12.8 |

## 4.2 Sign-off required before Phase 1 starts

**D-70 is the only genuinely blocking item.** Tasks 13.1 and 13.2 cannot be written without it, and
they are the flagship capability. Everything else can proceed under the assumption above and be
revisited cheaply.

---

# 5. Team, lanes and sequencing

## 5.1 Lanes

| Lane | Owns | Can start |
|---|---|---|
| **Data** | Migration, schema, seed verification | Immediately |
| **Backend** | Domain modules, tools, provider adapter, agent loop, SSE route, validators | Immediately |
| **Frontend** | Navigation extraction, agent client, panel components | After 12.1, which has no backend dependency |

## 5.2 Critical path

```
10.2 (roots split)  →  10.6 (turn context)  →  11.1 (tool registry)  →  11.2 (read tools)
   →  11.5 (agent loop)  →  11.6 (SSE route)  →  12.3 (agent client)  →  12.5 (panel)
```

Everything else hangs off this spine. The two longest single tasks are 11.5 (the agent loop) and 13.1
(the reassignment simulation).

## 5.3 What can run in parallel from day one

- **Data:** 10.5 (migration) depends on nothing.
- **Backend A:** 10.2 → 10.6 → 11.1 → 11.2 (the spine).
- **Backend B:** 10.3 (resolver) and 10.4 (glossary) are self-contained pure modules with no
  dependencies beyond the roots bundle shape.
- **Frontend:** 12.1 (navigation extraction) touches only existing frontend code and can be merged
  before any agent code exists.

## 5.4 Estimate summary

| Phase | Tasks | Engineer-days |
|---|---|---|
| Phase 1 — Foundation | 7 | 7 |
| Phase 2 — The agent turn | 9 | 13 |
| Phase 3 — Frontend and navigation | 8 | 11 |
| Phase 4 — Succession and hardening | 5 | 7 |
| **Total** | **29** | **38** |

With three engineers in the lanes above, expect roughly **three calendar weeks**. These estimates assume
familiarity with this codebase; add 30 percent for an engineer new to it, and read §6 first regardless.

---

# 6. Engineering standards for this workstream

## 6.1 Branching and commits

- Work on `ocos/develop`, the branch every prior workstream landed on.
- **One task per commit.** Never batch. This is the convention that made W-C through W-K auditable.
- Commit messages name the task: `feat(W-L 11.2): read tools over the frozen roots bundle`.
- Where a task closes a decision, name it: `fix(D-70): reassignment does not transfer backup coverage`.

## 6.2 A warning specific to this repository

**`git add <file>` is not safe here without checking first.** Several files historically carry
pre-existing uncommitted work unrelated to any workstream. Run `git status --short` at the start of every
session and `git diff <file>` before staging anything that was already modified. If a file's diff is
larger than your own edit, commit the unrelated work separately first, naming it as pre-existing, then
make your change on top. This has bitten previous workstreams.

## 6.3 Definition of done

A task is done when all of the following hold:

1. The tests named in the task pass.
2. `node tests/run-all.js` passes in full from `backend/`.
3. For frontend tasks, `tsc --noEmit` is clean from `frontend/`.
4. For anything observable only over HTTP, it has been verified against a **restarted** local server —
   Node does not hot-reload, and a stale process silently serves the old code. This caught two false
   completions during W-D.
5. For anything visual, it has been verified in a real browser, not merely typechecked.
6. The commit is made and names the task.

## 6.4 Non-negotiable invariants

Violating any of these produces work that must be redone. They are the reason the product is
trustworthy.

**I-1 — One roots read per turn.** Every tool in a single turn reads the same frozen bundle. No tool
issues its own database query. If a tool needs data not in the bundle, the bundle gains a field; the tool
does not gain a query.

**I-2 — No tool writes.** Reads and pure computations only. No inserts, updates, or deletes to any
organizational table. Conversation and usage tables are the sole exception and are written by the route,
never by a tool.

**I-3 — The model never computes an organizational metric.** If an answer needs a number, a tool
returns it. If a comparison is needed, a tool computes the comparison. There is no arithmetic in the
model's output path.

**I-4 — Definitions come from `definitions.js`.** Criticality, thresholds, SPOF status and evidence
gating are never reimplemented inside a tool. `atOrAbove()` and `spofVerdict()` are the only authorities.

**I-5 — Provenance survives to the client.** Every tool result carries its computation timestamp, source
and inputs. Routes and components pass it through rather than stripping it.

**I-6 — Insufficient evidence is a result, not an error.** When an evidence gate reports insufficient
coverage, that is reported honestly. It is never rounded into a number or silently omitted.

**I-7 — All provider access goes through the adapter.** No file outside `backend/agent/providers/`
imports a vendor SDK.

---

# 7. Prerequisites and environment setup

## 7.1 Accounts and credentials

| Item | How | Owner |
|---|---|---|
| Google AI Studio API key | Create a project at aistudio.google.com and generate an API key. No credit card required for the free tier. | Tech lead |
| **Confirm the current free-tier model row** | In AI Studio, check which Flash model currently carries a free-tier row and note its exact ID and its RPM / TPM / RPD limits. Model IDs rotate. Record the values in §17.2 of this document. | Tech lead, day 1 |
| Render dashboard access | To set backend environment variables. | Tech lead |
| Supabase access | To run the migration. | Data lane |

**Do not commit the API key.** It goes in `backend/.env` locally and the Render dashboard in production,
following the existing pattern for `SUPABASE_KEY` and `JWT_SECRET`.

## 7.2 Local development

Both servers run from `.claude/launch.json`, which already defines `backend` (port 3000) and `frontend`
(port 3001), both with `autoPort` enabled.

- **Do not assume ports 3000 and 3001 are free.** Another session commonly holds them. Let `autoPort`
  pick, then point `frontend/.env.local`'s `NEXT_PUBLIC_API_URL` at whatever port the backend actually
  took, and restart the frontend for the change to take effect.
- `frontend/.env.local` is gitignored local configuration. Retarget it freely; never commit it.
- Log in through the real UI using the `ADMIN_EMAIL` / `ADMIN_PASSWORD` values already present in
  `backend/.env`. There is no need to invent test credentials.

## 7.3 New dependency

One package, backend only:

```
cd backend && npm install @google/genai
```

Node 22 or later is already required by `backend/package.json` and by Render.

## 7.4 Environment variables

New variables introduced by this workstream. Full reference in Appendix C.

| Variable | Where | Default | Purpose |
|---|---|---|---|
| `AGENT_ENABLED` | backend/.env, Render | `false` | Master feature flag. When false the agent routes are not mounted at all. |
| `AGENT_PROVIDER` | backend/.env, Render | `gemini` | Selects the adapter. `gemini` or `anthropic`. |
| `AGENT_MODEL` | backend/.env, Render | `gemini-3.7-flash` | Model ID. **Never hardcode this in source.** |
| `GEMINI_API_KEY` | backend/.env, Render (`sync: false`) | — | Provider credential. |
| `ANTHROPIC_API_KEY` | backend/.env, Render (`sync: false`) | — | Only if `AGENT_PROVIDER=anthropic`. |
| `AGENT_MAX_ITERATIONS` | backend/.env | `8` | Hard cap on tool rounds per turn. |
| `AGENT_TURN_TIMEOUT_MS` | backend/.env | `120000` | Wall-clock cap per turn. |
| `AGENT_DAILY_TURN_BUDGET` | backend/.env | `40` | Per-user turns per day. Sized against the provider's request-per-day quota. |
| `NEXT_PUBLIC_AGENT_ENABLED` | frontend/.env.local, Vercel | `false` | Hides the agent UI when the backend has it disabled. |

---

# 8. Architecture summary

Full rationale is in the companion design document. This section is the working reference.

## 8.1 Component map

| Layer | Component | Responsibility |
|---|---|---|
| Route | `routes/agent/chat.js` | Auth, rate limit, budget, SSE lifecycle |
| Orchestration | `agent/loop.js` | The tool-calling loop, iteration cap, abort |
| Provider | `agent/providers/*.js` | The only vendor-specific code |
| Tools | `agent/tools/*.js` | Thirteen tools over the frozen bundle |
| Context | `agent/turnContext.js` | One roots read, one intelligence computation, one graph snapshot |
| Guards | `agent/validators.js` | Numeric citation and entity allowlist checks |
| Truth | `domain/*` | Unchanged, except one refactor and one new simulation |
| Persistence | four new tables | Conversations, messages, tool calls, usage |

## 8.2 The turn lifecycle

```
POST /api/agent/chat                    Accept: text/event-stream
  body: { conversationId?, message, pageContext? }
   |
   +-- requireAuth                       existing middleware, unchanged
   +-- rateLimit(keyFn: req.user.sub)    existing middleware, new key function
   +-- daily turn budget check           429 when exhausted
   |
   +-- load conversation history         agent_conversations + agent_messages
   +-- BUILD TURN CONTEXT ------------------------------------------
   |     roots      = await derived.loadRoots(supabase)     ONE read
   |     intel      = derived.computeAllFromRoots(roots)    pure
   |     graph      = domain.graph.source()                 snapshot metadata
   |     snapshotAt = new Date().toISOString()
   |     tools      = buildTools(turnContext)               closures capture the bundle
   |
   +-- SSE open, emit `ready` immediately
   |
   +-- loop, max AGENT_MAX_ITERATIONS:
   |     provider.stream({ systemInstruction, history, tools })
   |       text delta        -> SSE `token`
   |       tool call         -> SSE `tool_start`, validate input, execute,
   |                            SSE `tool_done`, append result
   |       no tool call      -> break
   |
   +-- validators: numeric citation (one repair round), entity allowlist
   +-- persist: message, tool trace, usage, validator verdict
   +-- SSE `done` { navigationOffer?, toolTrace[], provenance, usage }
```

## 8.3 File layout

```
backend/
  routes/agent/
    index.js            router assembly, mount guard
    chat.js             the SSE endpoint
  agent/
    loop.js             the tool-calling loop
    turnContext.js      frozen bundle construction
    constitution.js     system instruction text and roster builder
    validators.js       numeric + entity guards
    registry.js         tool assembly and input validation
    tools/
      resolve.js  read.js  intelligence.js  simulate.js  navigate.js
    providers/
      index.js          adapter selection
      gemini.js         @google/genai implementation
      anthropic.js      reference implementation, added in Phase 4
  domain/
    resolve.js          NEW  entity resolution
    metricGlossary.js   NEW  metric definitions as data
    navigationCatalog.js NEW navigation targets, validated
    pageContext.js      NEW  page section values
    derived.js          MODIFIED  computeAllFromRoots split
    simulations.js      MODIFIED  employeeLeavesWithSuccessor
  sql/
    15_agent_layer.sql  NEW

frontend/
  app/
    page.tsx            REPLACED  the agent, full-screen (was the dashboard)
    dashboard/page.tsx  NEW       the former app/page.tsx, moved verbatim
  lib/
    navigate.ts         NEW  extracted single navigation path
    agentClient.ts      NEW  SSE reader
  components/agent/
    AgentProvider.tsx  AgentPanel.tsx  AgentMessage.tsx
    AgentComposer.tsx  ToolTrace.tsx   NavigationOffer.tsx
```

**On the route layout (D-77).** `AgentProvider` lives in `AppShell`, so the full-screen route at `/`
and the docked panel on every other route are two presentations of **one** component reading **one**
conversation state — not two implementations. Navigating from `/` to `/risk` moves the same live
thread from full-screen into the dock without interrupting it.

## 8.4 The provider adapter

Every provider implements this interface. Nothing outside `providers/` may import a vendor SDK (I-7).

```js
/**
 * @typedef {Object} ProviderTool
 * @property {string} name
 * @property {string} description
 * @property {Object} parameters      JSON-Schema subset: object, flat properties, enums
 *
 * @typedef {Object} ProviderTurn
 * @property {string} systemInstruction
 * @property {Array<{role: 'user'|'model', parts: Array}>} history
 * @property {ProviderTool[]} tools
 * @property {AbortSignal} signal
 *
 * @typedef {Object} ProviderEvent
 *   { type: 'text',      text: string }
 *   { type: 'tool_call', id: string, name: string, args: object }
 *   { type: 'done',      usage: { inputTokens, outputTokens }, finishReason: string }
 *   { type: 'error',     error: Error, retryable: boolean }
 */

module.exports = {
  /** Async generator yielding ProviderEvent. */
  async *stream(turn) {},
  /** Append a tool result to history in this provider's wire shape. */
  appendToolResult(history, { id, name, result }) {},
  /** Append the model's own turn to history. */
  appendModelTurn(history, parts) {},
  /** Provider identity for logging and usage rows. */
  describe() { return { provider: 'gemini', model: process.env.AGENT_MODEL } },
}
```

The loop in `agent/loop.js` knows only this interface. Swapping provider is then a new file plus an
environment variable.

---

# 9. Data layer and migration

## 9.1 Migration file

`backend/sql/15_agent_layer.sql`, following the existing numbered migration convention.

```sql
-- W-L: agent conversation, audit and usage tables.
-- These are the ONLY tables the agent layer writes to. No organizational
-- table is written by any agent code path (invariant I-2, decision D-04).

CREATE TABLE IF NOT EXISTS agent_conversations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         text        NOT NULL,
  title           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  archived        boolean     NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS agent_messages (
  id              bigserial   PRIMARY KEY,
  conversation_id uuid        NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,
  turn            integer     NOT NULL,
  role            text        NOT NULL CHECK (role IN ('user','assistant')),
  content         jsonb       NOT NULL,
  snapshot_at     timestamptz,
  graph_loaded_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_tool_calls (
  id              bigserial   PRIMARY KEY,
  message_id      bigint      NOT NULL REFERENCES agent_messages(id) ON DELETE CASCADE,
  tool_name       text        NOT NULL,
  input           jsonb       NOT NULL,
  result_summary  jsonb       NOT NULL,
  duration_ms     integer,
  error           text
);

CREATE TABLE IF NOT EXISTS agent_usage (
  id              bigserial   PRIMARY KEY,
  conversation_id uuid        REFERENCES agent_conversations(id) ON DELETE SET NULL,
  user_id         text        NOT NULL,
  provider        text        NOT NULL,
  model           text        NOT NULL,
  input_tokens    integer     NOT NULL DEFAULT 0,
  output_tokens   integer     NOT NULL DEFAULT 0,
  provider_calls  integer     NOT NULL DEFAULT 0,
  tool_iterations integer     NOT NULL DEFAULT 0,
  validator_status text       CHECK (validator_status IN ('clean','repaired','flagged')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_conv_user     ON agent_conversations(user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_msg_conv      ON agent_messages(conversation_id, turn);
CREATE INDEX IF NOT EXISTS idx_agent_tool_msg      ON agent_tool_calls(message_id);
CREATE INDEX IF NOT EXISTS idx_agent_usage_user    ON agent_usage(user_id, created_at DESC);
```

## 9.2 Notes on schema choices

- **`provider_calls` is tracked separately from turns.** On a free tier, requests per day is the binding
  quota and one turn costs several requests. Without this column the team cannot see how close they are
  to the ceiling.
- **`content` stores the full provider-shaped message array**, not extracted text. That is the shape the
  next turn needs and it preserves the grounding chain the validators depend on.
- **`result_summary` stores headline fields, not the whole payload.** A `rank_scenarios` result over
  every employee would otherwise make this table enormous.

## 9.3 Running and rolling back

Run via the existing `backend/run_migrations.js`, which uses `DATABASE_URL`. Rollback is four
`DROP TABLE IF EXISTS ... CASCADE` statements; no organizational table is touched, so rollback is safe
at any time.

---

# 10. Phase 1 — Foundation

Seven tasks. Exit criterion: a `node -e` script can resolve "Sarah" to Sarah Mitchell, print her
glossary-annotated profile from a single frozen bundle, and reach the provider.

## 10.1 Provider dependency and configuration

**Lane** Backend · **Depends on** none · **Estimate** 0.5 d

**Why.** Everything else needs the key present and the flag readable, and the boot behaviour when the
key is missing must be decided once rather than per-file.

**Files.** `backend/package.json`, `backend/.env.example`, `render.yaml`, `backend/agent/config.js`.

**Steps.**
1. `npm install @google/genai` in `backend/`.
2. Create `agent/config.js` exporting a frozen config object read from environment, with the defaults in
   §7.4 applied.
3. Add every new variable to `.env.example` with an explanatory comment, matching the existing style.
4. Add the same variables to `render.yaml` with `sync: false` for the two secrets.
5. Add a boot guard: when `AGENT_ENABLED` is true but the selected provider's key is absent, log a
   clearly delimited banner and leave the agent routes unmounted. The rest of the API must start
   normally.

**Tests.** `agentConfig.unit.test.js` — defaults applied; missing key with the flag on reports not-ready
rather than throwing.

**Done when** the server boots with the flag off, with the flag on and a key, and with the flag on and no
key, and the third case prints the banner and still serves every existing route.

## 10.2 Split `computeAll` into load and compute

**Lane** Backend · **Depends on** none · **Estimate** 0.5 d

**Why.** Invariant I-1. Today `computeAll(supabase)` loads roots internally, so obtaining both the raw
bundle and the computed intelligence means reading the database twice — and the two reads can disagree.

**Files.** `backend/domain/derived.js`, `backend/domain/index.js`.

**Contract.**

```js
/** Pure. Every analysis computed from one already-loaded bundle. */
function computeAllFromRoots(roots) { /* the current body of computeAll, minus the load */ }

/** Unchanged signature and behaviour. */
async function computeAll(supabase) {
  return computeAllFromRoots(await loadRoots(supabase))
}
```

**Steps.**
1. Move the body of `computeAll` after its `loadRoots` call into `computeAllFromRoots(roots)`.
2. Reduce `computeAll` to the two-line wrapper above.
3. Export `computeAllFromRoots` from `derived.js` and expose it on
   `domain.intelligence.compute.allFromRoots`.

**Tests.** Extend `derived.unit.test.js`: for a fixture bundle, `computeAllFromRoots(roots)` deep-equals
the current `computeAll` output, ignoring the `computedAt` timestamp.

**Done when** the full suite passes with no behavioural change and both entry points exist.

## 10.3 `domain/resolve.js` — entity resolution

**Lane** Backend · **Depends on** none · **Estimate** 1 d

**Why.** Every other tool takes a resolved identifier rather than free text. This is the single control
that removes the largest class of hallucination, and the logic already exists in `voice.js` — it needs
lifting and generalising, not inventing.

**Files.** `backend/domain/resolve.js`, `backend/domain/index.js`.

**Contract.**

```js
/**
 * @param {object} roots      the frozen bundle
 * @param {string} query      free text from the model
 * @param {string} [type]     employee | agent | workflow | platform | knowledge | any
 * @returns {{
 *   candidates: Array<{
 *     id: number|string, type: string, name: string,
 *     role?: string, department?: string, criticality?: string,
 *     confidence: 'high'|'medium'|'low'
 *   }>,
 *   ambiguous: boolean
 * }}
 */
function resolveEntity(roots, query, type = 'any') {}
```

**Steps.**
1. Port `findEntity` and `findPerson` from `routes/voice/voice.js`, keeping the two-stage strategy:
   exact or substring match first, then token-overlap scoring against significant words with the generic
   word stoplist (`the`, `a`, `workflow`, `process`, `agent`, `bot`, `system`, `platform`, `tool`).
2. Generalise across all five namespaces read from the bundle.
3. Return **all** candidates above threshold, never a silent single pick. Set `ambiguous` when two or
   more score within a narrow band of each other.
4. Resolve criticality through `definitions.entityCriticality()` — never read a raw column (I-4).

**Tests.** `agentResolve.unit.test.js` covering: exact full name; first name only; fuzzy multi-word;
**ambiguous surname returning two or more candidates**; unresolvable text returning an empty list; and
every case that `voice.js` handles today, so the lift is provably lossless.

**Done when** the tests pass and a surname shared by two employees returns both.

## 10.4 `domain/metricGlossary.js`

**Lane** Backend · **Depends on** none · **Estimate** 1 d

**Why.** "What does this number mean?" must be answered from the repository, not the model's priors.
The definitions already exist as prose in `derived.js` and `definitions.js`; this turns them into data.

**Contract.**

```js
{
  metric: 'orgScore',
  label: 'Organizational Intelligence Score (OIS)',
  definition: 'Weighted composite of the three pillars: Governance Intelligence (0.35), ...',
  range: '0-100',
  bands: { '85+': 'STRONG', '65-84': 'PARTIAL', '40-64': 'WEAK', '<40': 'CRITICAL' },
  authored: true,
  authoredNote: 'Weights are authored, not measured (D-11). Nothing in the source data defined them.',
  computedIn: 'backend/domain/derived.js :: pillars()',
  decisions: ['D-02', 'D-11'],
}
```

**Steps.**
1. Transcribe an entry for every metric any tool can return. Do not paraphrase from memory — read the
   doc comment above each function in `derived.js` and `definitions.js` and transcribe it.
2. Set `authored: true` wherever the formula is a product judgement rather than a measurement. At
   minimum: the GI/MI/DI pillar weights, the platform-criticality derivation, and the tool-risk
   composite.
3. Export a lookup by metric name and the full list.

**Tests.** `metricGlossary.unit.test.js` — **every metric name reachable through a tool result has an
entry**. This test is load-bearing: it is what stops the glossary rotting as metrics are added. It will
initially need a hardcoded list of metric names; from 11.2 onward it should derive them from the tool
registry.

**Done when** coverage is complete and the authored flags are correct.

## 10.5 Migration

**Lane** Data · **Depends on** none · **Estimate** 0.5 d

Write `backend/sql/15_agent_layer.sql` exactly as §9.1. Apply it via `run_migrations.js`. Verify the four
tables and four indexes exist, that the foreign keys cascade, and that the `role` and `validator_status`
check constraints reject bad values.

**Done when** an insert-and-cascade-delete round trip works against the real database.

## 10.6 `agent/turnContext.js`

**Lane** Backend · **Depends on** 10.2 · **Estimate** 0.5 d

**Why.** This is invariant I-1 made concrete. It is the only place in the agent layer permitted to read
the database for organizational data.

**Contract.**

```js
/**
 * @returns {{
 *   roots: object, intel: object,
 *   snapshotAt: string, graphSource: object, graphStale: boolean
 * }}
 */
async function buildTurnContext() {}
```

**Steps.**
1. `loadRoots(supabase)` once; `computeAllFromRoots(roots)` once.
2. Capture `domain.graph.source()` and stamp `snapshotAt`.
3. Set `graphStale` when the graph's `loadedAt` trails `snapshotAt` by more than a configured threshold
   (default six hours). This surfaces the graph-versus-roots snapshot hazard rather than hiding it.
4. Export a frozen object. Tools receive it; they never re-read.

**Tests.** `turnContext.unit.test.js` with a stubbed Supabase — asserts exactly one `loadRoots` call and
that `graphStale` flips correctly around the threshold.

**Done when** a turn provably issues one organizational read.

## 10.7 Provider adapter and Gemini implementation

**Lane** Backend · **Depends on** 10.1 · **Estimate** 2 d · **Decision** D-74, D-76

**Why.** Invariant I-7, and the reason the free-versus-paid choice stays reversible.

**Files.** `backend/agent/providers/{index,gemini}.js`.

**Steps.**
1. Implement the interface in §8.4 exactly.
2. Build `gemini.js` on `@google/genai`, using the streaming content generation path with explicit
   history rather than any server-side conversation state. **We keep conversation state ourselves** —
   the audit trail, tool trace and validator all depend on our own record, and splitting state across
   two systems would fragment it.
3. Map Gemini's function-call parts to `{ type: 'tool_call', id, name, args }` and text parts to
   `{ type: 'text', text }`.
4. Map tool schemas to the OpenAPI subset Gemini accepts. **Keep schemas flat**; avoid nested objects and
   deep arrays.
5. Classify errors into retryable (429, 5xx, transport) and terminal, and surface `retryable` on the
   error event so the loop can decide.
6. Honour `AbortSignal` so a disconnected client stops the stream.

**Tests.** `provider.unit.test.js` against a stubbed transport — event normalisation, tool call mapping,
error classification, abort propagation. No live calls in CI.

**Done when** a scripted single-tool exchange completes against the live free tier from a local script,
and the same test passes offline against the stub.

---

# 11. Phase 2 — The agent turn

Nine tasks. Exit criterion: an authenticated `curl` against the SSE endpoint streams a grounded,
validated answer to "who carries the most key-person risk and why?"

## 11.1 Tool registry, envelope and input validation

**Lane** Backend · **Depends on** 10.6 · **Estimate** 1.5 d

**Why.** One shape for every tool result, and — because Gemini offers no strict-mode guarantee (§3.3) —
one place where arguments are validated before any tool body runs.

**Contract.** Every tool module exports:

```js
{
  name: 'get_entity_profile',
  description: 'Call this when the user asks about one specific person, agent, workflow or tool...',
  parameters: { type: 'object', properties: { ... }, required: [...] },
  run(ctx, args) { /* ctx is the frozen turn context */ },
}
```

Every result is wrapped by the registry, never by the tool:

```js
{
  data:       { /* the MVP's real computed object, unmodified */ },
  provenance: { computedAt, snapshotAt, source: 'live'|'graph', inputs: {...}, graphLoadedAt? },
  evidence:   { status: 'computed'|'insufficient_evidence', coverage, covered, total } | null,
  authored:   false,
  notes:      [ /* caveats the model must surface */ ],
}
```

**Steps.**
1. Build the registry: assemble tools, bind the frozen context, expose provider-shaped declarations.
2. Implement argument validation against each tool's schema — required fields, types, enum membership.
   A violation returns a structured tool error to the model so it can correct itself; it never throws
   into the loop.
3. Implement the envelope wrapper, including automatic provenance stamping from the turn context.
4. Enforce a result size cap; truncate long arrays with an explicit `truncated` note rather than
   silently.

**Tests.** `agentRegistry.unit.test.js` — envelope shape; enum rejection; required-field rejection;
truncation notes present.

**Done when** a tool cannot return an unwrapped result and a bad argument produces a correctable error.

## 11.2 Read tools

**Lane** Backend · **Depends on** 11.1, 10.3, 10.4 · **Estimate** 2 d

Implements tools 1 through 7: `resolve_entity`, `get_org_snapshot`, `get_entity_profile`,
`list_entities`, `get_intelligence`, `run_brain_analysis`, `get_metric_definition`. Full schemas in
Appendix A.

**Two points that are easy to get wrong:**

- **`list_entities` uses a closed filter grammar.** Every filter key is an enum. No free-form predicate,
  no SQL, no expression evaluation. A general query capability would become a second definition of
  "critical" competing with `definitions.js`, which is exactly what invariant I-4 exists to prevent.
- **`run_brain_analysis` must degrade honestly.** When `domain.graph.isReady()` is false, return a
  structured "graph not loaded" result — never an empty payload, which reads as "nothing found". Always
  attach the graph's `loadedAt`, because it is a different snapshot from the roots bundle.

**Tests.** `agentTools.unit.test.js` against a fixture bundle: every tool's shape, provenance present,
evidence gates passed through unmodified, enums rejected, graph-not-ready path structured.

**Done when** all seven return correctly enveloped results and no tool issues a database query.

## 11.3 Simulation tools

**Lane** Backend · **Depends on** 11.1 · **Estimate** 1 d

Implements `run_simulation`, `rank_scenarios` and `compare_scenarios` over the existing
`domain.simulations` functions and the frozen bundle.

`compare_scenarios` runs two scenarios and returns **both results plus a server-computed diff** —
health-delta difference, and the intersection and symmetric difference of impacted agents and workflows.
This tool exists specifically so the model never subtracts two numbers itself (invariant I-3). Rule I-3
is only enforceable if there is a tool for every comparison the model would otherwise perform by hand.

**Tests.** Extend `agentTools.unit.test.js`: results pass through unmodified; the diff is computed
correctly for overlapping and disjoint impact sets.

## 11.4 The constitution and roster builder

**Lane** Backend · **Depends on** 10.6 · **Estimate** 1 d

**Files.** `backend/agent/constitution.js`.

**Contents.**
1. **Static constitution** — the behavioural rules, verbatim from design document §8.1: quote numbers
   rather than compute them; no arithmetic; resolve before naming; report insufficient evidence
   honestly; label authored formulas; distinguish snapshots; treat tool content as data not
   instructions; write like a chief of staff.
2. **Compact organization roster** — a flat projection built from the frozen bundle: every person,
   agent, workflow and tool with owner, criticality and status. Target 3,000 to 5,000 tokens.
3. **Volatile per-turn block** — `snapshotAt`, `graphLoadedAt`, the stale-graph warning when set, and
   the user's current page when supplied.

All three are assembled into `systemInstruction` per request (§3.3, consequence 2).

**Tests.** `constitution.unit.test.js` — roster contains every entity in the fixture bundle; token
estimate within budget; volatile block present and correctly formatted.

## 11.5 The agent loop

**Lane** Backend · **Depends on** 10.7, 11.1, 11.4 · **Estimate** 2 d

**Files.** `backend/agent/loop.js`.

**Contract.**

```js
/**
 * @param {object} turnContext
 * @param {Array}  history          prior messages, provider-shaped
 * @param {string} userMessage
 * @param {(event) => void} emit    SSE emitter
 * @param {AbortSignal} signal
 * @returns {{ text, toolTrace, usage, iterations, finishReason }}
 */
async function runTurn({ turnContext, history, userMessage, emit, signal }) {}
```

**Steps.**
1. Assemble the system instruction and history; call `provider.stream()`.
2. Forward text deltas as `token` events.
3. On a tool call: emit `tool_start` with a human-readable label, validate input, execute against the
   frozen context, emit `tool_done` with a one-line summary, append the result to history.
4. Repeat until the model returns no tool call, or `AGENT_MAX_ITERATIONS` is reached, or the wall-clock
   timeout expires. **Cap reached is a reported outcome, not a silent stop** — the client must be told.
5. Retry a retryable provider error once with backoff; surface a terminal error as an `error` event.
6. Record every tool call with its duration for the trace.

**Tests.** `agentLoop.unit.test.js` with a scripted stub provider: single-tool turn; multi-tool turn;
iteration cap reached and reported; retryable error retried; terminal error surfaced; abort mid-stream
stops cleanly.

**Done when** all six scripted scenarios pass without touching the network.

## 11.6 The SSE route

**Lane** Backend · **Depends on** 11.5 · **Estimate** 1.5 d

**Files.** `backend/routes/agent/{index,chat}.js`, `backend/index.js` (one mount line).

**Steps.**
1. Mount at `/api/agent`, below the existing global `requireAuth`. **Mount only when `AGENT_ENABLED` is
   true and the provider is ready** — otherwise the routes do not exist, which is a cleaner failure than
   a 500.
2. Open the stream with the headers in Appendix B and write an immediate first byte. This is what stops
   a cold Render instance from looking like a hang.
3. Emit `ready`, then delegate to `runTurn`.
4. Start a fifteen-second heartbeat so intermediaries do not close an idle stream during a long tool
   phase.
5. On `req.on('close')`, abort the provider stream so tokens are not consumed for a disconnected client.
6. Emit `done` with the navigation offer, tool trace, provenance and usage.

**Tests.** `agentRoutes.test.js`, provider stubbed, runs offline: 401 without a token; correct event
order; heartbeat present; abort cleans up; flag off means 404.

## 11.7 Rate limiting, budget and usage accounting

**Lane** Backend · **Depends on** 10.5, 11.6 · **Estimate** 1 d

**Why.** On a free tier, requests per day is the binding constraint (§3.3). Without a budget one
developer's test loop can exhaust the whole project's daily quota before a demo.

**Steps.**
1. Apply the existing `middleware/rateLimit.js` with `keyFn: req => req.user.sub`. The middleware
   already supports this; no change to it is required.
2. Before each turn, count today's turns for the user from `agent_usage`; return 429 with a clear
   message and a reset time when over `AGENT_DAILY_TURN_BUDGET`.
3. After each turn, write an `agent_usage` row including `provider_calls`.
4. Expose `GET /api/agent/quota` returning the user's remaining budget, so the UI can warn before the
   user hits it.

**Known limitation to document, not fix:** the in-process rate limiter does not survive a restart or
span instances. This is already documented in the middleware's own header and is acceptable for a
single-instance deployment. The daily budget, being database-backed, does not share this weakness.

**Tests.** Extend `agentRoutes.test.js` — budget exhaustion returns 429; a usage row is written per turn.

## 11.8 Validators

**Lane** Backend · **Depends on** 11.5 · **Estimate** 1.5 d · **Decision** D-73

**Files.** `backend/agent/validators.js`.

**Numeric citation validator.**
1. Walk every tool result from the turn, collecting all numeric literals — including numbers inside
   strings — into an allowed set, and record the longest array length returned.
2. Extract numeric tokens from the assistant's final text.
3. A number passes if it is in the allowed set; within 0.5 of a member, for rounding; an integer no
   greater than the longest array length, covering legitimate counts and ordinals; a four-digit year
   present in the results; or inside a quoted entity name.
4. Anything else is a violation.
5. **On violation, one automatic repair round:** re-prompt with the specific unverified figures named,
   asking for a corrected answer using only cited values. If the second attempt still fails, return the
   answer annotated as containing unverified figures and record `validator_status = 'flagged'`.

**Entity allowlist validator.** Build the allowed set from the frozen bundle — employees, agents,
workflows, platforms, knowledge assets, departments. Flag capitalised multi-word sequences that look
like names and are not in the set. **A warning, not a block**: English capitalisation is too noisy to
block on.

**This repository has already been burned by this exact failure.** `frontend/lib/search.ts` carries a
comment about replacing a fixture containing a fake workflow and a fake person "neither of which exist
anywhere else in the app", and `voice.js`'s header documents the same class of bug with five invented
names. A language model will reproduce it unless something checks.

**Tests.** `agentValidator.unit.test.js` — catches an invented figure; passes a quoted figure; passes
rounding within 0.5; passes an ordinal within list length; passes a year present in results; flags an
invented person; does not flag a real one; does not flag ordinary capitalised English.

## 11.9 Conversation persistence

**Lane** Backend · **Depends on** 10.5, 11.6 · **Estimate** 1 d

Load prior history for a conversation, append the user and assistant turns, write the tool trace, and
apply a sliding window bounded by token budget. When the window drops turns, **replace them with a short
summary rather than deleting them silently**, so the model is not left reasoning over an invisible gap.

Set the conversation title from the first user message, truncated.

**Tests.** `agentPersistence.unit.test.js` with stubbed Supabase — round trip preserves tool-call blocks;
the window drops oldest first; the summary replaces rather than deletes.

---

# 12. Phase 3 — Frontend and navigation

Eight tasks. Exit criterion: land on `/`, ask a question, accept the navigation offer, arrive on the
right page with the right block flashing, the agent docked beside it and the same conversation intact.

## 12.1 Extract the single navigation path

**Lane** Frontend · **Depends on** none · **Estimate** 0.5 d

**Why.** `GlobalSearchOverlay.tsx`'s `go()` already implements navigate-plus-focus correctly. The agent
must reuse it, not add a second implementation — the repository's established pattern for exactly this
situation is `lib/deriveCollaborations.js` and `lib/ownerBackups.js`.

**Steps.**
1. Create `frontend/lib/navigate.ts` exporting `goToTarget({ page, match })`, containing the existing
   logic verbatim: same-route fast path via `history.replaceState`, otherwise `router.push` with the
   `?focus=` query, then `requestFocus(match)` in both cases.
2. Refactor `GlobalSearchOverlay.tsx` to call it. **In the same commit**, so this is a deduplication
   rather than a second implementation.

**Tests.** `tsc --noEmit` clean; command palette navigation manually verified unchanged, including the
same-route case.

## 12.2 Navigation catalog and `propose_navigation`

**Lane** Backend · **Depends on** 11.1 · **Estimate** 1 d · **Decision** D-71

**Steps.**
1. **First, test whether Vercel's build with `rootDir: frontend` can resolve a JSON file at the
   repository root.** This determines the approach and takes an hour.
2. If it resolves: move the catalog seeds — pages, section headings, module codes — into
   `shared/navigation-catalog.json`, and have both `backend/domain/navigationCatalog.js` and
   `frontend/lib/commandIndex.ts` read from it. One source.
3. If it does not: keep the two copies and add `navigationCatalog.unit.test.js`, which parses both and
   fails on divergence. Document the duplication in both files, following the precedent already set by
   `frontend/lib/evidenceGate.ts`. **Silent duplication is not acceptable in either case.**
4. Implement `propose_navigation`, which validates the page and section against the catalog and returns
   an offer object. An unknown page or unverified heading is a **tool error** returned to the model so it
   can correct itself — never a link that 404s or scrolls nowhere.

**Done when** an invalid target is rejected and a valid one produces a correct `?focus=` href.

**Note for whoever picks this up:** task 12.8 repoints several catalog targets from `/` to
`/dashboard` under D-77. If 12.8 lands first, build against the moved paths; if this task lands first,
12.8 will edit whatever you produce here. Either order works — just do not assume `/` still means the
dashboard.

## 12.3 The SSE client

**Lane** Frontend · **Depends on** 11.6 · **Estimate** 1 d

`frontend/lib/agentClient.ts` — a `fetch` plus `ReadableStream` reader, because the endpoint requires an
`Authorization` header and the browser's native `EventSource` cannot send one. Parses the protocol in
Appendix B, exposes an async iterator of typed events, and supports abort via `AbortController`.

Handle a truncated stream — network drop mid-turn — by surfacing a clear error rather than leaving a
half-rendered message.

## 12.4 Agent provider and shell mount

**Lane** Frontend · **Depends on** 12.3 · **Estimate** 1 d

`AgentProvider.tsx` holding messages, streaming state, conversation identifier, and `send` / `abort`.

**Mount it in `AppShell.tsx`, alongside `GlobalSearchOverlay` and `DeepLinkFocus` — never inside a
route component.** This is what makes D-77 possible: the conversation is owned by the shell, so it
survives every navigation. If the provider lived inside `app/page.tsx`, navigating to `/risk` would
unmount it and destroy the conversation that sent the user there, defeating the navigation feature
entirely.

The provider also derives the current **display mode** from `usePathname()` and exposes it on context:
`fullscreen` on `/`, `docked` on every other route, `collapsed` when the user has minimised it. Route
components never decide this themselves.

Gate rendering on `NEXT_PUBLIC_AGENT_ENABLED`.

## 12.5 Panel, message and composer

**Lane** Frontend · **Depends on** 12.4 · **Estimate** 2 d

Three display modes, driven by the mode on context from 12.4 — the component is the same in all three,
only its container changes:

| Mode | Where | Shape |
|---|---|---|
| `fullscreen` | `/` | Centred conversation column, roughly 760 px wide, composer pinned to the bottom. Suggested opening prompts when the thread is empty. This is the landing experience. |
| `docked` | every other route | Right-hand panel, roughly 400 px, full height, page content reflows beside it. |
| `collapsed` | any route, user-triggered | A pill in the lower right showing the last assistant line, restoring to the mode the route implies. |

**A transition between modes must never remount the thread.** Moving from `/` to `/risk` is a container
change, not a new conversation — verify this explicitly, because an accidental remount is easy to ship
and looks like the agent forgetting.

- Stream text token by token, buffered to roughly 30 ms frames to avoid thrashing React.
- Render `tool_start` as a live status line — "Running simulation — Sarah Mitchell leaves…". On a
  multi-tool turn this is most of what the user sees for the first several seconds, and it is genuinely
  informative rather than a spinner.
- A stop button that aborts client and server.
- Follow the existing design tokens in `globals.css`. Do not introduce a new palette.

## 12.6 Tool trace and navigation offer

**Lane** Frontend · **Depends on** 12.5, 12.2 · **Estimate** 1 d

`ToolTrace.tsx` — a collapsible "How I got this" listing each tool call, its key inputs, a one-line
result summary and the timestamps. This is the honest presentation, it matches the existing
`EvidenceBadge` and `TruthBadge` provenance culture, and in practice it is the strongest deterrent to
trusting a wrong answer: a claim with no supporting call is visibly unsupported.

`NavigationOffer.tsx` — renders the offer as a button calling `goToTarget` from 12.1. **The agent never
navigates on its own.** Also render the validator warning banner when `validator_status` is `flagged`.

## 12.7 `get_page_context` and page metric wiring

**Lane** Backend · **Depends on** 12.2 · **Estimate** 1.5 d

`domain/pageContext.js` — given a route, return its section list plus **the current value of each
section's headline metric**, from the same frozen bundle the page itself would fetch.

This is what makes "explain what I'm seeing" grounded rather than a generic page description, and it is
the difference between a chatbot that links to a page and one that walks the user through it.

**Tests.** Every catalog section either has a mapped metric or is explicitly marked as having none. No
section may silently return nothing.

## 12.8 Route restructure — agent at `/`, dashboard at `/dashboard`

**Lane** Frontend · **Depends on** 12.5, 12.2 · **Estimate** 2 d · **Decision** D-77

**Why.** The agent becomes the workspace's landing experience. This is mostly a routing change, but it
has a tail: **five navigation-catalog entries currently point at `/`**, and if they are not moved they
will send a user who asks for the Agent Summary Directory to the chat screen instead. That would be a
silent, confusing failure of the feature this workstream exists to build.

**Files.** `frontend/app/page.tsx`, `frontend/app/dashboard/page.tsx`, `frontend/components/layout/Sidebar.tsx`,
`frontend/lib/commandIndex.ts`, `frontend/components/global/GlobalSearchOverlay.tsx`,
`backend/domain/navigationCatalog.js` (or the shared catalog JSON, per D-71).

**Steps.**
1. Move the current `frontend/app/page.tsx` verbatim to `frontend/app/dashboard/page.tsx`. **No content
   changes in this step** — a pure move, so any later diff is genuinely a behavioural change.
2. Write a new `frontend/app/page.tsx` that renders the agent in `fullscreen` mode. It holds no
   conversation state of its own; state lives in the shell (12.4).
3. Add a Dashboard entry to `Sidebar.tsx` pointing at `/dashboard`, and an entry for the agent at `/`.
4. **Update the navigation catalog.** In `commandIndex.ts` — and the backend copy, or the shared JSON —
   repoint every target whose page is `/`:
   - `PAGES`: `p-dashboard` moves from `/` to `/dashboard`. Add a new page entry for the agent at `/`.
   - `SECTION_SEEDS`: the four dashboard sections — Agent Summary Directory, Risk Distribution by
     Department, Top At-Risk Agents, Priority Actions — move to `/dashboard`.
   - `MODULE_SEEDS`: M21, M22 and M23 currently resolve to `/`; move them to `/dashboard`.
5. In `GlobalSearchOverlay.tsx`, the `entityToTarget` mapping sends agents to `/` — change it to
   `/dashboard` so entity results still land on the directory that lists them.
6. Confirm the post-login redirect in `AppShell.tsx` still resolves correctly.

**Tests.** Extend `navigationCatalog.unit.test.js`: **no catalog target resolves to `/` except the agent
entry itself.** This is the assertion that stops step 4 being half-done — it is easy to move the pages
and forget the module seeds.

**Done when** every command-palette result lands where it did before the move, `/` is the agent, and
`/dashboard` renders the previous landing page unchanged.

---

# 13. Phase 4 — Succession and hardening

Five tasks. Exit criterion: the full acceptance demo in §2.3 runs end to end on live data.

## 13.1 `employeeLeavesWithSuccessor`

**Lane** Backend · **Depends on** 10.2 · **Estimate** 2 d · **Decision** D-70 — blocking

**Why.** This is the flagship capability and the only genuine gap in the existing domain layer. Nothing
in the codebase today models a handover.

**Files.** `backend/domain/simulations.js`.

**Contract.**

```js
/**
 * @returns {{
 *   scenario, targetType, targetId, targetName,
 *   successorId, successorName,
 *   impactedAgents, impactedWorkflows, impactedPeople,
 *   severity, healthDelta,
 *   residualRisk: {
 *     assetsWithoutBackup: Array,
 *     assetsUndocumented: Array,
 *     successorConcentrationAfter: number,
 *     successorBecomesSpof: boolean
 *   },
 *   comparedToNoSuccessor: { healthDelta, severity }
 * }}
 */
function employeeLeavesWithSuccessor(employeeId, successorId, roots) {}
```

**Mutation policy — assumed under D-70, confirm before implementing:**

1. Reassign `agents.owner_id`, `knowledge_assets.owner_id` and `workflow_runbooks.owner_id` from the
   departing employee to the successor.
2. Reassign the departing employee's `accountability_links`.
3. **Backup coverage does not transfer.** Where `owners.backup_owner` named the departing person, it
   becomes null. A backup that named the person who left is not coverage, and carrying it over would
   fabricate a signal that invariant I-6 and decision D-07 exist to prevent.
4. **Documentation state does not transfer.** An undocumented asset remains undocumented under a new
   owner; that is the entire meaning of the metric.
5. **The successor's existing load counts.** Report their concentration after the transfer, not merely
   the vacancy being filled. The interesting executive finding is usually that a single point of failure
   was solved by creating a larger one.

Reuse `cloneRoots()`, `recount()`, `healthDelta()` and `orgHealth()`. Do not introduce a second health
formula.

**Tests.** `simulationsReassign.unit.test.js` — backup does not transfer; documentation does not
transfer; successor concentration rises correctly; `successorBecomesSpof` fires when the successor
crosses the SPOF condition via `spofVerdict()`; the health delta sign is correct; an unknown successor
returns null rather than throwing.

## 13.2 The `simulate_reassignment` tool

**Lane** Backend · **Depends on** 13.1, 11.3 · **Estimate** 0.5 d

Expose it through the registry. Update the constitution to describe when to reach for it — specifically,
that a question of the form "what if X takes over from Y" is a reassignment, not two separate scenarios.

## 13.3 Graph staleness surfacing

**Lane** Backend · **Depends on** 10.6, 11.2 · **Estimate** 0.5 d

The knowledge graph loads once at boot and is refreshed only by the manual reload endpoint, while roots
are read every turn. Graph-derived and roots-derived figures are therefore different snapshots, and the
agent is the first component capable of putting both in one sentence.

1. Attach `graphLoadedAt` to every graph-backed tool result.
2. When `turnContext.graphStale` is set, add a line to the volatile system block instructing the model to
   attribute graph-derived figures to their load time.
3. Log a warning server-side so operations can see it.

## 13.4 Golden-question regression suite

**Lane** Backend · **Depends on** 13.2 · **Estimate** 1.5 d

A fixed set of roughly twenty questions with expected grounding — which tools should be called, which
entities should appear, and that the numeric validator reports clean. Run against a stub provider in CI
for the deterministic parts, and against the live provider manually before any release.

**This is the only mechanism that will catch quality regression when the model, the prompt, or a tool
description changes.** Without it, prompt tuning is guesswork. It is also the instrument that would let
the team evaluate a local model objectively if the free tier ever becomes limiting.

## 13.5 Fallback, flag and documentation

**Lane** Backend · **Depends on** all · **Estimate** 2 d · **Decision** D-72

1. When `AGENT_ENABLED` is false, the frontend hides the panel and the existing command palette remains
   the primary interface. `voice.js` and `executive.js` stay mounted as the non-LLM fallback.
2. Update `README.md` and `BACKEND_INTEGRATION.md` with the agent surface.
3. Add the W-L row to the workstream map in the decision log, and close D-69 through D-76 there.
4. **Correct the stale row in the decision log's deferred table** — it still lists
   `lib/knowledgeRisk.ts` and `lib/aiToolIntelligence.ts` as having no backend score to point at, but
   D-58 and D-59 closed both during W-K.

---

# 14. Error handling and failure modes

Every row is a case the team must handle deliberately. The default of "surface a 500" is wrong for most
of them.

| Failure | Detection | Behaviour | User sees |
|---|---|---|---|
| Provider key missing | Boot | Routes not mounted; banner logged | Agent UI hidden |
| Provider 429 (quota) | Error event | No retry; end turn | "Daily capacity reached, resets at midnight Pacific" |
| Provider 5xx or transport | Error event | One retry with backoff, then end | "The model is temporarily unavailable" |
| Turn budget exhausted | Pre-flight | 429 before any provider call | Remaining budget and reset time |
| `loadRoots` fails | Turn context | Abort turn | "Cannot read organizational data right now" — never a partial answer |
| Graph not loaded | Tool call | Structured not-ready result | Agent says the analysis is unavailable and why |
| Evidence gate insufficient | Tool result | Passed through | "Not measured — coverage is 32 percent" |
| Tool throws | Registry | Structured error to the model | Agent retries or explains the gap |
| Bad tool arguments | Registry validation | Correctable error to the model | Usually invisible; model self-corrects |
| Iteration cap reached | Loop | Stop and report | "I reached my step limit — here is what I found so far" |
| Turn timeout | Loop | Abort and report | Partial answer with a clear note |
| Numeric validator flags | Post-turn | One repair round, then annotate | Warning banner on the message |
| Client disconnects | `req.on('close')` | Abort provider stream | Nothing |
| Stream truncated | Client | Surface error | "The response was interrupted" |

**The rule behind this table:** a failure must never be presentable as an answer. The most dangerous
outcome in this product is not an error — it is a confident, complete-looking response built on missing
data. That is the failure mode `routes/executive/executive.js`'s own header warns about, and it applies
with more force to a fluent model than to a template.

---

# 15. Observability

Log per turn, structured, at info level: conversation and turn identifiers, user, provider and model,
tool names in call order with durations, provider call count, token usage, validator status, finish
reason, and total duration.

Log at warn level: retries, iteration cap reached, validator repair rounds, stale graph, budget refusals.

Never log: the API key, full message content, or full tool payloads. Tool **names** and result
**summaries** only — this is an organizational intelligence product and conversation content is
sensitive even when the underlying dataset is a demo.

`agent_usage` is the system of record for quota and cost. Build one query the team can run to see turns
per day, provider calls per day, and flagged-validator rate.

---

# 16. Security checklist

Verify every item before enabling the flag in production.

1. API key present only in `backend/.env` and the Render dashboard. Not in git, not in any
   `NEXT_PUBLIC_` variable, never returned by an endpoint.
2. `/api/agent` sits below the existing `requireAuth`. No unauthenticated path exists.
3. No tool performs a write to any organizational table (invariant I-2). Verify by grep, not by memory.
4. Tool results are delimited in the prompt and framed as data, not instructions. Organizational free-text
   fields — decision descriptions, incident lessons, truth claims, entity names — reach the model and
   could in principle carry planted instructions. The constitution instructs the model to quote and flag
   such content rather than act on it, and because no tool writes, the worst outcome is a wrong answer
   rather than a state change.
5. Rate limit and daily budget both active.
6. Conversations are scoped by `user_id` on read as well as write. A user must not be able to load
   another user's conversation by guessing an identifier.
7. CORS unchanged — the existing allowlist already covers the agent route.
8. SSE responses set `Cache-Control: no-cache, no-transform`.

---

# 17. Performance and quota budget

## 17.1 Latency targets

| Phase | Target |
|---|---|
| First SSE byte | Under 100 ms, excluding cold start |
| `loadRoots` | 200 to 400 ms — 21 parallel reads |
| First token | 1 to 3 s |
| Each tool call | 2 to 20 ms — in-process over the frozen bundle |
| Full answer, three tool calls | 6 to 12 s |

A cold Render free instance adds 30 to 60 seconds. The immediate first byte and the tool status stream
are what make this survivable rather than appearing broken.

## 17.2 Quota budget — fill in on day one

The team lead records the actual observed limits here after checking AI Studio (§7.1).

| Quantity | Limit | Notes |
|---|---|---|
| Requests per minute | *to be confirmed* | |
| Tokens per minute | *to be confirmed* | Must exceed roughly 15,000 for one comfortable turn |
| Requests per day | *to be confirmed* | **The binding constraint** |
| Provider calls per turn | 2 to 9 | One, plus one per tool round |
| Implied turns per day | *derived* | Requests per day divided by average calls per turn |

Set `AGENT_DAILY_TURN_BUDGET` so that the number of active users multiplied by the budget stays
comfortably under the implied daily ceiling.

---

# 18. Testing strategy

## 18.1 Suites

All are added to `backend/tests/run-all.js`, following the existing convention: pure and stubbed suites
run in CI, live suites self-skip when their environment variables are absent.

| Suite | Kind | Covers |
|---|---|---|
| `agentConfig.unit` | pure | Configuration defaults and the missing-key path |
| `agentResolve.unit` | pure | Resolution, including ambiguity and the lifted `voice.js` cases |
| `metricGlossary.unit` | pure | **Every reachable metric has an entry** |
| `turnContext.unit` | stubbed | Exactly one roots read; stale-graph detection |
| `provider.unit` | stubbed | Event normalisation, error classification, abort |
| `agentRegistry.unit` | pure | Envelope, argument validation, truncation |
| `agentTools.unit` | pure | All thirteen tools over a fixture bundle |
| `agentLoop.unit` | stubbed | Six loop scenarios including cap and abort |
| `agentValidator.unit` | pure | Numeric and entity validation, both directions |
| `agentPersistence.unit` | stubbed | History round trip and windowing |
| `agentRoutes` | stubbed HTTP | Auth, event order, heartbeat, budget, flag off |
| `navigationCatalog.unit` | pure | Catalog integrity or drift, per D-71 |
| `simulationsReassign.unit` | pure | The full D-70 mutation policy |
| `agentGolden.live` | live, skipping | The golden-question suite against the real provider |

## 18.2 The golden-question suite

Roughly twenty questions spanning: single entity lookup, org-level summary, a metric explanation, a
simulation, a comparison, a reassignment, an ambiguous name, a question whose data is genuinely missing,
and a follow-up chain. Each asserts the tools called, the entities named, and a clean validator verdict.

Run it before every release and after any change to a prompt, a tool description, or the model
identifier. **A tool description is production behaviour in this system, not a comment.**

## 18.3 Manual QA script

The acceptance demo in §2.3, executed in a real browser against live data, plus:

- Refresh mid-conversation and confirm history restores.
- Navigate away mid-stream and confirm the stream aborts.
- **Navigate from `/` to another route mid-conversation and confirm the thread continues in the dock
  with no remount** — the D-77 failure mode.
- Collapse to the pill and restore; confirm the thread is intact.
- Exhaust the budget and confirm the message is clear.
- Disable the flag and confirm the app is unchanged and `/dashboard` still works.

---

# 19. Deployment

## 19.1 Order of operations

Strictly sequential. Each step is independently reversible.

1. **Migration.** Apply `15_agent_layer.sql`. Additive only; safe with the current backend running.
2. **Backend with the flag off.** Deploy to Render with `AGENT_ENABLED=false`. Routes are not mounted,
   so this is a no-op deployment that only proves the build works with the new dependency.
3. **Set secrets.** Add `GEMINI_API_KEY` and the agent variables in the Render dashboard.
4. **Enable the backend flag.** Set `AGENT_ENABLED=true` and restart. Verify with authenticated `curl`
   against the SSE endpoint before any frontend change.
5. **Frontend with the flag off.** Deploy to Vercel with `NEXT_PUBLIC_AGENT_ENABLED=false`.
6. **Enable the frontend flag.** The UI appears.

## 19.2 Platform configuration

**Render.** Add the agent variables to `render.yaml` with `sync: false` for secrets. `NODE_VERSION` stays
at 22. Note that the free plan spins down after inactivity with a 30 to 60 second cold start — acceptable
for internal use, poor for a live demo. Decision D-75 covers upgrading before any customer sees this.

**Vercel.** One new variable, `NEXT_PUBLIC_AGENT_ENABLED`. If D-71 resolves toward a shared catalog file
at the repository root, confirm the build still succeeds with `rootDir: frontend`.

## 19.3 Post-deploy verification

1. `GET /` returns service metadata — the existing routes are unaffected.
2. An existing endpoint such as `/api/health/summary` still answers correctly.
3. `GET /api/agent/quota` returns a budget for an authenticated user.
4. One full turn over `curl` returns the correct event sequence and ends with `done`.
5. The tool trace is populated and the validator status is clean.
6. An `agent_usage` row was written.
7. The dashboard renders the panel and one question answers end to end.

## 19.4 Rollback

Set `AGENT_ENABLED=false` and restart. The routes disappear; nothing else in the product is affected.
This is the entire rollback procedure for the feature. The migration need not be reversed — the tables
are inert when unused — but if desired, four cascading drops remove them without touching organizational
data.

---

# 20. Operations runbook

## 20.1 Daily quota exhausted

Symptom: turns fail with a provider 429 late in the day. Confirm against `agent_usage` provider calls for
the day. Options, in order of preference: lower `AGENT_DAILY_TURN_BUDGET`; lower
`AGENT_MAX_ITERATIONS`, since capped turns consume the most requests; or switch `AGENT_PROVIDER` to a
paid provider for the remainder of the day. The last is a single environment variable because of the
adapter.

## 20.2 Quota monitoring

Track daily: total turns, total provider calls, calls per turn, and flagged-validator rate. A rising
calls-per-turn figure means the model is taking more steps than it needs — usually a symptom of an
unclear tool description, not of the model.

## 20.3 Validator flagging spike

A sudden rise in `validator_status = 'flagged'` means the model has started producing uncited figures.
Most likely causes, in order: a tool description changed and the model is guessing where it used to call;
the model identifier rolled to a new version; or a tool started returning a shape the model
misinterprets. Check the golden-question suite first — it is designed to localise exactly this.

## 20.4 Switching to a paid provider

Set `AGENT_PROVIDER=anthropic`, set `ANTHROPIC_API_KEY`, set `AGENT_MODEL`, restart. Run the golden
suite. Recommended before any customer-facing demo: answer quality is the product in this feature, and
the cost of a demo session is a few tens of cents.

## 20.5 Kill switch

`AGENT_ENABLED=false` plus a restart. Under a minute. Every other feature of the product is unaffected.

---

# 21. Risk register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | Free-tier daily quota too small for a team plus demos | High | Medium | Per-user budget from day one; adapter allows same-day switch |
| 2 | Flash-tier reasoning too weak for the four-turn chain | Medium | High | Golden suite measures it objectively; adapter allows upgrade. **Assess at the end of Phase 2, not at the end of the project** |
| 3 | Model identifier rolls and breaks the deployment | Medium | Medium | Identifier is an environment variable; pin explicitly rather than using an alias |
| 4 | Metric glossary rots as metrics are added | Medium | Medium | The coverage test is load-bearing and must not be skipped |
| 5 | Prompt injection via organizational free text | Low | Medium | Data framing, no writes, operator instructions in the system channel only |
| 6 | Render cold start ruins a demo | High | Low | Immediate first byte; warm before demos; D-75 |
| 7 | Graph and roots snapshots blended in one answer | Medium | Medium | Task 13.3 |
| 8 | Frontend type errors ship, since `ignoreBuildErrors` is on | Medium | Low | CI typecheck must pass for agent code regardless of the flag |
| 9 | D-70 not decided, blocking Phase 4 | Medium | High | Escalate before Phase 1 completes; Phases 1–3 are unaffected |
| 10 | Mode transition remounts the agent, losing the conversation on navigation | Medium | High | State lives in `AppShell`, never in a route component (12.4); explicit manual check in §18.3 |
| 11 | A catalog target still resolving to `/` sends users to the chat instead of the dashboard | Medium | Medium | The catalog assertion in 12.8 fails the build if any non-agent target points at `/` |

---

# 22. Timeline

Three engineers, three weeks.

| Week | Backend A | Backend B | Frontend |
|---|---|---|---|
| 1 | 10.1, 10.2, 10.6, 10.7 | 10.3, 10.4, 10.5 | 12.1, then design review |
| 2 | 11.1, 11.2, 11.5 | 11.3, 11.4, 11.8 | 12.3, 12.4, 12.5 |
| 3 | 11.6, 11.7, 11.9, 13.3 | 12.2, 12.7, 13.1, 13.2 | 12.6, 12.8, QA |
| Buffer | 13.4, 13.5, deployment, acceptance demo | | |

**Checkpoint at the end of week 2:** run the golden-question suite against the free tier. If reasoning
quality is inadequate, that is the moment to switch providers — before the frontend work is tuned around
a particular model's behaviour.

---

# 23. Team allocation

## 23.1 How the work divides

Three teams. The split follows the natural seams in the codebase, not job titles — **AI** owns
everything the model touches, **Backend** owns the platform and the domain layer beneath it, and
**Frontend** owns everything the executive sees.

| Team | Owns | Tasks | Engineer-days |
|---|---|---|---|
| **AI** | Provider adapter, tools, prompt, agent loop, validators, quality suite | 10 | 14.5 |
| **Backend** | Config, migration, turn context, SSE route, budget, persistence, domain simulations | 13 | 13 |
| **Frontend** | Navigation, SSE client, panel, route restructure | 6 | 7.5 |
| **Total** | | **29** | **35** |

## 23.2 A staffing note, before the tables

Thirteen people against 35 engineer-days is roughly **2.7 days of work each**. That is thinner than
this workstream can absorb: the critical path (§5.2) is eight sequential tasks, and no amount of extra
people shortens it. Past a certain headcount, coordination costs more than the parallelism gains.

Two ways to make thirteen people work, and the tables below support either:

1. **Pair on every task.** Six pairs plus a tech lead. Each pair gets ~5 days of real work, the
   `Owner` and `Pair` columns are both filled, and the second person is a genuine reviewer rather than
   a spectator. **This is the recommendation** — it doubles as knowledge transfer on a codebase where
   the conventions matter more than the code.
2. **Staff six or seven people on this and put the rest elsewhere.** Same three-week finish, and the
   remaining engineers work on something that isn't blocked by this critical path.

What will *not* work is thirteen people each taking two or three tasks solo — the interfaces between
tasks are where the risk lives, and that structure maximises the number of interfaces.

## 23.3 Roster

Fill in before kickoff. Suggested sizes assume the pairing model.

**AI team** — suggested 5

| # | Name | Focus |
|---|---|---|
| 1 | | Team lead — owns the tool contract and the constitution |
| 2 | | Provider adapter and the agent loop |
| 3 | | Tools |
| 4 | | Tools |
| 5 | | Validators and the quality suite |

**Backend team** — suggested 5

| # | Name | Focus |
|---|---|---|
| 1 | | Team lead — owns the turn contract and the SSE route |
| 2 | | Domain layer and simulations |
| 3 | | Data, migration and persistence |
| 4 | | Budget, quota and observability |
| 5 | | Navigation catalog and page context |

**Frontend team** — suggested 3

| # | Name | Focus |
|---|---|---|
| 1 | | Team lead — owns the shell, state and route restructure |
| 2 | | Panel, message and composer |
| 3 | | Trace, navigation offer and QA |

## 23.4 AI team — task assignments

| Task | What it is | Days | Depends on | Owner | Pair |
|---|---|---|---|---|---|
| 10.3 | Entity resolution — lift and generalise `voice.js` matching | 1 | — | | |
| 10.4 | Metric glossary — definitions as data | 1 | — | | |
| 10.7 | Provider adapter + Gemini implementation | 2 | 10.1 | | |
| 11.1 | Tool registry, envelope, input validation | 1.5 | 10.6 | | |
| 11.2 | Read tools — the seven grounded lookups | 2 | 11.1, 10.3, 10.4 | | |
| 11.3 | Simulation tools | 1 | 11.1 | | |
| 11.4 | Constitution and org roster builder | 1 | 10.6 | | |
| 11.5 | The agent loop | 2 | 10.7, 11.1, 11.4 | | |
| 11.8 | Numeric and entity validators | 1.5 | 11.5 | | |
| 13.4 | Golden-question regression suite | 1.5 | 13.2 | | |

## 23.5 Backend team — task assignments

| Task | What it is | Days | Depends on | Owner | Pair |
|---|---|---|---|---|---|
| 10.1 | Provider dependency, config, boot guard | 0.5 | — | | |
| 10.2 | Split `computeAll` into load and compute | 0.5 | — | | |
| 10.5 | Migration — the four agent tables | 0.5 | — | | |
| 10.6 | Turn context — the frozen roots bundle | 0.5 | 10.2 | | |
| 11.6 | The SSE route | 1.5 | 11.5 | | |
| 11.7 | Rate limiting, daily budget, usage accounting | 1 | 10.5, 11.6 | | |
| 11.9 | Conversation persistence and windowing | 1 | 10.5, 11.6 | | |
| 12.2 | Navigation catalog and `propose_navigation` | 1 | 11.1 | | |
| 12.7 | `get_page_context` and page metric wiring | 1.5 | 12.2 | | |
| 13.1 | Succession simulation — **blocked on D-70** | 2 | 10.2 | | |
| 13.2 | The `simulate_reassignment` tool | 0.5 | 13.1, 11.3 | | |
| 13.3 | Graph staleness surfacing | 0.5 | 10.6, 11.2 | | |
| 13.5 | Fallback, feature flag, documentation | 2 | all | | |

## 23.6 Frontend team — task assignments

| Task | What it is | Days | Depends on | Owner | Pair |
|---|---|---|---|---|---|
| 12.1 | Extract the single navigation path | 0.5 | — | | |
| 12.3 | The SSE client | 1 | 11.6 | | |
| 12.4 | Agent provider and shell mount | 1 | 12.3 | | |
| 12.5 | Panel, message and composer | 2 | 12.4 | | |
| 12.6 | Tool trace and navigation offer | 1 | 12.5, 12.2 | | |
| 12.8 | Route restructure — agent at `/` | 2 | 12.5, 12.2 | | |

## 23.7 Cross-team handoffs

These are the only points where one team waits on another. Each is a contract that should be agreed in
writing on day one, so the consuming team can build against it before it exists.

| Handoff | From | To | Contract | Needed by |
|---|---|---|---|---|
| Frozen turn context | Backend 10.6 | AI 11.1 | `{ roots, intel, snapshotAt, graphSource, graphStale }` (§10.6) | Start of week 2 |
| Tool declarations | AI 11.1 | Backend 12.2 | Tool module shape and result envelope (§11.1) | Mid week 2 |
| Agent loop | AI 11.5 | Backend 11.6 | `runTurn({ turnContext, history, userMessage, emit, signal })` (§11.5) | End of week 2 |
| SSE event protocol | Backend 11.6 | Frontend 12.3 | Appendix B — agree this on **day one**, it unblocks the frontend before the route exists | Start of week 2 |
| Navigation catalog | Backend 12.2 | Frontend 12.8 | Shared JSON or the drift-tested duplicate, per D-71 | Week 3 |
| Succession result | Backend 13.1 | AI 13.2 | `employeeLeavesWithSuccessor` return shape (§13.1) | Week 3 |

**The one to get right early is the SSE protocol.** Appendix B is already written; if the frontend team
agrees it on day one they can build the entire client and panel against a stubbed stream and never wait
for the backend route.

## 23.8 Who is blocked, and when

- **Nobody is blocked in week 1.** Backend 10.1/10.2/10.5, AI 10.3/10.4, and Frontend 12.1 all have no
  dependencies.
- **AI is the critical path in week 2** — 11.1 → 11.5 gates both the SSE route and everything the
  frontend renders. Staff this pair with the strongest people.
- **Frontend can run ahead of the backend all the way to 12.5** by stubbing the SSE stream.
- **Only 13.1 is decision-blocked** (D-70). If it is still open by week 3, move that pair onto 13.5 and
  the golden-question suite rather than letting them idle.

---

# Appendix A — Tool catalog

All thirteen. Schemas are the OpenAPI subset Gemini accepts: flat objects, enumerated strings, no deep
nesting.

| # | Tool | Parameters | Returns |
|---|---|---|---|
| 1 | `resolve_entity` | `query` string; `type` enum | Candidates with confidence; ambiguity flag |
| 2 | `get_org_snapshot` | none | OIS and pillars (authored), org health, coverage, counts |
| 3 | `get_entity_profile` | `type` enum; `id` string | Ownership, SPOF verdict, documentation, predicted risk, dependencies, workflows, knowledge, RACI, continuity |
| 4 | `list_entities` | `type` enum; `criticalityAtLeast` enum; `hasBackup` boolean; `documented` boolean; `status` enum; `department` string; `ownedBy` string; `sort` enum; `limit` integer | Filtered list |
| 5 | `get_intelligence` | `area` enum of thirteen derived products | The full computed object with its evidence gate |
| 6 | `run_brain_analysis` | `analysis` enum of live module slugs | Payload, confidence, recommendations, graph load time |
| 7 | `get_metric_definition` | `metric` enum | Definition, range, bands, authored flag, source location |
| 8 | `run_simulation` | `scenario` enum of four; `targetId` string | Impacted sets, severity, health delta, baseline and simulated scores |
| 9 | `rank_scenarios` | `limit` integer | Worst-first ranking |
| 10 | `compare_scenarios` | two scenario descriptors | Both results plus a server-computed diff |
| 11 | `simulate_reassignment` | `fromEmployeeId`; `toEmployeeId` | Handover result, residual risk, comparison against no successor |
| 12 | `get_page_context` | `page` enum of routes | Sections with current headline metric values |
| 13 | `propose_navigation` | `page` enum; `section` string; `reason` string | Validated offer with href, or a tool error |

**Writing tool descriptions.** Be prescriptive about *when* to call, not merely what the tool does.
"Call this when the user asks about one specific named person, agent, workflow or tool" outperforms
"Returns an entity profile." Tool descriptions are production behaviour and belong in code review.

---

# Appendix B — SSE protocol

**Response headers**

```
Content-Type: text/event-stream
Cache-Control: no-cache, no-transform
Connection: keep-alive
X-Accel-Buffering: no
```

Write `:\n\n` immediately on open, before any work, so the client sees life during a cold start.

**Events**

| Event | Payload | When |
|---|---|---|
| `ready` | `{ conversationId, snapshotAt }` | Immediately after the turn context is built |
| `token` | `{ text }` | Each text delta |
| `tool_start` | `{ id, name, label }` | Before a tool executes; `label` is human-readable |
| `tool_done` | `{ id, name, summary, durationMs }` | After it returns |
| `warning` | `{ code, message }` | Stale graph, iteration cap, validator flag |
| `done` | `{ text, toolTrace, navigationOffer, provenance, usage, validatorStatus }` | End of turn |
| `error` | `{ code, message, retryable }` | Terminal failure |

Heartbeat: `:\n\n` every fifteen seconds while the stream is open.

---

# Appendix C — Environment variables

| Variable | Scope | Secret | Default | Notes |
|---|---|---|---|---|
| `AGENT_ENABLED` | Backend | No | `false` | Master flag; routes unmounted when false |
| `AGENT_PROVIDER` | Backend | No | `gemini` | Selects the adapter |
| `AGENT_MODEL` | Backend | No | `gemini-3.7-flash` | Never hardcode; confirm the current free row |
| `GEMINI_API_KEY` | Backend | **Yes** | — | Render `sync: false` |
| `ANTHROPIC_API_KEY` | Backend | **Yes** | — | Only when the provider is Anthropic |
| `AGENT_MAX_ITERATIONS` | Backend | No | `8` | Tool rounds per turn |
| `AGENT_TURN_TIMEOUT_MS` | Backend | No | `120000` | Wall clock per turn |
| `AGENT_DAILY_TURN_BUDGET` | Backend | No | `40` | Per user per day |
| `AGENT_GRAPH_STALE_HOURS` | Backend | No | `6` | Stale-graph warning threshold |
| `NEXT_PUBLIC_AGENT_ENABLED` | Frontend | No | `false` | Shows or hides the panel |

Existing variables are unchanged: `SUPABASE_URL`, `SUPABASE_KEY`, `DATABASE_URL`, `PORT`, `JWT_SECRET`,
`TOKEN_TTL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_ORG`, `CORS_ORIGINS`, `NEXT_PUBLIC_API_URL`.

---

# Appendix D — Glossary

For engineers new to this codebase.

| Term | Meaning |
|---|---|
| **Roots** | The 21 source tables holding facts maintained outside this codebase. `loadRoots()` reads them in one parallel batch. Everything derived is a pure function of this bundle. |
| **Derived intelligence** | The computed summaries in `domain/derived.js` — accountability, collaboration, predictive risk, pillars, org health and others. Formerly frozen database rows; now computed on demand with provenance. |
| **The brain** | `backend/brain/` — a knowledge graph plus 51 analyses, module codes M01 to M55. A library, not a service. Reached through `domain.graph.run()`. |
| **Evidence gate** | The mechanism that returns "insufficient evidence" plus coverage instead of a number when too little data supports a score. |
| **SPOF** | Single point of failure. Defined once, in `definitions.js`: sole owner, no backup, criticality at or above high. Dependents are deliberately not consulted. |
| **Authored versus measured** | An authored formula is a product judgement — the pillar weights, for instance — rather than something derived from data. Authored values are labelled wherever they surface. |
| **OIS** | Organizational Intelligence Score. `pillars.orgScore`. There is exactly one, per decision D-02. |
| **Health delta** | The drop in the real organizational health index when a scenario is applied to a mutated copy of the roots bundle. Not a separate simulated-health formula. |
| **Cascade reach** | What transitively fails downstream when a node fails. Direction matters and was a live bug once — see the decision log. |
| **D-nn** | A numbered product decision in the central decision log. Not reopened without cause. |
| **W-x** | A workstream. W-A through W-K are complete; this document is W-L. |
| **Frozen roots invariant** | One roots read per agent turn, shared by every tool, so no two tools in one answer can disagree. |

---

*End of implementation plan. Companion architecture document:
`docs/superpowers/specs/2026-08-27-w-l-agent-interface-design.md`.*
