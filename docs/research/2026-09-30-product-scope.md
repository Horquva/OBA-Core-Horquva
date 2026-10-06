# Horquva — MVP Scope

**Date:** 2026-09-30 (revision 2) · **Status:** proposed, awaiting owner sign-off
**Supersedes:** `docs/superpowers/specs/2026-09-29-mvp-scope.md`, revision 1 of this file, and the scope sections of the engineering foundation doc
**Built on:** the feasibility study, the engineering foundation, the simulation study, and the demand research. Endpoint claims were verified against official docs, with the limits stated below.

---

## 1. The product

**Organisational continuity intelligence. When someone leaves, nothing breaks.**

Horquva knows who holds what across your organisation: automations, apps and groups discovered automatically, and everything else confirmed by owners. It knows what depends on each of them. Before anyone leaves, it shows what they hold, what will break when their account is disabled, and who should take over. Afterwards, it checks that everything still runs.

**Entry point:** AI automations, where the risk is growing fastest and is easiest to discover. They're the first asset type, not the whole product.

| | |
|---|---|
| **Buyer** | Whoever owns offboarding and the automation rollout: Head of Operations, IT lead, or AI/automation lead |
| **First customers** | 100–2,000 people · Microsoft 365 or Google Workspace · automations in **n8n** · OpenAI and/or Anthropic |
| **Product model** | Discover (connectors) + confirm (owners fill in what no API knows) |
| **Proof points, not separate products** | Security: no automation runs on a departed person's credentials. Leadership: AI rollout has real risk controls. |
| **Team** | Two engineers, built from scratch. The old codebase is reference only. |

## 2. Core loop

Every feature serves one of these steps.

```
DISCOVER  → automations, apps, groups; who owns them; what they depend on; whose credentials they use
CONFIRM   → owners confirm backup, criticality, documentation, fallback; fill gaps (ownerless apps, CSV assets)
WATCH     → upcoming leave dates, leavers, edited workflows, swapped models, failures
HAND OVER → before someone leaves: everything they hold, what will break, who takes over
VERIFY    → after the account is disabled: do their automations still run?
```

---

## 3. v0 — Free n8n ownership check (first; about 1–2 weeks)

- **What:** someone pastes an n8n API key (it must be the **instance owner's** key, or an admin's on paid plans; see §4.6) and gets an instant report:
  - automations with a single owner;
  - automations running on personal credentials;
  - failing and abandoned workflows.

  The key is never stored.
- **Why:** the cheapest real test of demand, and a lead generator into n8n's reported 1.7M monthly builders.
- **Becomes:** the first slice of the v1 n8n connector.

---

## 4. v1 — about 4.5–5 months for two engineers

### 4.1 Data sources and what each can actually give us

| Source | What we get | Known limits |
|---|---|---|
| **n8n** | Automations (nodes, node types, connections, description); which credentials each node uses; **who owns each workflow and credential** (resolved via `GET /users?projectId=`, owner-only, no paid licence needed); failures and runs; edit history with `authors` | Needs the **owner's key** (admin key on paid plans), because the API only returns what the key's user can see. **Keys can't be limited to read-only except on Business/Enterprise** (scoped keys). Team-project assets have several members, so ownership needs confirmation. **Edit history is kept only 24 hours on unlicensed/Community and 1 day on Starter** (5 days Pro, 365+ Enterprise), so Horquva polls daily to capture authors. Execution history: 7 days Starter, 30 days Pro, 14 days self-hosted default. Project endpoints need a paid licence feature (`feat:projectRole:admin`); the unlicensed `/users?projectId=` route replaces them. Self-hosted must be reachable. The API changes between versions. |
| **Microsoft Entra ID** *(if the customer is on Microsoft)* | People, department, title, manager, leavers; **future leave dates only if the customer has set up HR-driven provisioning** (e.g. Workday or SuccessFactors → Entra); otherwise the field is empty; **registered and enterprise apps with owners** (`/applications/{id}/owners`, `/servicePrincipals/{id}/owners`, `Application.Read.All`); **group owners** (`/groups/{id}/owners`, `GroupMember.Read.All`) | Apps created by admins or from the gallery are **ownerless by default**, so many apps have no owner (shown as a finding and sent to confirmation). **No owners for distribution groups, Exchange-created groups, or groups synced from on-premises.** Department is free text, often inconsistent. |
| **Google Workspace** *(if the customer is on Google)* | People, department, title, manager, suspended/archived (**no future leave date field**); **group owners and managers** (`groups/{key}/members?roles=OWNER,MANAGER`) | **No app-ownership equivalent.** Apps come only via CSV. |
| **OpenAI / Anthropic admin APIs** | Models and usage per project, workspace or key | Maps to automations only when keys or projects are named or mapped per automation |
| **CSV + confirmation** | Systems, vendors, key business processes, anything else | Only as complete as the customer makes it |

