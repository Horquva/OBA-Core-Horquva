# Horquva — Feasibility Study: Can the Product Actually Be Built?

**Date:** 2026-09-29
**Scope:** every feature, data fact and integration claimed in the MVP discussion, checked against official API documentation.
**Assumption:** the product is rebuilt from scratch. Today's demo dataset is treated as unproven.

**Legend (Verified column):**
- ✅ = checked against the official docs or source spec during this study.
- 🟡 = from an earlier study (2026-09-24) or a third-party source, not re-checked today.
- ⚠️ = unconfirmed; needs a hands-on test.

---

## 0. Bottom line

1. **The product can be built, but not as "fully automatic".** Connectors can find, without anyone typing:
   - who exists, departments and managers;
   - which automations and AI agents exist;
   - which AI models and SaaS tools each one calls;
   - which runs are failing;
   - who left the company.

   They **cannot** reliably supply three of the six facts the product runs on: **backup owner, business criticality, and whether a fallback exists**. Those live in people's heads almost everywhere. The only real API sources are PagerDuty escalation levels (a backup, but only for on-call services) and ServiceNow CMDB fields (criticality, but only at companies with a maintained CMDB).

2. **So the realistic product is "discover + attest":**
   - connectors discover roughly 60% of the picture;
   - a short, guided attestation workflow gets the owners to confirm the rest. It works like an access review: *"You own these 7 automations. Who backs you up on each? How critical is each?"*

   The attestation step is not a workaround. It's a core feature, and the only honest way to get the missing facts.

3. **Most of the current demo dataset cannot be collected.** Of the ~15 core tables, only about a third map cleanly to any API (§3). Scores such as `risk`, `adoption_pct`, `collaboration_score`, `workload`, dependency `strength` and `tenure` → skill have no source anywhere. The demo reads as rich because it was authored.

4. **The market is more crowded than I said earlier.** I recommended leading with "a register of your AI agents and who owns them". That space is now contested:
   - **Zenity** (named "Company to Beat" in AI agent governance by Gartner, April 2026) already discovers agents with their owners across Microsoft 365 Copilot, Agentforce, Bedrock, Vertex and endpoints.
   - **ServiceNow AI Control Tower** and **Microsoft Agent 365** both do agent inventory.

   Horquva cannot win on *inventory*. It can win on **continuity**: what breaks when a *person* leaves, across people → agents → workflows → vendors, including succession testing. None of those three products is positioned there. I'm correcting my earlier advice on this point.

5. **Effort from scratch** (§7): about **33–42 engineer-weeks** for a sellable MVP with 4–5 connectors. With 3 engineers that's roughly **3–3.5 months**, not the 6–8 weeks I estimated when I assumed we'd reuse the current codebase.

---

## 1. Claims I made earlier that this study corrects

| Earlier claim | What the docs say | Status |
|---|---|---|
| "n8n is easy" | True for n8n Cloud and reachable self-hosted instances. **But self-hosted n8n often sits inside the customer's network**, so we'd need them to expose the API or run a small on-prem collector. API not available on the free trial. | Mostly holds, with a caveat |
| "Zapier/Make need the same treatment later" | **Make:** easy, a token-scoped REST API returns blueprints, used apps and creator. **Zapier:** `GET /v2/zaps` exists, but Zapier's embed programme requires **our app to be listed in the Zapier App Directory**, and the Zap object **has no owner field**. | Zapier is much harder than implied |
| "Copilot Studio later" | The Graph agent inventory (`/copilot/admin/catalog/packages`) **requires a Microsoft Agent 365 licence** plus the AI admin or Global admin role, and returns **no owner field**. The alternative is Dataverse `bots` per environment, which needs system-admin access in each environment. | Harder than implied |
| "Workday via a unified HR API" | Holds. Merge's Employee model has manager, team, employment status, start and termination dates. Cost is third-party reported at about **$650/month for up to 10 linked accounts**. A direct Workday build needs a customer-configured integration user and specialist knowledge. | Holds; cost is real |
| "GitHub is strong" | Holds: CODEOWNERS via the contents API, Copilot seats via `/orgs/{org}/copilot/billing/seats`. | Holds |
| "Lead the pitch with the AI-agent register" | Contested by Zenity, ServiceNow AI Control Tower and Microsoft Agent 365. | **Changed:** lead with continuity |
| "6–8 weeks to pitchable" | That assumed reusing the current code. From scratch it's about 3 months with 3 engineers. | **Changed** |

