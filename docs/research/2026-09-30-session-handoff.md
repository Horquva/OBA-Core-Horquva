# Horquva — Session Handoff (2026-09-29 → 2026-09-30)

**Purpose:** everything needed to continue this work in a new conversation.
**Start a new session by saying:** *"Read `docs/research/2026-09-30-session-handoff.md` and the scope doc it points to, then continue from 'Next steps'."*

---

## 1. Where we are, in one paragraph

We concluded that the existing OBA Core product (17 pages, 55 "brain" modules, abstract scores, fictional 40-person demo org, no real data connections) has no clear scope and can't be pitched. **Affan decided to rebuild from scratch.** Through research (API docs, n8n source code, market, regulation, academic papers) we redefined the product as **organisational continuity intelligence: "When someone leaves, nothing breaks."** The scope is written and corrected against verified facts, but **not yet signed off**. **No code has been written** and **no requirements document** exists; Affan explicitly paused requirements until the product idea is final. There are **no buyers or design partners yet**.

---

## 2. Documents produced (all in the repo, none committed)

| Document | Path | Status |
|---|---|---|
| **Product scope (current reference)** | `docs/research/2026-09-30-product-scope.md` | Revision 3 + n8n corrections. **Read this first.** |
| Feasibility study (APIs, endpoints, what data is collectable) | `docs/research/2026-09-29-horquva-feasibility-study.md` | Reference |
| Engineering foundation (market research, architecture decisions, target architecture, draft data model) | `docs/research/2026-09-29-horquva-product-engineering-foundation.md` | Reference; its scope section is superseded by the scope doc |
| Simulations & predictions study | `docs/research/2026-09-30-simulation-prediction-feasibility.md` | Reference |
| Session transcript (turns 1–16 only) | `docs/research/2026-09-30-strategy-session-transcript.md` | History |
| First scope draft | `docs/superpowers/specs/2026-09-29-mvp-scope.md` | **Superseded**, kept for history |
| This handoff | `docs/research/2026-09-30-session-handoff.md` | — |

Input reviewed: the founder's *Horquva_MVP_Feature_Additions.docx* (three features: criticality + replaceability, concentration, change → impact; the 12-step "Horquva equation"). Its chain is still the conceptual backbone.

---

## 3. The product (current proposal)

**Organisational continuity intelligence. When someone leaves, nothing breaks.**
Horquva knows who holds what across a company (automations, AI agents, apps, groups, systems, processes), what depends on each, and what happens when people change. **AI automations are the entry point**, not the ceiling.

- **Buyer:** whoever owns offboarding and the automation rollout (Head of Ops, IT lead, AI lead). One buyer, one moment.
- **First customers:** 100–2,000 people, Microsoft 365 or Google, adopting AI automation, n8n first.
- **Model:** discover (connectors) + confirm (owners fill what no API knows).
- **Core loop:** discover → confirm → watch → hand over → verify.
- **Recommended (not yet confirmed):** n8n is the richest source, **not a requirement**. Directory-based features work for any Microsoft or Google company.

### Releases
- **v0, Free n8n Ownership Check (~1–2 weeks):** paste the n8n *owner's* key and get single-owner automations, personal-credential automations, and failing or abandoned workflows. The key is never stored. The key is full-power on most plans, so disclose that Horquva only reads.
- **v1 (~4.5–5 months, 2 engineers, ≈38.5–41 engineer-weeks):**
  - **Discover:** n8n; Entra *or* Google; OpenAI and Anthropic admin; CSV.
  - **Confirm:** confirmation campaigns.
  - **Identity review queue.**
  - **Watch:** change feed, weekly email.
  - **Hand over:** pre-departure handover pack (triggered by a departure entered by HR or a manager, or by an Entra leave date where HR provisioning exists), successors, tracking, post-departure verification, credential and ownership risk.
  - **Understand:** what-if (person, automation, vendor or model, combined), succession test, criticality and replaceability (High/Med/Low + reason), team view (never scores individuals), headline coverage count, ranked actions.
  - **Explain:** Ask Horquva chat assistant and PDF handover packs and reports, both **moved into v1 at Affan's request**.
  - **Screens:** Overview, Departures, People & teams, Assets, Map, What-If, Actions.
