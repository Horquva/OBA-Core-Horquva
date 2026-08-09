# T1 Team Brief

**From:** Affan Ahmed Khan — Integration and Release
**Purpose:** every person's T1 scope, folder, and exit test in one place.

Each block below is written to be sent directly to that person.

---

## Send to everyone first

> **OCOS T1 is set up and ready for you to start.**
>
> The repository now has the frozen OCOS structure. **You have a folder with your name on it** — open its `README.md` and it tells you what you build, when it's done, and which contract governs it.
>
> Three things before you write any code:
>
> 1. **Build only in your assigned folder.** CI fails the build if a new top-level directory appears.
> 2. **Contracts come before code.** If someone is waiting on your contract, that is your first task — it is a page of writing, not an implementation.
> 3. **Read the plan:** `docs/executive_workspace/T1_T7/T1_INTEGRATION_MAP.md`. Section 2 is the signal path, section 4 is the stages.
>
> Three rules that apply to every hop, no exceptions:
>
> - **`signal_id` is generated once, at ingestion, and never regenerated.** If your code creates one, something upstream is broken — raise it, don't work around it.
> - **Log one line on entry and one on exit, both carrying `signal_id`.** This is how we find where a signal stopped.
> - **If you cannot process a signal, log the reason and stop.** Never pass a partial payload downstream and never substitute a default. A stage that fakes success is worse than one that fails.
>
> Anything blocking you, tell me the same day. A blocked person who waits quietly costs more than the blocker did.

---

# Stage 1 — contracts

These five block everyone else. Nothing downstream starts until they land.

## Umer Siddiqui

> **Folder:** `connectivity/connector_platform/github/` and `perception/ingestion/`
> **Contract:** `applications/executive_workspace/integration/contracts/01_event_contract.md`
>
> **First task — the event contract.** Define the shape of an event: `source`, `type`, `timestamp`, `actor`, `external_id`. The file already lists the fields; fill in the types and what each one means, then tick the freeze box.
>
> **Done when:** the shape is written down and circulated.
>
> **You block Janita and Maaz.** Both are waiting to see your shape before they can design theirs.
>
> **Then:** the connector itself. GitHub, polling with a read-only token — not webhooks. Webhooks need GitHub to reach your machine over the internet, which is setup we don't need for T1.
>
> **Ingestion is where `signal_id` is created.** It is the only place in the whole system that generates one.

## Maaz Khan

> **Folder:** `evidence/classification/`
> **Contract:** `applications/executive_workspace/integration/contracts/02_classification_contract.md`
>
> **First task — the classification contract.** Define the four categories: Public, Internal, Restricted, Sensitive or Secret. Define the metadata shape that travels with a classified signal.
>
> **Done when:** the metadata shape is written down and circulated.
>
> **You block Janita and Haroon.** Janita attaches your classification at write time; Haroon enforces it on what gets served.
>
> **Then:** the action model — detect, classify, quarantine or redact, audit, block. Each action produces a structured record.
>
> **One hard rule:** never log the sensitive payload to prove it was caught. Classification may be narrowed downstream, never widened.

## Saad Mehmood

> **Folder:** `runtime/orchestrator/langgraph/` and `runtime/api/`
> **Contract:** `applications/executive_workspace/integration/contracts/03_agent_contract.md`
>
> **First task — the agent contract.** Define what the graph accepts and what it returns: `finding`, `confidence`, `evidence_ids`, `severity`, `classification`, `reasoning`.
>
> **Done when:** the contract is frozen for T1.
>
> **You block Tanveer and Jawad.**
>
> **`evidence_ids` is the field the whole gate rests on.** It must resolve against records Janita actually stored, for the same `signal_id` that entered at ingestion. Without that, the result is asserted rather than evidence-linked, and the gate does not close. It is the first thing checked at wire-up.
>
> **Transport:** the graph runs as a separate Python service reached over HTTP. Haroon provides transport; the orchestration contract stays yours.

## Zoya Khaliq

> **Folder:** `applications/executive_workspace/frontend/design_system/tokens/`
> **Spec folders:** `docs/executive_workspace/ui_specification/`, `docs/executive_workspace/design_tokens/`
>
> **First task — design tokens.** Typography, spacing, cards, badges, status and confidence indicators.
>
> **Done when:** tokens are committed and importable.
>
> **You block Mushtaq and Fatima.** Neither can start until tokens exist. Ship these before anything else.
>
> **Then:** the app shell with loading, error, empty, and unavailable states — rendering every state with no backend attached.
>
> **Note:** the workspace UI lives only in `applications/executive_workspace/frontend/`. The root `frontend/` folder is the old MVP and is not part of OCOS.

## Muhammad Haroon