---

## 2. The six facts: where each can come from

The whole product stands on six facts per asset. This is the most important table in the study.

| Fact | Real API sources | Evidence grade | Realistic coverage | Verdict |
|---|---|---|---|---|
| **Asset exists** (agent, automation, tool, model) | n8n workflows ✅; Make scenarios ✅; Zapier zaps ✅ (listing hurdle); Agentforce `BotDefinition` / `GenAiPlannerDefinition` ✅; Copilot Studio via Agent 365 ✅ (licence); OpenAI / Anthropic usage by project or key ✅; GitHub Copilot seats ✅ | Stated | **High** for platforms we connect. Nothing for agents built in code (LangChain apps and the like) unless they appear in a CMDB or Backstage. | ✅ Feasible |
| **Owner** | n8n `shared[].role = workflow:owner` + project ✅; Make `createdByUser` ✅; Backstage `spec.owner` (required) ✅; ServiceNow `owned_by` 🟡; Jira project and component `lead` ✅; GitHub CODEOWNERS 🟡; PagerDuty escalation level 1 ✅. Zapier: none. Copilot Studio inventory: none. | Stated, but often **creator ≠ accountable owner** | **Medium.** "Who built it" is easy; "who is accountable now" often isn't recorded. | 🟡 Feasible, needs attestation |
| **Backup owner** | **PagerDuty escalation level 2+** ✅ (on-call services only). Jira component lead vs project lead is a weak proxy. Otherwise: second-most-active editor or contributor in git or n8n history (**inferred**). | Mostly **inferred** | **Low.** Almost no organisation records it. | ❌ Not automatable; **attestation required** |
| **Criticality** | ServiceNow `business_criticality` on service CIs 🟡 (only where maintained); PagerDuty service urgency (proxy). Backstage has **no standard field** ✅. Everything else: none. | Stated where present, else none | **Low.** | ❌ Mostly **attestation**, plus a structural hint (how much depends on it) |
| **Documented** | Confluence page search (CQL) 🟡; GitHub README / runbook files 🟡; n8n workflow `description` and node `notes` ✅; Backstage docs annotation 🟡 | **Inferred** (matching an asset name to a page is fuzzy) | **Medium-low.** "A page mentions it" ≠ "a usable runbook exists". | 🟡 Weak signal; confirm in attestation |
| **Depends on** | n8n node `type` + `credentials` (which vendor, model or app each workflow calls) ✅; Make `usedPackages` / blueprint ✅; Zapier `steps[].action` ✅; ServiceNow `cmdb_rel_ci` 🟡; Backstage `dependsOn` ✅; OpenAI / Anthropic usage by key or project ✅ | Stated | **High inside automation platforms.** Low for bespoke code without a catalog. | ✅ Feasible, and a strength |

**People and organisation** (the identity spine):

| Fact | Sources | Verdict |
|---|---|---|
| Person, email, department, title | Entra ID `department`, `jobTitle` (need `$select`) ✅; Google `organizations[].department / title` ✅; Merge `employments[]` ✅ | ✅ Easy |
| Manager | Entra `manager` relationship ✅; Google `relations[type=manager]` ✅; Merge `manager` ✅ | ✅ Easy |
| Leaver / leave date | Entra `accountEnabled` ✅; `employeeLeaveDateTime` ✅ (needs `User-LifeCycleInfo.Read.All`); Google `suspended` / `archived` ✅; Merge `termination_date` ✅ | ✅ Easy, and the key change trigger |
| Skills, workload, tenure-as-risk | None | ❌ Drop |

---

## 3. The current demo dataset, table by table