v1 builds **one** directory (whichever the first design partner uses). The other comes in v1.1.

### 4.2 Facts per asset
Criticality · owner · backup · documented · fallback exists · depends on · runs on whose credentials.
Each is marked *stated* (from an API), *inferred*, *confirmed* (by an owner) or *unknown*. **Unknown is never read as "no".**

### 4.3 Features

**Discover and confirm**
1. **Asset inventory and map:** people, automations, apps, groups, tools, vendors and models, and how they connect.
2. **Confirmation campaigns:** owners confirm backup, criticality, documentation and fallback, and claim ownerless apps. Email reminders, audit trail.
3. **Identity review queue:** accounts that don't match anyone in the directory. Never treated as "no owner".

**Hand over (the centre of the product)**

4. **Pre-departure handover:** triggered by (a) a future leave date from Entra, where the customer's HR provisioning fills it in, or (b) **a departure entered in Horquva by HR or a manager** (the default for most customers, and the only option on Google). It:
   - builds a handover pack of everything the person holds (automations, apps, groups, CSV assets), what runs on their credentials, what's undocumented, what's critical;
   - asks the manager to name successors;
   - sends confirmation requests to the successors;
   - tracks handover status.
5. **Credential and ownership risk:** automations on a person's own credentials, credentials with no owner, ownerless apps, assets whose owner has left.
6. **Post-departure verification:** after the account is disabled, checks that the person's automations still run and flags failures.

**Understand and decide**

7. **What-if simulations:** a person leaves, an automation fails, a vendor or model goes down, combined scenarios, and a succession test. Impact is shown as orphaned critical assets, stopped automations, and runs per week affected.
8. **Criticality and replaceability:** High / Medium / Low, each with its reason.
9. **Team view:** holdings and coverage grouped by department or manager hierarchy, with a mapping step for messy department names and a minimum group size. Includes concentration, e.g. "In Finance, 2 people hold 70% of critical assets".
10. **Ranked actions:** one per problem, critical first.
11. **Weekly briefing email:** upcoming departures and what they hold, open handovers, new risks.

**Explain and share**

12. **Ask Horquva (chat assistant):** plain-English questions ("what breaks if the ML team leaves?"). It answers by calling the same API the screens use, links to the evidence, and never computes findings itself. One model provider, whose terms forbid training on customer data. It's listed as a sub-processor in the data processing agreement. Only metadata is sent: never secrets, never message content.
13. **PDF handover packs and scan reports:** board- or HR-ready documents generated from the same data. One per departure, one per scan.

### 4.4 Screens (7) + assistant
1. **Overview:** headline count, upcoming departures, top risks, top actions.
2. **Departures:** upcoming and recent leavers, handover status, verification.
3. **People and teams:** who holds what; team coverage and concentration. Individuals are never scored.
4. **Assets:** automations, apps, groups and CSV assets, with evidence per fact.
5. **Map.**
6. **What-If.**
7. **Actions.**

Plus the **Ask Horquva** assistant (available from every screen), PDF export on Departures and Overview, the confirmation form, settings and connections, and the identity queue.

### 4.5 Platform
- Sign-in with Microsoft or Google.
- Admin, viewer and reviewer roles.
- Audit log; encrypted secrets.
- Read-only, metadata-only access to customer systems, **with one exception**: n8n keys can only be limited to read-only on Business/Enterprise plans. On other plans Horquva holds a full-power owner key and must *behave* read-only (never calls write endpoints, enforced in code and audited). This must be disclosed to customers.