> **Folder:** `connectivity/api/`, `perception/api/`, `applications/executive_workspace/backend/`
> **Contract:** `applications/executive_workspace/integration/contracts/04_api_contract.md`
>
> **First task — API path structure and service skeleton, with me.** Plus database connectivity.
>
> **Done when:** services reach the databases from dev.
>
> **You block everyone downstream.**
>
> **Database work is already done — start from it, don't rebuild it.** `infrastructure/databases/` has the Docker setup, migration runner, connection conventions, and naming rules. Read its README first.
>
> **Your API paths are transport only.** Receive, call the capability, return the result. No reshaping, no defaults, no classifying, scoring, filtering, or ranking. If something needs that, it belongs to the capability owner.
>
> **Also:** you are my backup. Once the chain runs, you write the runbook for reproducing it — not me. If you can write it, you understood it.

---

# Stage 2 — shapes

## Janita Tahir

> **Folder:** `evidence/evidence_store/`, `evidence/provenance/`
> **Contract:** `applications/executive_workspace/integration/contracts/05_evidence_record.md`
> **Waiting on:** Umer's event contract, Maaz's classification contract
>
> **Task — the evidence record shape,** with canonical structures for people, teams, repositories, work items, relationships, and provenance.
>
> **Done when:** a record can be written and read back with provenance intact, and evidence is queryable by `signal_id`.
>
> **Scope for T1:** the smallest thing that satisfies that sentence. Not the full canonical model — that is later. If you are unsure where the line is, ask me rather than assuming, because assuming large costs weeks and assuming small fails the gate.
>
> **Classification is attached at write time,** never added afterwards.

## Ahmad Tanveer

> **Folder:** `runtime/orchestrator/langgraph/` — alongside Saad
> **Waiting on:** Saad's agent contract
>
> **Task — graph state definition. First node and edge.**
>
> **Done when:** the skeleton executes and carries state through one pass.
>
> **Split with Saad:** Saad decides what the graph means. You decide how it runs. Confirm this with him directly before you start.

## Fatima Asif

> **Folder:** `applications/executive_workspace/frontend/oba/`
> **Spec folder:** `docs/executive_workspace/interaction_specification/`
> **Waiting on:** Zoya's tokens
>
> **Task — the frontend state vocabulary, in code:** idle, listening, processing, considering, responding, interrupted, error, reconnecting.
>
> **Done when:** the vocabulary exists as code and the shell can drive it.
>
> **Rule:** frontend state mirrors backend state. It never invents one.

## Mushtaq Ahmad

> **Folder:** `applications/executive_workspace/frontend/components/`, `.../states/`
> **Waiting on:** Zoya's tokens
>
> **Task — base components built against the tokens. Every state rendered, including empty and error.**
>
> **Done when:** no component is missing a defined state.
>
> **For T1:** only the components needed to render a finding. Not the full library.

## Bisma Nadeem

> **Folder:** `world_model/beliefs/`
> **Contract:** `applications/executive_workspace/integration/contracts/06_belief_record.md`
> **Waiting on:** Janita's evidence record
>
> **Task — the belief record shape:** claim, assessment, confidence, evidence both ways, timestamp, freshness, version, reason for last update.
>
> **Done when:** the shape is defined and versionable.
>
> **For T1 this is the shape only — not an implementation.** Janita and Saad need to see what is coming; building it is later.
>
> **Rule:** prior beliefs are versioned, never overwritten.

---

# Stage 3 — first real output

## Jawad Zaheer

> **Folder:** `understanding/organizational/`
> **Waiting on:** Janita's evidence store
>
> **Task — extraction.** A real event becomes a structured claim carrying entity, timestamp, source, evidence ID, and confidence.
>
> **Done when:** a claim comes out of a real event with its evidence attached.
>
> **For T1: one claim type.** Not the full understanding layer.
>
> **The evidence ID must point back to a record Janita actually stored.** That link is what Saad's `evidence_ids` depends on, and what the gate is testing.
>
> **Rule:** never invent facts. Insufficient evidence beats fabricated certainty.

## Muhammad Ahmed

> **Folder:** `evidence/validation/`
> **Waiting on:** Jawad's extraction
>
> **Task — the validation suite for extraction.** Check every claim carries evidence ID, source, timestamp, entity reference, confidence, and classification.
>
> **Done when:** the suite fails a claim missing any one of those.
>
> **It must fail loudly.** A suite that warns and passes is not a gate.

## Ahmed Abubakar

> **Folder:** `testing/reasoning_eval/`
> **Waiting on:** Jawad's extraction
>
> **Task — the golden fixture set:** expected evidence, claims, uncertainty, and known bad outputs.
>
> **Done when:** the suite runs against extraction output.
>
> **The known bad outputs matter as much as the good ones.** A suite that only proves success does not tell us anything when things go wrong.

## Aleesha Manahil

> **Folder:** `testing/validation/`
> **Waiting on:** the chain existing
>
> **Task — an executable scenario covering the full T1 gate path.**
>
> **Done when:** the gate passes or fails on its own, without a person interpreting the result.
>
> **It must run against real stages.** A scenario passing over stubbed stages is not a passing gate — the gate explicitly forbids using a fake downstream result to claim success.
>
> **You are not blocked in the meantime:** write the scenario against the contracts now, so it is ready the moment the chain stands up.