| Table / field | Collectible? | How / why not |
|---|---|---|
| `employees.name, department, manager, hire_date` | ✅ | Directory or HR system |
| `employees.role` | ✅ | `jobTitle` |
| `employees.risk, workload, skills, tenure` | ❌ | No source. Authored. |
| `agents.name, type, status` | ✅ | Automation and agent platforms |
| `agents.owner_id` | 🟡 | Creator yes, accountable owner needs attestation |
| `agents.risk` | ❌ as data | Becomes the attested criticality |
| `agents.usage_count, last_used` | 🟡 | n8n executions, Make `executions`, Zapier `last_successful_run_date` |
| `agents.adoption_pct` | ❌ | No meaningful source |
| `agents.cost` | 🟡 | OpenAI / Anthropic cost by key or project, only if keys map to agents |
| `owners.backup_owner` | ❌ | See §2. Attestation, or PagerDuty. |
| `workflows.*` | ✅ | Automation workflows *are* workflows. Human business processes are not in any API. |
| `workflow_steps.actor_*` | ✅ for automations | n8n nodes / Make modules. No `duration_minutes` for human steps. |
| `workflow_failures` | ✅ | n8n `GET /executions?status=error`, Make `errors` |
| `ai_platforms.*` | ✅ | Derived from node types, credentials and admin usage APIs |
| `ai_platforms.adoption_pct` | ❌ | Drop |
| `tool_spend` | 🟡 | Only for AI vendors with admin cost APIs. General SaaS spend needs finance data. |
| `tool_backups`, `tool_policies` | ❌ | Attestation |
| `knowledge_assets.is_documented` | 🟡 | Weak inference, then attestation |
| `dependencies.source/target` | ✅ | Automation graphs, CMDB, Backstage |
| `dependencies.strength` | ❌ | No source. Drop. |
| `collaboration_scores.*` | ❌ | Entirely authored. Drop. |
| `incidents` | ✅ | PagerDuty incidents, Jira Service Management |
| `systems` | 🟡 | ServiceNow CMDB or Backstage, where they exist |
| `external_entities` (vendors) | ✅ vendors / ❌ customers | Vendors come from integrations. Customer relationships: no source. |
| `decision_*`, `forecast_*`, `learning_*`, `continuity_*`, `governance_*`, snapshots | ❌ | Authored or frozen. Not part of the product. |

**Summary:** about 35% of what the demo shows is collectable directly, about 25% is collectable as a weak signal needing confirmation, and about 40% has **no source** and must be dropped or attested.

---

## 4. Source by source: exact endpoints, difficulty, value

Difficulty: 1 = trivial, 5 = very hard. Value is to *this* product.

### Identity spine (pick one per customer)

**Microsoft Entra ID (Graph v1.0)** — difficulty 2, value ★★★★★ ✅
- `GET /v1.0/users?$select=id,displayName,mail,department,jobTitle,accountEnabled,employeeHireDate,employeeLeaveDateTime`
- `GET /v1.0/users/{id}/manager`
- `GET /v1.0/users/delta`, for incremental change detection of leavers and moves
- Permissions: `User.Read.All` (application) with tenant admin consent; `User-LifeCycleInfo.Read.All` for leave dates.
- Hurdle: an admin consent screen, which triggers the customer's security review.

**Google Workspace Admin SDK (Directory API)** — difficulty 2, value ★★★★★ ✅
- `GET admin/directory/v1/users?customer=my_customer&projection=full` gives `organizations[].department/title`, `relations[type=manager]`, `suspended`, `archived`.
- `users.watch` for push notifications.
- Scope: `admin.directory.user.readonly`. Needs domain-wide delegation or an admin OAuth grant.

**HR systems (Workday, BambooHR, …) via Merge HRIS** — difficulty 2 via Merge (4–5 direct), value ★★★★
- Merge `GET /api/hris/v1/employees` gives `manager`, `team`, `employments[].job_title`, `employment_status`, `termination_date`, `modified_at`.
- Cost 🟡: about $650/month for up to 10 linked accounts (third-party reported).
- Direct Workday: SOAP with an Integration System User, or REST with a tenant-registered OAuth client. Configured by the customer's Workday admin. Not worth building directly for the MVP.