- **v1.1 (~5–6 weeks):**
  - second directory, Make, PagerDuty;
  - manager-leaves reviewer reassignment;
  - observed-rate signals (failure rates, vendor incidents from status pages, org turnover applied equally to everyone, inferred bus factor, time-to-recover);
  - prediction record;
  - **one of** AI cost per automation *or* compliance export (ISO 42001 / Vanta), chosen by design partners.
- **v2:** likelihood ranges (Monte Carlo, shown only once calibration is measured), one-click reassignment (opt-in write access), AI-drafted handover docs, trends.
- **Later stages:**
  - GitHub, Backstage, ServiceNow;
  - Jira, Confluence;
  - Zapier, Agentforce, Copilot Studio;
  - Workday / BambooHR via Merge;
  - reorganisation planning, real-time sync, multi-org, SOC 2;
  - cross-customer benchmarks (distant; needs a legal basis);
  - later markets: universities, hospitals, regulated finance.

### Services
- Free n8n Ownership Check (v0).
- Continuity Scan (guided; done by hand before v1).
- Continuity Platform subscription (v1).
- Onboarding and confirmation support (v1).
- PDF handover packs (v1).

**Pricing is not defined.**

### Never
- Score, rank or predict individuals.
- Read messages.
- Show made-up scores.
- Claim "real-time", "calibrated" or "proven" before it's true.
- Write to customer systems without opt-in.

---

## 4. Decisions made in this session

