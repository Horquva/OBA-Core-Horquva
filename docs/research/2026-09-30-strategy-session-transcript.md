# Horquva / OBA Core — Strategy Session Transcript

**Dates:** 2026-09-29 → 2026-09-30
**Participants:** Affan Ahmed (owner) · Claude (Claude Code)
**Branch at start:** `fix/intelligence-trust`

This is the conversation, turn by turn. User messages are quoted as sent. Claude's responses are reproduced in full or near-full. Tool activity (code reading, web research) is summarised in *italics*.

## Artifacts produced

| # | Document | Path |
|---|---|---|
| 1 | MVP Scope Boundary (first draft, superseded by 3–4) | `docs/superpowers/specs/2026-09-29-mvp-scope.md` |
| 2 | Feasibility Study (APIs, endpoints, data reality) | `docs/research/2026-09-29-horquva-feasibility-study.md` |
| 3 | Product Engineering Foundation & Final MVP Scope (2 engineers) | `docs/research/2026-09-29-horquva-product-engineering-foundation.md` |
| 4 | Simulations & Predictions Feasibility | `docs/research/2026-09-30-simulation-prediction-feasibility.md` |
| 5 | This transcript | `docs/research/2026-09-30-strategy-session-transcript.md` |

**Input document reviewed:** *Horquva_MVP_Feature_Additions.docx* (the founder's three-feature definition and the 12-step "Horquva equation").

---

## Turn 1 — Define a clear MVP scope

**User:**
> *(pasted a prior summary: trust fixes to the risk engine, plus a module audit showing 17 pages and 136 components answering the same questions many times)*
> alright so what i want you to do is u have an idea of what we are building right and as of the moment many of the modules are computing the same thing i dun want that and there are some modules that are computing things directly in the frontend i want u to analyze everything and define a clear scope beacuse rn the frontend looks shit none of it makes any sense no direction not knowing what is actually being computed too many abstract values i want u to do ur research and tell me how we are gonna fix this mvp so its actually readt to pitch to a client i want you to find a proper direction a clear scope boundary of what we do and what we dont be clear and explicit

*Claude read the blueprint (`docs/HORQUVA_OBA_CORE_BLUEPRINT.md`), the sidebar, all 17 pages and their imports, the browser-side scoring libraries (`riskIntelligence.ts`, `knowledgeRisk.ts`, `aiToolIntelligence.ts`, `graph.ts`), component-level math, the backend API mounts (~58), and the `dependencyScan.js` route. It wrote artifact #1.*

**Claude:**

I've written the full scope in `docs/superpowers/specs/2026-09-29-mvp-scope.md`. It's not committed yet. Here's the direction.

**What we sell.** Horquva finds the places where your organisation is one person, one AI agent or one vendor away from something breaking, and tells you what to fix first. That's the Executive Dependency Scan from the blueprint. From now on, if a screen doesn't help produce, explain or act on the scan, it's out.

The MVP answers four questions, and only these:
1. **Where are we exposed?** Critical assets with no owner, no backup or no documentation, plus which of those facts we don't know yet.
2. **Who or what is a single point of failure?** Always shown with the named list of what breaks.
3. **What happens if X leaves or fails?** Pick someone or something, see what stops working, then test a successor.
4. **What do we do first?** One ranked action list; each action names the fact it fixes.

**One data model underneath.** Every asset carries five facts: criticality, owner, backup, documented, depends-on. Each can be "not recorded". They're classified once in the backend, and every page and the agent read that same classification.

**Rules every screen follows.**
- The backend computes and the frontend only displays.
- "Not recorded" never means "no".
- Every number is a count of named things you can click through to.
- No 0–100 scores on screen.
- People are shown as holders of assets, never scored or ranked (the US compliance plan requires this).
- No invented benchmarks, no module codes, plain English only.

**17 pages become 7:** Overview (was Dashboard); Assets (Risk + AI Tools + Knowledge undocumented + Workflows list); People (Ownership + Knowledge people + Org Memory + Continuity); Map (Dependency Map + Network + hidden deps + Org Science graph cards); What-If (Simulation + departure sim + blast-radius sim + outage panel); Actions (5 recommendation lists + Decision queue + dashboard feeds); Agent.

**Out of the MVP:** Org Science's abstract cards; Forecast (frozen data); Decision Intelligence; any health, maturity or intelligence index; per-person scores; volatility and trends; replaceability scoring; live connectors; self-healing and automation.

**Headline:** a count instead of a score: "9 of 15 critical assets are fully covered · 4 exposed · 2 unknown". This amends Blueprint Invariant 3; its intent (one number, computed once, in the backend) stays.

**Found while researching:** `/api/intelligence/dependency-scan` exists, but **no page reads it**, so the product you pitch has no screen. It also treats a missing record as "no backup / undocumented".

**Build order:** backend definitions + one scan module → 7 new pages → demo data (30 of 40 employees lack an owners row) → browser pass of the 5-minute pitch. Six decisions (S-1…S-6) need sign-off.

---

## Turn 2 — Rebuild or refactor?

**User:**
> what do u think would be better re building this product again cuz i know at the moment this p[roduct is nowhere no scope is defined we do not know what we are building and where the product is actually headed we do not have any clue about it what do u think

**Claude:**

I wouldn't rebuild the whole thing from scratch. I would rebuild the frontend from scratch.

**Why not a full rebuild:** the problem is the missing scope, not the code. A fresh codebase without a fixed scope sprawls again in 2–3 months. The backend has months of fixes (owner-ID lookup bug, unified single-point-of-failure definition, consolidated cascade simulation, the "not recorded" fix with 32 checks). The pile around it is what's wrong: 58 API mounts, 55 brain modules, frozen tables.

**Why rebuild the frontend:** nearly all the incoherence lives there. The scope cuts ~70% of 136 components anyway.

**Plan:** (1) freeze scope; (2) one new backend scan module with ~6 endpoints; (3) a new 7-page frontend while the old one stays live; (4) in parallel, sell the scan before the software is finished.

**The bigger issue:** nobody has confirmed a buyer wants this. Take 3–5 prospects' spreadsheets and hand each a scan report, even partly by hand.

**Check:** a second plan (the "frozen OCOS" tree, T1–T7) may still be live. Two competing plans is part of why nobody knows where this is headed.

**Size:** ~2–3 weeks for contract + 7 pages + demo data; a full rewrite would be 2–3 months.

---

## Turn 3 — What do you think of this product?

**User:**
> what do u think abt this product

**Claude:**

The underlying idea is good and well-timed, but the product has been built far wider than anyone has proven customers want.

**Strong:** a real, easy-to-explain problem; good timing (AI agents deployed with no owner; DORA, ISO 42001, SOC 2 pressure); one dependency map across people, agents, tools and vendors is a real differentiator; the Dependency Scan is a sensible wedge.

**Worries:**
1. The data is the product, and customers don't have it. It's part consulting, part software early on.
2. The buyer isn't defined (CIO, COO, CISO, head of AI, risk and compliance; four industries).
3. The maths is ahead of the evidence. "Mathematical proof", "peer-reviewed" and "calibrated" are unsupported.
4. It's crowded next door (continuity software, IT asset databases, workforce analytics, AI governance).
5. A one-off scan isn't a recurring business. Recurring value needs change detection, which needs live data.

**Overall:** about three times wider than its evidence. The sharpest angle I suggested then was a register of AI agents and who owns them. *(Corrected in Turn 11: that space is contested.)* That's a bet; test it with 3–5 prospects.

---

## Turn 4 — Which modules should we keep?

**User:**
> wait so what do u think like which modules should we keep

**Claude:**

**Frontend:** keep Agent; rebuild Dashboard → Overview; merge into Assets, People, Map, What-If, Actions; cut Org Science, Forecast, Decision Intelligence, the Workflows extras; keep Admin, Account and Login hidden, with a Data tab.

**Backend keep:** `domain/definitions.js`, `derived.js`, `simulations.js`, the cascade engine, `concentration.js` (in words), the brain's `graphLoader` only, `dependencyScan.js` (fixed), agent, auth, ingest, crud/mutations, dataQuality.

**Park:** `replaceability.js`, `changeImpact.js`, `volatility.js`, score history, and the Bayesian risk score. Order lists by a checkable rule instead: critical first, then how many facts are missing, then how much depends on it.

**Cut:** the 55 brain modules and orchestrator; truth, constitutional, reality, brainCore; forecast, learning, decisionIntelligence, decisionSupport; selfHealing, automation, avatar; voice; executiveMemory, context, briefing; collaboration, accountability, signals.

**Net:** 17 pages → 7; ~58 API mounts → ~12.

---

## Turn 5 — Flag the unnecessary complications; what's the foundation?

**User:**
> wait and there is alot of fuss like extra things we do not need like unnecessory complications flag them qand like give an overview like a solid foundation of what the mvp will be about after stripping all these shits like its a discussion no plan or doc yet

**Claude:**

**Unnecessary complications:**
- **Scores and labels:** 8+ status scales for one idea; 4–5 headline numbers (79 pillars, 67 health, 13-signal composite, radar average, "Brain Index"); cosmetic confidence values; module codes and jargon.
- **Engines:** two stacked risk engines (eIRWR + Bayesian); health change per simulation (35/48 are zero); a background ranking cache built for 400+ employees.
- **Data plumbing:** two ways out of the database that disagree (graph loaded at boot vs per-request reads); daily snapshot and frozen tables; leftover datasets and Python prototypes; multi-tenant machinery in a one-org-per-deployment product.
- **Architecture and plans:** heavy evidence envelopes; a 4-stage ingestion pipeline with 7 connectors; a 3-tier AI model router; the OCOS restructure; a search index with ~28 retired module codes.

The common thread: most of this makes numbers *look* rigorous, not true or useful.

**The foundation:** "Horquva shows you which of your critical AI agents, workflows and tools depend on a single person or vendor, what breaks if they go, and what to fix first."
- **Data:** five facts per asset, three states each.
- **In:** spreadsheet template + edit screen.
- **Computes:** exposed; single point of failure; what breaks (+ successor test); what to fix first.
- **Sees:** 7 screens, one headline count.
- **Walks away with:** the scan report plus the list of unknown facts.

---

## Turn 6 — "The MVP will be too simple"

**User:**
> no but then the mvp will be too simple like we are almost stripping off all the features nothing will remian

**Claude:**

Simple isn't thin. What goes is breadth; the depth stays:
1. one dependency map across people, agents, workflows, tools and vendors;
2. cascade simulation, including indirect effects;
3. succession testing (does handing Omar's work to Yuki fix it, or overload Yuki?);
4. concentration ("72% of critical automations run on one model provider");
5. hidden dependencies;
6. ranked, explained actions;
7. the Agent;
8. the scan report.

That's the blueprint's three MVP features plus simulation and the agent.

**Pushing back on myself, two should come back:**
- **"What changed" (change → impact).** It turns a one-off report into a subscription.
- **Replaceability, reworded** as easy vs hard to replace, from facts, as a criticality × replaceability 2×2.

A prospect judges a demo on 2–3 moments; 17 pages of abstract numbers bury them.

---

## Turn 7 — Review of *Horquva_MVP_Feature_Additions.docx*

**User:**
> *(attached Horquva_MVP_Feature_Additions.docx)* take a look at this and what do u think

*The document defines: the existing graph foundation; Feature 1 Criticality + Replaceability (High/Medium/Low + why); Feature 2 Concentration; Feature 3 Change → Impact; volatility "NOT a fourth build"; the 12-step Horquva equation (MAP → CONNECT → DISCOVER → PRIORITIZE → MEASURE → ASSESS → DETECT → REASON → SIMULATE → RECOVER → RECOMMEND → REMEMBER); build order locked 1 → 2 → 3; commercial door is the Executive Dependency Scan.*

**Claude:**

This document is good, and it's the direction I was looking for.
- One product in layers.
- A built-in scope filter: "Everything we build should be able to point to a step in this chain." Org Science, Forecast, Decision, pillars and culture/DNA all fail it.
- Plain-language ratings.
- The wow moment is a sentence.
- Change → Impact answers the "too simple" worry.
- Disciplined about volatility.

**What went wrong:** the document is clear, the codebase didn't follow it (engines and HHI instead of High/Med/Low; pages that map to no step). The backend pieces for all three features largely exist; the job is to surface them simply and fix them.

**Where it's too optimistic:**
1. "DISCOVER: what is hidden" is not really built (tacit ownership needs activity data).
2. "Alternative vendors/models exist" isn't in the data; add a fallback fact.
3. "Which customers are affected" is only partly possible.
4. Change → Impact needs changes to arrive (CSV means empty briefings; needs a live feed).
5. RECOVER (succession) is actually ahead of schedule.

**Implication:** organise the product along the chain. 8 screens: Overview/Scan, Map, Assets, Concentration, Changes, What-If, Actions, Agent. Treat this doc as the product definition, and my scope doc as the engineering rules underneath.

---

## Turn 8 — MVP description text; deterministic functions vs AI agents

**User:**
> give a text like which should say what our mvp will be about and about determinstic functions is that better approach than actually deploying ai agens

**Claude:** shareable text:

```
HORQUVA MVP — WHAT WE ARE BUILDING

Horquva shows leadership where their organisation depends on a single
person, AI agent, vendor or system — what breaks if it goes, and what to
fix first.

Modern companies run on people, AI agents, software, models and vendors
all tangled together. Nobody has one picture of who owns what, what
depends on what, and where there is no backup. Leadership finds out when
something breaks. Horquva builds that picture and turns it into
decisions.

THE FOUNDATION
One map of the organisation: people, AI agents, workflows, tools, models
and vendors, connected by who owns what and what depends on what. For
every asset we record four facts: how critical it is, who owns it, who
backs them up, and whether it is documented. If a fact is missing, we say
"not recorded" — we never guess.

WHAT THE MVP DOES
1. Criticality & Replaceability — for every asset: how important is it,
   and how hard would it be to replace? Rated High / Medium / Low, with
   the reason in plain words.
2. Concentration — finds where too much rests on too little.
   e.g. "Ahmed owns 8 workflows and 3 AI agents. None has a backup."
3. What-If — "What happens if Ahmed leaves?" or "if our AI model
   provider goes down?" Shows exactly what stops working, and tests
   whether handing the work to someone else fixes it or just moves the
   risk.
4. Change → Impact — when something changes (an owner leaves, a model is
   swapped, a backup disappears), explains what it affects. Feeds a
   weekly briefing for leadership.
5. Actions — one ranked list of what to fix first, each tied to the fact
   it fixes.
6. Ask Horquva — an assistant that answers questions about all of the
   above in plain English, using the same data.

HOW CUSTOMERS START
The Executive Dependency Scan: from a spreadsheet of their people, AI
agents, tools and workflows, a board-ready report within 48 hours.

WHAT WE DO NOT DO
No abstract "health" or "culture" scores. No scoring or ranking of
individual employees. No forecasts we can't back with data. Every number
on screen is a count of real, named things you can click into.

THE TEST FOR EVERY FEATURE
Does it help answer: What exists? What depends on what? What matters
most? Where are we concentrated? How replaceable is it? What changed?
What does it affect? What should we do? If not, it's not in the MVP.
```

**Deterministic functions or AI agents?** Deterministic functions should do all the computing; AI should only be the interface.
- **Why:** trust (same answer twice); it can be checked (traces to rows); compliance (US automated-decision rules on employees get stricter when AI judges people); it can be tested; cost and speed; the problem is small and structured.
- **Where AI adds value:** answering questions by calling the functions; writing the weekly briefing prose; getting messy data in (inferences marked as suggestions, confirmed by a human).
- **Avoid:** autonomous agents deciding risk, ranking people or changing data.
- **Pitch line:** "Our findings are computed, not guessed. Every conclusion traces to a record you can check. AI helps you ask questions and read the results, but it never makes the call."

---

## Turn 9 — Connectors instead of spreadsheets

**User:**
> the thing is i am planning to connect all this to jira slack workforce n8n like no company wopuld hand over their data in a spreadsheet whata the feasibility study on that

*Claude checked the n8n public API and Workday integration options.*

**Claude:**

It's feasible and the right direction, but connectors move friction rather than remove it: every one needs admin approval and a security review. **"Who is the backup" isn't recorded in any of these tools**, so the realistic model is connectors plus a short confirmation step.

| Source | Gives | Feasibility | Watch out |
|---|---|---|---|
| Workday | Identity backbone, departments, managers, leavers | Medium-hard (customer admin must configure) | Consider a unified HR API (Merge, Knit, Apideck, Unified.to), or Entra ID / Google directory (easier) |
| n8n | Every automation, the tools and models it calls, owner, failures | Easy (API key; self-hosted Community + paid Cloud; not the free trial) | n8n-only; secrets never touched |
| Jira | Project/component leads, incidents, activity | Easy-medium | Department/title only via Admin API; hidden emails; use `/search/jql` |
| Slack | Identity; SCIM department/manager/title (Business+/Enterprise) | Hardest, lowest value | Terms restrictions; throttling for non-Marketplace apps. Never read messages. |
| GitHub | CODEOWNERS, READMEs/runbooks, CI, Copilot seats | Easy, strong fit | Tech companies only |

**The hard problems:** matching people across tools (build an identity spine first); stated vs inferred facts; security review (read-only, metadata only); upkeep (1–3 weeks per connector, then ongoing ownership).

**Good news:** connectors make Change → Impact real.

**Order:** identity spine → n8n → GitHub or Jira → Slack last (identity only).

---

## Turn 10 — What to do with the product in hand

**User:**
> so now keeping all this m,ind what should we do about the product we have in hand

**Claude:**

Keep the backend core, rebuild the frontend, design the data layer for connectors from day one. The Feature Additions doc is the product definition.

- **Stop now:** work on pages outside the chain; the OCOS restructure; new scoring maths. Don't delete code yet.
- **Phase 1 — connector-ready fact layer (~2 weeks):** every fact has provenance (stated / inferred / not recorded + source); a fallback fact; one scan module for the three features; fix `dependencyScan`; one headline; tests.
- **Phase 2 — new frontend (2–3 weeks):** 8 screens; delete browser scoring; agent calls scan functions only.
- **Phase 3 — first connectors (3–4 weeks):** staging pipeline; identity spine; n8n; confirmation screen; read-only policy.
- **Phase 4 — pitch-ready:** realistic demo org; PDF scan; demo script; remove "peer-reviewed / calibrated / proof" wording.
- **Alongside:** 3–5 design partners.
- **Timeline:** ~6–8 weeks with connectors, ~4 with CSV. *(Revised in Turn 11 for a from-scratch build.)*

---

## Turn 11 — Don't trust the existing intelligence

**User:**
> and what about the exisiting intelligence we have do we do it all over again cuz i dun trust it

**Claude:**

The distrust is justified (inverted cascade signal, missing = no, 11/17 people CRITICAL, 35/48 zero-change simulations, two headlines, blueprint formulas ≠ code). But brand-new code isn't trusted either. Trust comes from readable rules and hand-checkable tests.

1. **Plumbing and facts — keep and test:** data loading, graph walk, ownership/backup, what-if mechanics, succession.
2. **Scoring models — retire:** Bayesian score, pillars/health numbers, 55 brain modules, confidence values, replaceability points, simulation health change, per-person scores.
3. **The features — rewrite as plain rules:**

| Output | Rule |
|---|---|
| Criticality | High if recorded critical/high or a critical workflow depends on it; Low if nothing important depends on it; else Medium |
| Replaceability | Hard if undocumented + no backup + no fallback; Easy if all three; else Moderate; missing facts → "can't tell yet" |
| Concentration | Flag any person/vendor/model 3+ critical assets rely on with no backup or fallback |
| What-if | Remove X → critical assets left with no owner/backup + everything downstream |
| Change → impact | Diff imports; list downstream + which rules changed answer |
| Actions | One per flagged problem; critical first, then hardest to replace, then most dependents |

**Trust mechanism:** a small hand-checkable test org; tests on real messy patterns; every output carries its reason.

---

## Turn 12 — Consolidated scope: cover vs remove

**User:**
> give the scope of the product like what we are gonna cover and what we are gonna remove

**Claude:**

**What it is:** Horquva shows leadership where their organisation depends on a single person, AI agent, vendor or system, what breaks if it goes, and what to fix first. Filter: every feature answers a step in the chain.

**Cover:**
- **Foundation:** one map; six facts per asset (criticality, owner, backup, documented, fallback exists, depends on); stated / inferred / not recorded.
- **Features:** criticality & replaceability; concentration; what-if + succession; change → impact + weekly briefing; actions; Ask Horquva.
- **Screens (8):** Overview · Map · Assets · Concentration · Changes · What-If · Actions · Agent.
- **Data in:** directory/HR identity spine; n8n; CSV; guided confirmation; read-only, metadata only.
- **Deliverable:** the Executive Dependency Scan.
- **Rules:** backend computes; one definition per concept; click-through; no 0–100 scores; people never scored.

**Remove:**
- **Pages:** Org Science; Forecast; Decision; Workflows extras; Network → Map; Knowledge/Memory/Continuity → Assets/Concentration; Risk/AI Tools → Assets; Recommendations → Actions.
- **Scores:** pillars and 79/67/13-signal; Bayesian; confidence; replaceability points; per-person scores; health change; culture/DNA/maturity; benchmarks.
- **Backend:** brain modules and orchestrator, and the listed routes; browser scoring; frozen tables; leftover datasets.
- **Complications:** 8 status scales; jargon; the 3-tier router; tenancy machinery; the envelope ceremony; the OCOS restructure.
- **Claims:** "peer-reviewed", "calibrated", "mathematical proof".
- **Parked:** Jira/GitHub/Zapier/Make/Copilot Studio; Slack identity; volatility; eIRWR; tacit ownership; multi-org.

---

## Turn 13 — Deep API-level feasibility audit (from scratch)

**User:**
> Before we update the scope, I need you to run a deep audit into each and every feature/functionality/api integration that we are claiming is possible. I need you to verify and validate every feature/functionality/module/possibility. This should be done through API documentation study, exact endpoints that will be needed, a rough idea and architecture of the product and data ingestion, how diffiicult this be.
>
> We will be making this product entirely from scratch. We are most certain that most of the dummy data that we have used cannot be collected in realtime through this tool at all, as that structured and quality data is mopstly not available. That's why this research and study needs to not only verify and validate your claims, but actually also be a feasibility study of how tough and expanded is this project, and whether what we are claiming can actually be made or not.

*Claude checked the n8n OpenAPI source spec (workflows, nodes, credentials, shared/owner, executions, history, projects, audit), Microsoft Graph user properties, the Google Directory API, Merge HRIS, Zapier Workflow API and eligibility, the Make scenarios API, Copilot/Agent 365 package APIs, Agentforce tooling objects, the OpenAI and Anthropic admin usage APIs, PagerDuty escalation policies, Backstage, ServiceNow CMDB, Jira components, and GitHub Copilot seats. It mapped every demo-dataset table and checked competitors. It wrote artifact #2.*

**Claude:**

The product can be built, but not as the fully automatic product we've been describing.

- **Connectors can reliably find:** people, departments, managers and leavers (Entra, Google, Workday via Merge); automations and agents and who built them (n8n, Make, Agentforce); what each depends on (the strongest data); which AI models are used (OpenAI and Anthropic admin APIs); what's failing.
- **No API reliably gives:** backup owner (only PagerDuty escalation level 2, for on-call services), business criticality (only a maintained ServiceNow CMDB), fallback exists.

So the product is **discover + confirm**. Connectors find ~60%; a guided form asks owners for the rest. ~40% of the demo data has no source anywhere; ~35% is directly collectable.

**Where I was wrong earlier:**
1. Zapier requires our app listed in the App Directory and returns no owner.
2. Microsoft's agent inventory needs an Agent 365 licence and returns no owner.
3. The "AI agent register" angle is contested by Zenity, ServiceNow AI Control Tower and Microsoft Agent 365. Position on **continuity** instead.
4. From scratch: ~33–42 engineer-weeks, 3–3.5 months with 3 engineers.

**Can't claim:** fully automated; real-time; hidden knowledge as fact; which customers are affected; mathematically proven.

**Recommendation:** go, with a narrower promise. ICP: 100–2,000 people, M365 or Google, n8n or Make, OpenAI/Anthropic. MVP connectors: Entra or Google, n8n, Make, AI admin APIs, optional PagerDuty, CSV fallback. Run 3–5 manual design-partner scans first.

**Hands-on tests needed:** self-hosted n8n reachability; n8n version differences.

---

## Turn 14 — Engineer the product for two engineers

**User:**
> Based on this study, I need you to engineer my product with what we have and what can be actually built by a team of two engineers. You have to now study existing solutions, similar solutions, design and architecture patterns, data ingestion and ETL pipelines, and other relavant and key foundations this product consists of in order to finalize the project scope and move towards requirements enigneering.

*Claude researched service catalogs (Cortex, OpsLevel), compliance automation (Vanta, Drata), SaaS management (Zylo, BetterCloud; Productiv shutdown), business continuity (Fusion), access-review campaigns (ConductorOne, Lumos), Nango (pricing, self-hosting), Postgres vs graph databases, and ELT / snapshot-diff / SCD2 patterns. It wrote artifact #3.*

**Claude:**

Two engineers can ship v1 in about 3.5 months; the chat agent and PDF report follow a month later.

**What similar products taught us:**
- AI agent governance: don't compete on discovery breadth.
- Business continuity software: proves what-if sells; its maps are manual and enterprise-priced.
- Service catalogs: the named-rule pass/fail/unknown pattern.
- Compliance automation: integrations → checks → evidence → human tasks.
- SaaS management: offboarding is the value moment.
- Access reviews: campaign mechanics for confirmation.

**Positioning:** continuity for companies whose operations now run on AI automations.

**Architecture decisions:**
- plain-rule checks;
- every fact with grade and source, "unknown" stored explicitly;
- raw responses kept (replay);
- snapshot diff with history for changes;
- in-house connectors (Nango deferred);
- email-based identity anchored on the directory, with a review queue;
- Postgres only;
- Postgres-based job queue;
- AI only as the interface.

**Final scope:**
- **v1:** Entra *or* Google, n8n, OpenAI/Anthropic admin, CSV; map, coverage, criticality/replaceability, concentration, what-if, succession, change feed, confirmation campaigns, actions, weekly briefing, identity queue; 8 screens.
- **v1.1:** agent, PDF, second directory, Make, PagerDuty.
- **Later:** Merge HRIS, Jira, GitHub, ServiceNow, Agentforce, Copilot Studio, Zapier, trends, webhooks.
- **Out:** scores, scoring people, forecasts, messages, real-time, customer impact, autonomous AI.

**Plan:** Engineer A = data, Engineer B = product. ~32.5 engineer-weeks (~16 weeks); ~15 with cuts; 12–13 only if the founder runs the design-partner scans. First milestone at week 2: 3+ manual design-partner scans.

**Decisions:** ICP / n8n-first bet; Entra or Google; accept discover + confirm; the v1 / v1.1 split; old code as reference only. Next step: requirements in 10 areas (R-CON … R-NFR).

---

## Turn 15 — Simulations & predictions feasibility

**User:**
> I need you to research about the need, possibility and feasibility of the simulations/predictions that our product claims. THat is something we don't really want to strip off until its very hard or impossible. I need you to research, study, verify and validate this on the same grounds as we did with the overall product.

*Claude checked the blueprint's cited papers (eIRWR arXiv 2608.08073; Aquaro et al. 0906.3968; Kumar et al. 2505.06281), FCA PS21/3, DORA Articles 11 and 28, EU AI Act Annex III, truck-factor research (Avelino et al. 2016; Wheeler 2026), the OpenAI and Claude status-page incident APIs (live-tested), n8n execution retention, and Monte Carlo / fault-tree methods. It mapped the current simulation code. It wrote artifact #4.*

**Claude:**

The simulations should stay; the current predictions shouldn't ship as they are; real predictions are possible on data we actually collect.

**Two different things:** simulation (proved by correctness tests) vs prediction (proved only by comparing past predictions with outcomes).

**Simulations — keep all:**
- **Need:** FCA PS21/3 severe-but-plausible scenario testing across people, processes and technology; DORA Art. 11 and 28; Fusion sells it.
- **Keep:** leaver, automation fails, vendor down, workflow disruption, succession, worst-losses ranking.
- **Add:** credential-owner-leaves; combined scenarios.
- **Replace health change** with concrete impact: orphaned critical assets, stopped automations, runs/week affected.
- **Catch:** n8n prunes execution history after 7–30 days, so Horquva stores daily counts itself.

**Current predictions don't hold up:**
- eIRWR is a real paper but a root-cause tool, run forwards here (hence the inverted "cascade pressure").
- The Bayesian papers learned their tables from data; ours are hand-written, so "calibrated" is false.
- Health change and forecasts have no basis.

**Real predictions, on observed rates:**
- **v1.1:** automation failure rates (n8n history); vendor incident frequency (OpenAI/Anthropic status feeds, polled daily); org turnover rate applied equally to everyone; inferred bus factor (truck-factor algorithm; AI-authorship caveat).
- **v2:** Monte Carlo disruption ranges after 2–3 months of history.
- **Never:** "will this person leave" (EU AI Act high-risk; US positioning; no data).

**Trust:** a prediction record from v1.1, checked against outcomes. Probabilities shown only once accuracy is measured.

**Cost:** v1 +~1.5 engineer-weeks; v1.1 +~4–5; v2 +~3–4.5.

**Decisions:** accept staging; retire eIRWR and the hand-written Bayesian network; never per-person attrition; choose the lead market (recommendation: mid-market first, regulatory second).

---

## Turn 16 — Export

**User:**
> Can you give me a markdown file for this entire conversation, plus all the artificats produced during this chat.

**Claude:** produced this transcript and a zip bundle containing it plus artifacts #1–#4.

---

## Open decisions (as of end of session)

1. Is the old codebase reference-only? (Recommended: yes.)
2. ICP confirmation and the n8n-first bet, to be tested by 3–5 manual design-partner scans.
3. Entra or Google first.
4. Accept "discover + confirm" with confirmation campaigns as a core feature.
5. v1 / v1.1 / v2 staging, including simulations (v1), base-rate signals (v1.1), probabilistic ranges (v2).
6. Retire eIRWR and the hand-written Bayesian network; never build individual attrition prediction.
7. Lead market: mid-market AI-automation companies first, regulated finance second.
8. Next step: requirements engineering (R-CON, R-DATA, R-ID, R-CHK, R-SIM, R-CHG, R-ATT, R-UI, R-SEC, R-NFR).