### Automation and agent platforms (where the AI assets live)

**n8n (public API v1)** — difficulty 2 (Cloud), 3–4 (self-hosted behind a firewall), value ★★★★★ ✅
- `GET /api/v1/workflows?projectId=&active=` (scope `workflow:list`) returns `nodes[]` (each with `type`, e.g. `n8n-nodes-base.jira`, and `credentials: { <credType>: { id, name } }`), `connections`, `description`, node `notes`, `tags`, `shared[]` (with `role: workflow:owner` and `project {id,name,type}`), `updatedAt`, `active`.
- `GET /api/v1/workflows/{id}/history` for versions, which gives change detection.
- `GET /api/v1/executions?status=error&workflowId=&startedAfter=` (scope `execution:list`) for failures and usage.
- `GET /api/v1/projects`, `GET /api/v1/projects/{id}/users` for members and roles.
- `GET /api/v1/credentials` for names and types only, never secrets (owner/admin only).
- `POST /api/v1/audit` for n8n's own security audit, including abandoned workflows and unused credentials. A bonus signal.
- Auth: `X-N8N-API-KEY`. Enterprise plans get scoped keys. Not available on the free trial.
- Hurdles: the workflow owner is a *project*, which maps to a person only for personal projects. The API surface differs between n8n versions ⚠️. Self-hosted network access.
- **Real work:** a catalog that maps several hundred node types to vendors and models (e.g. an OpenAI chat-model node → OpenAI). That's where the dependency value comes from.

**Make** — difficulty 2, value ★★★★ ✅
- `GET /api/v2/scenarios?teamId=` returns `usedPackages`, `createdByUser`, `updatedByUser`, `isActive`, `isinvalid`, `lastEdit`, plus `executions` and `errors` counts.
- `GET /api/v2/scenarios/{id}/blueprint` for the full module graph.
- Auth: `Authorization: Token …`, scope `scenarios:read`.

**Zapier** — difficulty 4, value ★★★ ✅
- `GET /v2/zaps` (scope `zap:account:all`, `include_shared=true`) returns `steps[]` (action, app), `is_enabled`, `last_successful_run_date`. **No owner.**
- Blocker: using this API as a third party requires **our own app listed in the Zapier App Directory**. That's a separate product build plus Zapier's review.

**Salesforce Agentforce** — difficulty 3, value ★★★ (Salesforce-heavy customers) ✅
- Tooling API `SELECT Id, DeveloperName, PlannerType FROM GenAiPlannerDefinition` for agents.
- `GenAiPluginDefinition` for topics, `GenAiFunctionDefinition` for actions.
- `SELECT Id, DeveloperName, MasterLabel, Type FROM BotDefinition`.
- Needs a Connected App and admin approval. Ownership comes from `CreatedById` / `LastModifiedById` (creator only).

**Microsoft Copilot Studio / Microsoft 365 agents** — difficulty 4, value ★★★ ✅
- `GET https://graph.microsoft.com/v1.0/copilot/admin/catalog/packages?$filter=supportedHosts/any(h:h eq 'Copilot')`, permission `CopilotPackages.Read.All`. **Requires a Microsoft Agent 365 licence** and the AI admin or Global admin role. Returns name, type, publisher and deployment, **no owner**.
- Alternative: Dataverse `bots` table per Power Platform environment (system-admin access in each).
- Churn risk: Microsoft moved agent-registry APIs to Agent 365 in May 2026. Expect the surface to keep moving.

### AI vendors (which models, how much, from where)

**OpenAI Admin API** — difficulty 1, value ★★★ ✅/🟡
- `GET /v1/organization/usage/completions?group_by=project_id,model,api_key_id`
- `GET /v1/organization/costs`
- `GET /v1/organization/projects`
- Needs an **Admin API key**.
- Limit: usage is per project or key, not per workflow. It maps to agents only if the customer uses one key or project per agent.

**Anthropic Admin API** — difficulty 1, value ★★★ ✅
- `GET /v1/organizations/usage_report/messages?group_by[]=model&group_by[]=workspace_id&group_by[]=api_key_id`
- Also users, workspaces and API keys endpoints.
- Admin key required. Same key-to-agent mapping limit.