1. **Rebuild from scratch.** The old codebase is reference only (lessons carry over, code doesn't). *Stated by Affan; formal sign-off still listed as open.*
2. **Deterministic core; AI only as an interface** (the chat assistant explains, never computes).
3. **Discover + confirm** is the realistic model: no API gives backup, criticality or fallback.
4. **Position on continuity, not AI-agent inventory.** Zenity, ServiceNow AI Control Tower and Microsoft Agent 365 already do inventory.
5. **Simulations stay** (deterministic). **eIRWR and the hand-written Bayesian network are retired**: eIRWR is a real root-cause paper misapplied forwards, and the Bayesian tables were authored, not learned. **Never predict individual attrition** (EU AI Act Annex III high-risk).
6. **Don't build everything at once:** design the architecture for the full scope, build in slices.
7. **Chat assistant and PDF packs moved into v1.**
8. **Keep scope to one buyer and one moment.** Security and finance are proof points, not separate products.
9. **Organisational framing restored:** apps, groups and team views added to v1 so the product isn't AI-only.
10. **Hospitals and universities are later markets**, not v1.

---

## 5. Open decisions (the product idea is NOT final)

1. Sign off the promise, buyer and core loop.
2. n8n as the richest source vs a requirement (recommendation: richest source).
3. Entra or Google first (recommendation if unknown: Entra, which has richer data).
4. Formally confirm "discover + confirm" as the model.
5. Formally retire the old engines; old codebase reference only.
6. Lead market: mid-market AI-automation companies first (recommended) vs regulated finance.
7. Pricing, and how much of the scan and onboarding is delivered by hand.

Affan wanted to refine the idea further. Last attempt: a structured question round (core job, asset types, main user, manual effort), **which he rejected** as a format. Next time, discuss in plain chat, not multiple-choice tools.

---

## 6. Verified facts (with source quality)

**Verified in n8n source code** (`packages/cli/src/public-api/v1/controllers/`, master):
- `GET /workflows` returns only what the key's user can read → needs the **owner's key** (or an admin's, a paid role).
- The list gives `shared[].projectId` + role. The single-workflow GET adds project name, type and `creatorId`.
- `GET /projects` and `/projects/{id}/users` need the licence feature `feat:projectRole:admin` (paid).
- **`GET /users?projectId=`** is owner-only with **no licence gate**. This is how workflow ownership gets resolved to a person.
- `GET /credentials` (owner/admin) returns `shared[]` with the owning project → "runs on Omar's credentials" **is derivable**.
- Nodes list credentials used (id, name; never secrets).
- Workflow history has an `authors` field. It's pruned after **24 h** by default (unlicensed); Starter 1 day, Pro 5, Enterprise 365+.
- The n8n users API has **no leaver/disabled field**.
- **API keys can only be scoped (read-only) on Business and Enterprise.** Otherwise the key is full-power, so "read-only" has to be enforced by Horquva and disclosed.
- API churn: one workflow endpoint was deprecated on 2026-08-26.
- Execution retention: Starter 7 days, Pro 30, self-hosted default 14 days.

**Verified in official docs:**
- Entra: user fields; `employeeLeaveDateTime` (needs `User-LifeCycleInfo.Read.All`, and is **only filled if HR-driven provisioning is set up**); app, service-principal and group owners endpoints. **Apps are ownerless by default** when admin- or gallery-created. **No group owners** for distribution, Exchange-created or on-premises-synced groups.
- Google Directory: users, `relations` (manager), group owners and managers. **No leave-date field. No app ownership.**
- Microsoft Agent 365 package API needs an Agent 365 licence and returns no owner.
- Anthropic usage report API.
- OpenAI and Claude status-page JSON feeds (fetched live).
- FCA PS21/3, DORA Art. 11 and 28, EU AI Act Annex III (high-risk dates moved to 2 Dec 2027; confirm with a lawyer).
- eIRWR paper (arXiv 2608.08073, root-cause analysis); Aquaro 2009 and Kumar 2025 Bayesian papers (tables learned from data); truck-factor paper (Avelino 2016); Wheeler 2026 (AI authorship breaks authorship metrics).

**Third-party / lower confidence:**
- Merge ~$650/mo.
- OpsLevel ~$29k, Cortex ~$75k.
- Productiv shutdown (Aug 2026).
- Zenity named "Gartner Company to Beat".
- n8n reported 1.7M monthly builders, 1,400+ enterprise customers, SAP at a $5.2B valuation.
- Orphaned-credential stats (vendor blogs).
- Zapier's App Directory requirement (applies to embed; Workflow API access may differ; re-check).

**Unverified (judgement):**
- All effort estimates.
- "~60% discovered."
- Buyer demand.
- Absence of direct competitors.
- Whether owners will complete confirmations.

---

## 7. Known facts about the OLD product (for reference only)

- **Has:** map/network, what-if simulations, succession planner (closest to the new idea), ownership, recommendations, chat agent page (Gemini, data tier unconfirmed), backend change tracking, and a dependency-scan endpoint that **no page used**.
- **Removed in the new scope:** Org Science (23 cards), Forecast, Decision Intelligence, health/pillar scores, per-person risk scores, the Bayesian and eIRWR engines, the 55 brain modules, frozen feeds, the fictional demo org.
- **Last branch state:** `fix/intelligence-trust` @ `2f586df` (risk engine "not recorded" fix; 32 checks). `b876f6a` (ranking perf) was merged into local `ocos/develop` with the push still pending. These fixes are in the old codebase and aren't carried into the rebuild.

---

## 8. Next steps (agreed order)

1. **Finalise the product idea:** go through the open decisions in §5 with Affan, in plain conversation.
2. **Once final:** update the scope doc to "Approved" and write a decision log.
3. **Week-0 documents:** API test plan, v0 spec, discovery-call script, data-handling one-pager. Start the NDA/DPA with a lawyer.
4. **Weeks 1–2:**
   - hands-on API test (n8n Cloud and self-hosted, Entra test tenant or Google trial, OpenAI/Anthropic admin keys) to answer: where AI model names sit in n8n nodes, behaviour of older n8n versions, share of apps and groups with owners, self-hosted reachability, real connector effort;
   - build v0;
   - 10–15 discovery calls;
   - competitor lookalike search.
5. **Weeks 3–4:** 2–3 manual Continuity Scans with design partners → go / adjust / stop.
6. **Week 5+:** requirements document (areas: R-CON, R-DATA, R-ID, R-CHK, R-SIM, R-CHG, R-ATT, R-HND, R-UI, R-SEC, R-NFR), user flows, data model, API contract, connector specs, rule catalogue, hand-checkable test org → re-estimate → v1 build.

**Not now:** requirements (paused by Affan), code beyond v0, touching the old codebase, hospitals, universities or finance.

---

## 9. Working preferences observed (Affan)

- Wants plain, easy language when asked; direct answers; honesty about what's unverified.
- Wants claims researched and verified before they're relied on ("be sure what you're saying can actually be done").
- Doesn't want to develop on hunches, but also doesn't want requirements written before the idea is final.
- Prefers discussion in chat over structured multiple-choice question tools.
- Documents go in `docs/research/`; nothing committed yet (ask before committing).