### 4.6 Verified against n8n source code (2026-09-30)
Checked in n8n's public-API controllers (`packages/cli/src/public-api/v1/controllers/`, master branch):
- `GET /workflows` uses `findWorkflowsForUser(req.user, ['workflow:read'])`, so it **returns only what the key's user can read**. It needs the owner's key (or an admin's, a paid role).
- The list response's `shared[]` holds `projectId` and `role` only. The single `GET /workflows/{id}` adds the project's name, type and `creatorId`.
- `GET /projects` and `GET /projects/{id}/users` are `@Licensed('feat:projectRole:admin')`, a paid feature.
- `GET /users?projectId=` is owner-only with **no licence decorator**. It returns id, email, first and last name, isPending and mfaEnabled. **There is no disabled/leaver field**, so leavers must come from the directory.
- `GET /credentials` (owner/admin) returns `shared[]` with project id, name and role (`credential:owner`). So "automations running on person X's credentials" **is derivable**.
- Workflow history versions include `authors`. The default prune limit without a licence is 24 hours (`DEFAULT_WORKFLOW_HISTORY_PRUNE_LIMIT = 24`).
- API churn is real: the `/workflows/{id}/{versionId}` path was deprecated on 2026-08-26.
- Not yet verified: where AI model names sit inside each node's parameters; older n8n versions' API surface. **Both need the hands-on test.**

---

## 5. v1.1 — about 5–6 weeks after v1

- **Second directory, Make and PagerDuty** connectors.
- **Manager leaves:** reassigns their pending confirmation reviews and regroups team views.
- **Observed-rate signals:** automation failure rates; AI vendor incident history (status feeds); organisation turnover rate applied equally to everyone; inferred bus factor; a "time to recover" question.
- **Prediction record:** log every probabilistic statement and check it against outcomes.
- **One** of the following, whichever design partners ask for: **AI cost per automation** *or* **compliance evidence export** (ISO 42001 AI inventory; push to Vanta).

## 6. v2
- Probability-of-disruption ranges (Monte Carlo), shown only once accuracy is measured.
- One-click reassignment via n8n transfer endpoints (opt-in write access).
- AI-drafted handover documentation, human-approved.
- Change trends.
- The v1.1 option not chosen.

## 7. Later stages (organisational intelligence roadmap, on demand)
- **Code and systems:** GitHub, Backstage, ServiceNow CMDB.
- **Work and knowledge:** Jira, Confluence (who actually does the work, what's documented; inferred, then confirmed).
- **More automation and agent platforms:** Zapier, Agentforce, Copilot Studio.
- **HR systems:** Workday, BambooHR via Merge.
- **Organisation design:** reorganisation planning.
- **Distant, needs a legal and architecture basis:** anonymised benchmarks across customers.

## 8. Out of scope
- Any 0–100 score, health index, pillar, culture, DNA, maturity or benchmark.
- Scoring or ranking individuals; predicting who will leave.
- Forecasts.
- Reading message content.
- "Real-time" claims.
- "Which customers are affected".
- AI acting on its own or writing to customer systems (until the v2 opt-in).
- Custom-code agents with no platform behind them (CSV only).
- Distribution lists and on-premises-synced groups.
- Google app ownership (no API for it).
- Separate security, finance or compliance products.
- The old engines (eIRWR, the hand-written Bayesian score, the 55 brain modules).
- The claims "peer-reviewed", "calibrated" and "mathematical proof".

---

## 9. Services and complete feature catalogue

### 9.1 Services (what a customer buys)

| Service | What the customer gets | Release |
|---|---|---|
| **Free n8n Ownership Check** | Self-serve. Paste the n8n owner's API key (full-power on most plans, so trust and disclosure matter) and get an instant report: single-owner automations, automations on personal credentials, failing and abandoned workflows. The key is never stored. | v0 |
| **Continuity Scan** (entry offer) | A guided first scan. We connect their directory, n8n and AI vendor accounts, run a confirmation round with owners, and deliver the findings: who holds what, single points of failure, credential risks, what-if results, and a fix list. | v1 (delivered partly by hand with scripts before v1) |
| **Continuity Platform** (subscription) | Ongoing: live inventory, confirmation campaigns, departure handovers, change watching, simulations, weekly briefing | v1 |
| **Onboarding and confirmation support** | Connection setup, department cleanup for team views, running the first confirmation campaign with their owners | v1 |
| **Handover packs as documents** | Board- or HR-ready PDF per departure and scan | v1 |

*Pricing: not yet defined. How much of the scan and onboarding is delivered by hand at first: owner to decide.*

### 9.2 Features by stage

**Discover (v1)**
1. **Automatic asset inventory:** n8n automations (creator or project, apps, vendors and models called, credentials used, failures, edit history); Entra apps with owners, where set; Entra or Google group owners; AI model usage by project or key.
2. **CSV import** for systems, vendors, key processes, and anything outside the connected tools.
3. **Dependency map:** people ↔ automations, apps and groups ↔ tools, vendors and models; visual and clickable.
4. **Evidence on every fact:** stated, inferred, confirmed or unknown. Unknown is never shown as "no".
5. **Identity review queue:** accounts that don't match the directory get resolved by a person, never assumed.
6. **Run and failure history,** stored by Horquva because n8n deletes its own after 7–30 days.

**Confirm (v1)**

7. **Confirmation campaigns:** owners confirm backup, criticality, documentation and fallback, and claim ownerless apps. Email reminders, audit trail.
8. **Automatic re-confirmation** when an owner leaves or an asset changes.

**Watch (v1)**

9. **Change feed:** upcoming leave dates, leavers, new or removed assets, edited workflows, swapped models, failure spikes. Each shows what it affects.
10. **Weekly briefing email:** upcoming departures and what they hold, open handovers, new risks.

**Hand over (v1, the core)**

11. **Pre-departure handover pack,** triggered by a leave date (Entra with HR provisioning) or a departure entered by HR or a manager: everything the person holds, what runs on their credentials, what's undocumented, what's critical.
12. **Successor assignment:** the manager names successors; successors confirm they've taken over.
13. **Handover tracking** per departure and per asset.
14. **Post-departure verification:** after the account is disabled, checks that their automations still run and flags failures.
15. **Credential and ownership risk:** automations on personal credentials, ownerless credentials and apps, assets whose owner has left.

**Understand and decide (v1)**

16. **What-if simulations:** a person leaves, an automation fails, a vendor or model goes down, combined scenarios, and the worst single losses ranked. Impact is shown as orphaned critical assets, stopped automations, and runs per week affected.
17. **Succession test:** hand assets to a successor and see the resulting coverage and the successor's new load.
18. **Criticality and replaceability:** High / Medium / Low per asset, with the reason.
19. **Team view:** coverage and concentration by department or manager. Never scores individuals.
20. **Ranked actions:** one per problem, with what it fixes.
21. **Headline coverage count:** e.g. "38 of 52 critical assets fully covered".

**Explain and share (v1)**

22. **Ask Horquva:** plain-English questions answered by calling the same functions, with links to evidence. It never computes on its own.
23. **PDF handover packs and scan reports.**

**v1.1 additions**

24. **More connectors:** the second directory, Make, PagerDuty (the only automatic source of backups, via on-call escalation).
25. **Manager leaves:** reassigns their pending confirmation reviews and regroups team views.
26. **Observed-rate signals:** failure rate and trend per automation; AI vendor incident history; organisation turnover rate applied equally to everyone; inferred bus factor; "time to recover" answers from owners.
27. **Prediction record:** every probabilistic statement is logged and checked against what actually happened.
28. **One of:** AI cost per automation *or* compliance evidence export (ISO 42001 AI inventory, push to Vanta), whichever design partners ask for.

**v2 additions**

29. Probability-of-disruption ranges, shown only once accuracy is measured.
30. One-click reassignment of workflows and credentials (opt-in write access).
31. AI-drafted handover documentation, human-approved.
32. Change trends over time.
33. The v1.1 option not chosen.

**Platform (v1)**
- Sign-in with Microsoft or Google.
- Roles: admin, viewer, reviewer.
- Audit log of every action and sync.
- Encrypted secrets.
- Read-only, metadata-only access (for n8n below Business/Enterprise, enforced by Horquva itself, since the key can't be restricted); never reads messages.
- One deployment per customer.

### 9.3 Integrations at a glance

| v1 | v1.1 | Later |
|---|---|---|
| n8n · Entra ID *or* Google Workspace · OpenAI admin · Anthropic admin · CSV | The other directory · Make · PagerDuty · status feeds (OpenAI, Anthropic) · Vanta (if chosen) | GitHub · Backstage · ServiceNow · Jira · Confluence · Zapier · Agentforce · Copilot Studio · Workday / BambooHR (via Merge) |

---

## 10. Effort (two engineers, all estimates unverified)

| Release | Engineer-weeks | Calendar |
|---|---|---|
| v0 free check | 1.5–2 | ~1–2 weeks |
| v1 | ≈ 38.5–41 | **≈ 4.5–5 months** |
| v1.1 | ≈ 9.5–11 | ≈ 5–6 weeks |

v1 grew by about 1.5–2 engineer-weeks for apps, groups and the team view, and by about 2.5–3 engineer-weeks when the chat assistant (~1.5–2) and PDF packs (~1) moved in from v1.1. v1.1 shrank by the same amount. **Estimates should be recalibrated after the hands-on spike.**

## 11. Must be tested before committing
1. **Demand:** discovery calls, plus v0 usage.
2. **Hands-on spike, about 1 week:**
   - an n8n instance (Cloud and self-hosted), including whether credential ownership is visible;
   - an Entra test tenant: what share of apps and groups actually return owners;
   - a Google Workspace trial;
   - OpenAI and Anthropic admin keys.
3. **Direct competitors:** lookalike search, plus what offboarding tools (BetterCloud, Lumos) already do.

## 12. Decisions needed
1. The promise, buyer and core loop (§1–2).
2. v0 first.
3. Entra or Google first.
4. Discover + confirm as the product model.
5. Retire the old engines; never predict who will leave.
6. The old codebase is reference only.

Once these are signed off, the next step is **requirements engineering**: R-CON, R-DATA, R-ID, R-CHK, R-SIM, R-CHG, R-ATT, R-HND, R-UI, R-SEC, R-NFR.