### Ownership, backup and criticality signals

**PagerDuty** — difficulty 2, value ★★★★ (the only real "backup" source) ✅
- `GET /escalation_policies?include[]=targets&include[]=services`: rules per level with user or schedule targets. Level 1 is the owner; level 2+ is the **backup**.
- `GET /services` (urgency, team), `GET /incidents`.
- Auth: API token or OAuth `escalation_policies.read`.
- Limit: covers on-call *services*, not most business automations.

**ServiceNow CMDB** — difficulty 3–4, value ★★★★ where maintained 🟡
- Table API `GET /api/now/table/cmdb_ci_service` (owner, support group, business criticality).
- `GET /api/now/table/cmdb_rel_ci?sysparm_query=parent=…` (parent, child, type such as "Depends on").
- Limit: CMDB data quality varies enormously between customers. Only enterprise buyers have it.

**Backstage (software catalog)** — difficulty 2, value ★★★★ for engineering-led companies ✅
- `spec.owner` (required), `spec.dependsOn`, `spec.dependencyOf`, `spec.system`, `spec.lifecycle`.
- Catalog REST (`/api/catalog/entities`) ⚠️ path not confirmed on the descriptor page.
- No standard criticality field.

**Jira Cloud** — difficulty 2, value ★★★ ✅/🟡
- `GET /rest/api/3/project/search?expand=lead` for project leads.
- The project-components endpoint returns `lead`, `assigneeType`, `realAssignee`.
- `GET /rest/api/3/search/jql` for incidents and activity (the old search endpoint is being removed 🟡).
- Scope `read:jira-work`.
- Limits: department and title only via the org-admin Admin API; emails can be hidden 🟡.

**GitHub** — difficulty 2, value ★★★ ✅/🟡
- `GET /repos/{o}/{r}/contents/.github/CODEOWNERS` (no parsed-rules API 🟡).
- READMEs and runbooks as a documentation signal.
- `GET /orgs/{org}/copilot/billing/seats` (`read:org` or `manage_billing:copilot`) ✅.
- Contributor stats for inferred backups.

**Confluence** — difficulty 2, value ★★ 🟡
- CQL search (`/wiki/rest/api/search?cql=…`) for pages naming an asset.
- Fuzzy, so only ever an "inferred documented" signal.

**Slack** — difficulty 4, value ★ 🟡
- Identity via SCIM (Business+/Enterprise, admin token).
- Terms forbid LLM training on the data and bulk export. Non-Marketplace distributed apps are throttled on history.
- **Recommendation: out of the MVP.** Never read messages.

---

## 5. Feature by feature: can we actually deliver it?

| Feature | Buildable? | Depends on | Honest limits |
|---|---|---|---|
| **Map** (people, agents, workflows, vendors) | ✅ Yes | Directory + automation platforms + AI admin APIs | Only covers connected platforms. Agents built in code are invisible without a catalog or CMDB. |
| **Criticality** | 🟡 Partly | Attestation + structural hint (dependents, failures, usage) | No API tells you what the business considers critical, except a maintained CMDB. |
| **Replaceability** | 🟡 Partly | Documented (weak) + backup (attested) + fallback (attested) | Two of its three inputs need people. Ship it as "hard / easy to replace, and why", with unknowns shown. |
| **Concentration** | ✅ Yes, strongly | Owners + depends-on | "Ahmed built 8 of 11 active automations" and "9 workflows call one OpenAI key" are computable from APIs alone. **The strongest automated finding.** |
| **What-if (leaver / vendor outage)** | ✅ Yes | Graph + owners | Accuracy follows owner accuracy, so attestation matters. |
| **Succession test** | ✅ Yes | Graph + owners | Pure computation. |
| **Change → impact** | ✅ Yes | Periodic snapshots + diff (Graph delta, n8n history, Make `lastEdit`, HR termination dates) | Changes come from syncs (hourly or daily), not true real-time. Webhooks exist for some sources but not uniformly. |
| **Weekly briefing** | ✅ Yes | Change feed | Needs connectors. With CSV only it's mostly empty. |
| **Hidden dependencies** | ✅ Within automation platforms | Node and credential parsing | "Workflow X silently depends on Ahmed's personal OpenAI credential" is detectable and a strong finding. Cross-system tacit dependencies are not. |
| **Tacit ownership** (who really runs it) | 🟡 Inferred | Edit history, executions, git and Jira activity | Always labelled *inferred*. Needs confirmation. |
| **Failure signal** | ✅ Yes | n8n / Make execution errors, PagerDuty incidents | Good "is this fragile right now" evidence. |
| **Customer impact** | ❌ No | — | No API models "which customers a workflow serves". Say "departments and workflows affected". |
| **Actions** | ✅ Yes | Rules over the above | — |
| **Ask Horquva (agent)** | ✅ Yes | Tool-calling over the rules engine | Standard LLM tool use. The model explains, never computes. |
| **Attestation workflow** | ✅ Yes (must build) | Email or Slack/Teams nudge + a web form | New feature, and essential. |

---

## 6. Architecture (from scratch)

```
 CONNECTORS (read-only, metadata only; poll + diff, webhooks where offered)
 ┌─────────┬────────┬──────┬───────────┬──────────┬──────────┬───────────┬──────────┐
 │Entra/   │Merge   │ n8n  │ Make      │Agentforce│OpenAI /  │PagerDuty  │CSV upload│
 │Google   │(HRIS)  │      │ (Zapier   │/Copilot  │Anthropic │/Jira/GH/  │(fallback)│
 │         │        │      │  later)   │ (later)  │ admin    │ServiceNow │          │
 └────┬────┴───┬────┴──┬───┴─────┬─────┴────┬─────┴────┬─────┴─────┬─────┴────┬─────┘
      └────────┴───────┴─────────┴──────────┴──────────┴───────────┴──────────┘
                                   ▼
 1. RAW STORE       raw payload per sync, exactly as received (replay, audit)
                                   ▼
 2. NORMALISE       per-source mapper → canonical entities
                    (person, asset, vendor/model, dependency, incident)
                    + node-type → vendor/model catalog (n8n, Make, Zapier)
                                   ▼
 3. IDENTITY        match people across sources on work email
                    (directory = source of truth); unmatched → review queue
                                   ▼
 4. FACT STORE      one row per fact: entity · fact · value · grade
                    (stated | inferred | attested | not recorded) · source · observed_at
                                   ▼
 5. SNAPSHOT + DIFF each sync is compared with the last → CHANGE EVENTS
                    (leaver, owner changed, workflow edited, model swapped, new failures)
                                   ▼
 6. GRAPH + RULES   deterministic: criticality, replaceability, concentration,
                    what-if, succession, change impact, actions — each with its reason
                                   ▼
 7. API             /scan  /assets  /people  /graph  /whatif  /changes  /actions  /attest
                                   ▼
 ┌──────────────┬─────────────────────┬───────────────────┬──────────────────────────┐
 │ Web app      │ Attestation         │ Ask Horquva       │ Weekly briefing + Scan   │
 │ (8 screens)  │ (owners confirm)    │ (LLM calls /API)  │ report (PDF)             │
 └──────────────┴─────────────────────┴───────────────────┴──────────────────────────┘
```

**Key design decisions:**
- **Deterministic core.** The LLM appears only in the agent and in briefing prose.
- **Every fact carries a grade and a source.** "Not recorded" is a first-class value.
- **Polling + diff is the default change mechanism.** It works uniformly across sources. Webhooks are an optimisation.
- **Self-hosted sources** (n8n, Backstage, on-prem Jira) need either customer-exposed endpoints or a small collector the customer runs. Design the connector interface so either works.
- **One deployment per customer** (already decided). Simplifies isolation.

---

## 7. How big is this? (from scratch)

Rough engineer-weeks for one competent engineer familiar with the stack. Ranges reflect unknowns.

| Component | Effort (eng-weeks) | Difficulty |
|---|---|---|
| Core data model, fact store with grades, raw store | 3–4 | Medium |
| Connector framework (auth, scheduling, pagination, retries, rate limits, snapshot/diff) | 3–4 | Medium |
| Identity resolution + review queue | 2–3 | Medium-hard |
| Rules engine (6 features) + tests on a hand-checkable fixture | 3–4 | Medium |
| Change detection + weekly briefing | 2 | Medium |
| Attestation workflow (form, reminders, audit trail) | 2–3 | Medium |
| Web app, 8 screens | 5–7 | Medium |
| Ask Horquva agent | 2 | Medium |
| Scan report PDF | 1–2 | Easy |
| Auth, RBAC, audit log, deployment, security hardening | 3 | Medium |
| **Core subtotal** | **26–34** | |
| Connector: Entra ID **or** Google | 1–1.5 each | Easy |
| Connector: Merge HRIS | 1 | Easy (+ subscription) |
| Connector: n8n (incl. node-type catalog) | 2–3 | Medium |
| Connector: Make | 1.5 | Easy-medium |
| Connector: OpenAI + Anthropic admin | 1 | Easy |
| Connector: PagerDuty | 1 | Easy |
| Later: Jira, GitHub, Confluence | 1–2 each | Easy-medium |
| Later: ServiceNow CMDB | 2–4 | Medium-hard |
| Later: Agentforce | 2 | Medium |
| Later: Copilot Studio / Agent 365 | 2–3 | Hard (licensing, churn) |
| Later: Zapier (incl. App Directory listing) | 4–8 | Hard |

**MVP = core + Entra/Google + n8n + Make + OpenAI/Anthropic + PagerDuty ≈ 33–42 eng-weeks.**
With 3 engineers that's **about 3–3.5 months**. With 2, about 4.5–5 months.

**Ongoing cost:** every connector needs maintenance (API versions, token expiry, schema drift). Budget about 10–15% of one engineer per 5 connectors.

---

## 8. Risks, ranked

1. **Every customer's stack is different.** A company on Zapier + BambooHR + Copilot Studio gets little from an n8n-first MVP. Pick an ideal customer profile that matches the first connectors (e.g. Microsoft 365 or Google + n8n or Make + OpenAI/Anthropic), or the scan comes back thin.
2. **The facts that matter most aren't in any API** (backup, criticality, fallback). If owners don't complete the attestation, the product shows mostly "not recorded". Attestation UX, reminders and executive sponsorship are critical.
3. **Security review before any value.** Admin consent for Graph, Google domain-wide delegation, admin keys for AI vendors. Every one is a procurement event. Mitigations: read-only, metadata only, a one-page data policy, SOC 2 roadmap.
4. **Competition in agent inventory** (Zenity, ServiceNow AI Control Tower, Microsoft Agent 365). Differentiate on continuity, succession and the people → agent → workflow cascade. Don't compete on discovery or security posture.
5. **API churn**, especially Microsoft (agent registry moved in May 2026) and n8n version differences.
6. **Identity mismatches** (hidden emails, personal accounts used in n8n) create orphans and false "no owner" findings. Needs a review queue, and must never be read as "no".
7. **Legal and compliance.** Pulling HR data (leave dates, managers) makes Horquva a processor of employee data. The US compliance plan's "decision support at role level, never rank individuals" stance must hold in the product.

---

## 9. What we can honestly claim, and what we can't

**Can claim:**
- "Connects to your directory, automation platforms and AI vendors to map which AI agents and automations you run, who built them, and what they depend on."
- "Shows where too much depends on one person, model or vendor."
- "Tells you what breaks if someone leaves or a vendor goes down, and tests a successor."
- "Detects changes (leavers, edited workflows, swapped models) and explains their impact weekly."
- "Every finding shows its evidence and how we know it."

**Cannot claim (drop from all material):**
- "Fully automated" or "zero data entry". Backup and criticality need owner confirmation.
- "Real-time". It's sync-based: hourly or daily.
- "Discovers tacit knowledge / hidden ownership" as fact. Only as *inferred, to be confirmed*.
- "Which customers are affected".
- "Mathematically proven / peer-reviewed / calibrated".
- Any metric built on the dropped fields (adoption %, collaboration score, workload, dependency strength).

---

## 10. Recommendation

**Go, with a narrower promise and a tighter ICP.**

- **ICP for the first customers:** 100–2,000-person companies on Microsoft 365 or Google Workspace, using **n8n or Make** plus OpenAI and/or Anthropic, with a real AI-automation rollout and someone accountable for it.
- **MVP connectors:** Entra or Google, n8n, Make, OpenAI/Anthropic admin, PagerDuty (optional), CSV fallback.
- **MVP must include attestation.** It's how three of the six facts get filled.
- **Positioning:** continuity, not inventory. *"Your AI automations now run parts of the business. When the person who built them leaves, what breaks, and who takes over?"*
- **Before committing 3 months:** run 3–5 design-partner scans. Connect n8n/Make + directory by hand (scripts calling the endpoints above) and deliver the report manually. If the concentration and leaver findings land, build the product. If they don't, the 3 months are saved.

---

## Sources

- n8n public API spec (OpenAPI, source): https://github.com/n8n-io/n8n/tree/master/packages/cli/src/public-api/v1
- n8n API docs: https://docs.n8n.io/connect/n8n-api
- Microsoft Graph user resource: https://learn.microsoft.com/en-us/graph/api/resources/user?view=graph-rest-1.0
- Microsoft Agent 365 Graph API: https://learn.microsoft.com/en-us/microsoft-agent-365/admin/graph-api
- List Copilot packages: https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/api/admin-settings/package/copilotpackages-list
- Copilot Studio agent inventory: https://learn.microsoft.com/en-us/microsoft-copilot-studio/admin-agent-inventory
- Microsoft Entra Agent ID APIs: https://learn.microsoft.com/en-us/graph/api/resources/agentid-platform-overview?view=graph-rest-1.0
- Google Directory API users: https://developers.google.com/workspace/admin/directory/reference/rest/v1/users
- Merge HRIS Employees: https://docs.merge.dev/hris/employees/
- Merge pricing (third-party): https://getknit.dev/blog/understanding-merge-dev-pricing-finding-the-right-unified-api-for-your-integration-needs/
- Workday integration overview: https://www.merge.dev/blog/workday-api-integration
- Zapier Get Zaps v2: https://docs.zapier.com/api-reference/workflow/zaps/get-zaps-v2
- Zapier Powered by Zapier eligibility: https://docs.zapier.com/powered-by-zapier/introduction
- Make scenarios API: https://developers.make.com/api-documentation/api-reference/scenarios
- Salesforce Agentforce tooling objects: https://developer.salesforce.com/docs/ai/agentforce/references/agents-metadata-tooling/agents-tooling.html
- GenAiPlannerDefinition: https://developer.salesforce.com/docs/atlas.en-us.api_tooling.meta/api_tooling/tooling_api_objects_genaiplannerdefinition.htm
- OpenAI usage API: https://developers.openai.com/api/reference/resources/admin/subresources/organization/subresources/usage/methods/completions
- Anthropic usage report: https://platform.claude.com/docs/en/api/admin-api/usage-cost/get-messages-usage-report
- PagerDuty escalation policies: https://docs.pagerduty.com/developer/api/reference/rest/escalation-policies/list-escalation-policies
- Backstage descriptor format: https://backstage.io/docs/features/software-catalog/descriptor-format
- ServiceNow CMDB relationships (community): https://www.servicenow.com/community/developer-forum/how-can-i-find-the-relation-between-ci-and-cmdb-ci-service-table/m-p/1417746
- Jira project components: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-project-components/
- GitHub Copilot seat management: https://docs.github.com/en/rest/copilot/copilot-user-management
- Zenity (agent governance): https://zenity.io/company-overview/newsroom/company-news/zenity-and-servicenow-partner-to-operationalize-ai-agent-risk-reduction-in-secops
- ServiceNow AI Control Tower + Agent 365: https://newsroom.servicenow.com/press-releases/details/2026/ServiceNow-expands-AI-agent-governance-through-deeper-integration-with-Microsoft/default.aspx
